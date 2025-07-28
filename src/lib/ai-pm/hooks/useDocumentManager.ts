'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PlanningDocumentWithUsers,
  DocumentStatus,
  WorkflowStep,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  ApprovalHistoryEntry,
  AIpmErrorType
} from '@/types/ai-pm';
import { DocumentSyncService, AutoSaveManager } from '../document-sync';

interface UseDocumentManagerOptions {
  projectId: string;
  workflowStep: WorkflowStep;
  userId: string;
  autoSave?: boolean;
  syncEnabled?: boolean;
}

interface DocumentManagerState {
  document: PlanningDocumentWithUsers | null;
  isLoading: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
}

interface DocumentManagerActions {
  loadDocument: () => Promise<void>;
  createDocument: (title: string, content: string) => Promise<PlanningDocumentWithUsers>;
  updateDocument: (updates: UpdateDocumentRequest) => Promise<PlanningDocumentWithUsers>;
  generateDocument: () => Promise<PlanningDocumentWithUsers>;
  changeStatus: (status: DocumentStatus) => Promise<PlanningDocumentWithUsers>;
  deleteDocument: () => Promise<void>;
  saveChanges: (content: string, title?: string) => Promise<void>;
  markAsChanged: () => void;
  clearError: () => void;
  // Approval workflow actions
  requestApproval: () => Promise<PlanningDocumentWithUsers>;
  approveDocument: () => Promise<PlanningDocumentWithUsers>;
  rejectDocument: (reason?: string) => Promise<PlanningDocumentWithUsers>;
  getApprovalHistory: () => Promise<ApprovalHistoryEntry[]>;
}

export function useDocumentManager(options: UseDocumentManagerOptions): [DocumentManagerState, DocumentManagerActions] {
  const { projectId, workflowStep, userId, autoSave = true, syncEnabled = true } = options;

  const [state, setState] = useState<DocumentManagerState>({
    document: null,
    isLoading: true,
    isSaving: false,
    isGenerating: false,
    error: null,
    hasUnsavedChanges: false,
    lastSaved: null
  });

  const syncServiceRef = useRef<DocumentSyncService | null>(null);
  const autoSaveManagerRef = useRef<AutoSaveManager | null>(null);
  const pendingChangesRef = useRef<{ content?: string; title?: string } | null>(null);

  // Initialize auto-save manager
  useEffect(() => {
    if (autoSave) {
      autoSaveManagerRef.current = new AutoSaveManager();
      return () => {
        autoSaveManagerRef.current?.cleanup();
      };
    }
  }, [autoSave]);

  // Initialize sync service
  useEffect(() => {
    if (syncEnabled) {
      syncServiceRef.current = new DocumentSyncService({
        projectId,
        workflowStep,
        onDocumentUpdate: (document) => {
          setState(prev => ({
            ...prev,
            document,
            hasUnsavedChanges: false,
            lastSaved: new Date(document.updated_at)
          }));
        },
        onDocumentDelete: (documentId) => {
          setState(prev => {
            if (prev.document?.id === documentId) {
              return {
                ...prev,
                document: null,
                hasUnsavedChanges: false
              };
            }
            return prev;
          });
        },
        onError: (error) => {
          setState(prev => ({
            ...prev,
            error: error.message
          }));
        }
      });

      syncServiceRef.current.startSync();

      return () => {
        syncServiceRef.current?.stopSync();
      };
    }
  }, [projectId, workflowStep, syncEnabled]);

  // Load document
  const loadDocument = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `/api/ai-pm/documents?projectId=${projectId}&workflowStep=${workflowStep}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '문서 로드에 실패했습니다.');
      }

      const data = await response.json();
      const documents = data.documents || [];
      
      // Find the user's document or the official document
      const userDocument = documents.find((doc: PlanningDocumentWithUsers) => 
        doc.created_by === userId
      );
      const officialDocument = documents.find((doc: PlanningDocumentWithUsers) => 
        doc.status === 'official'
      );

      const document = userDocument || officialDocument || null;

      setState(prev => ({ 
        ...prev, 
        document, 
        isLoading: false,
        lastSaved: document ? new Date(document.updated_at) : null
      }));

    } catch (error: any) {
      console.error('Error loading document:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
    }
  }, [projectId, workflowStep, userId]);

  // Create document
  const createDocument = useCallback(async (title: string, content: string): Promise<PlanningDocumentWithUsers> => {
    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const response = await fetch('/api/ai-pm/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          workflow_step: workflowStep,
          title,
          content
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '문서 생성에 실패했습니다.');
      }

      const data = await response.json();
      const newDocument = data.document;

      setState(prev => ({ 
        ...prev, 
        document: newDocument,
        isSaving: false,
        hasUnsavedChanges: false,
        lastSaved: new Date(newDocument.updated_at)
      }));

      return newDocument;
    } catch (error: any) {
      setState(prev => ({ ...prev, isSaving: false, error: error.message }));
      throw error;
    }
  }, [projectId, workflowStep]);

  // Update document
  const updateDocument = useCallback(async (updates: UpdateDocumentRequest): Promise<PlanningDocumentWithUsers> => {
    if (!state.document) {
      throw new Error('업데이트할 문서가 없습니다.');
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const response = await fetch(`/api/ai-pm/documents/${state.document.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '문서 업데이트에 실패했습니다.');
      }

      const data = await response.json();
      const updatedDocument = data.document;

      setState(prev => ({ 
        ...prev, 
        document: updatedDocument,
        isSaving: false,
        hasUnsavedChanges: false,
        lastSaved: new Date(updatedDocument.updated_at)
      }));

      return updatedDocument;
    } catch (error: any) {
      setState(prev => ({ ...prev, isSaving: false, error: error.message }));
      throw error;
    }
  }, [state.document]);

  // Generate document from AI
  const generateDocument = useCallback(async (): Promise<PlanningDocumentWithUsers> => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      const response = await fetch(
        `/api/ai-pm/documents/generate?projectId=${projectId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflow_step: workflowStep
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'AI 문서 생성에 실패했습니다.');
      }

      const data = await response.json();
      const newDocument = data.document;

      setState(prev => ({ 
        ...prev, 
        document: newDocument,
        isGenerating: false,
        hasUnsavedChanges: false,
        lastSaved: new Date(newDocument.updated_at)
      }));

      return newDocument;
    } catch (error: any) {
      setState(prev => ({ ...prev, isGenerating: false, error: error.message }));
      throw error;
    }
  }, [projectId, workflowStep]);

  // Change document status
  const changeStatus = useCallback(async (status: DocumentStatus): Promise<PlanningDocumentWithUsers> => {
    return await updateDocument({ status });
  }, [updateDocument]);

  // Delete document
  const deleteDocument = useCallback(async (): Promise<void> => {
    if (!state.document) return;

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const response = await fetch(`/api/ai-pm/documents/${state.document.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '문서 삭제에 실패했습니다.');
      }

      setState(prev => ({ 
        ...prev, 
        document: null,
        isSaving: false,
        hasUnsavedChanges: false,
        lastSaved: null
      }));

    } catch (error: any) {
      setState(prev => ({ ...prev, isSaving: false, error: error.message }));
      throw error;
    }
  }, [state.document]);

  // Save changes (with auto-save support)
  const saveChanges = useCallback(async (content: string, title?: string): Promise<void> => {
    pendingChangesRef.current = { content, title };

    if (autoSave && autoSaveManagerRef.current && state.document) {
      // Schedule auto-save
      autoSaveManagerRef.current.scheduleAutoSave(state.document.id, async () => {
        const changes = pendingChangesRef.current;
        if (!changes) return;

        if (state.document) {
          await updateDocument(changes);
        } else if (changes.title) {
          await createDocument(changes.title, changes.content || '');
        }
        
        pendingChangesRef.current = null;
      });
    } else {
      // Save immediately
      if (state.document) {
        await updateDocument({ content, title });
      } else if (title) {
        await createDocument(title, content);
      }
      pendingChangesRef.current = null;
    }
  }, [autoSave, state.document, updateDocument, createDocument]);

  // Mark as changed (for UI feedback)
  const markAsChanged = useCallback(() => {
    setState(prev => ({ ...prev, hasUnsavedChanges: true }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Request approval
  const requestApproval = useCallback(async (): Promise<PlanningDocumentWithUsers> => {
    if (!state.document) {
      throw new Error('승인을 요청할 문서가 없습니다.');
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const response = await fetch(`/api/ai-pm/documents/${state.document.id}/request-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '승인 요청에 실패했습니다.');
      }

      const data = await response.json();
      const updatedDocument = data.document;

      setState(prev => ({ 
        ...prev, 
        document: updatedDocument,
        isSaving: false,
        lastSaved: new Date(updatedDocument.updated_at)
      }));

      return updatedDocument;
    } catch (error: any) {
      setState(prev => ({ ...prev, isSaving: false, error: error.message }));
      throw error;
    }
  }, [state.document]);

  // Approve document
  const approveDocument = useCallback(async (): Promise<PlanningDocumentWithUsers> => {
    if (!state.document) {
      throw new Error('승인할 문서가 없습니다.');
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const response = await fetch(`/api/ai-pm/documents/${state.document.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '문서 승인에 실패했습니다.');
      }

      const data = await response.json();
      const updatedDocument = data.document;

      setState(prev => ({ 
        ...prev, 
        document: updatedDocument,
        isSaving: false,
        lastSaved: new Date(updatedDocument.updated_at)
      }));

      return updatedDocument;
    } catch (error: any) {
      setState(prev => ({ ...prev, isSaving: false, error: error.message }));
      throw error;
    }
  }, [state.document]);

  // Reject document
  const rejectDocument = useCallback(async (reason?: string): Promise<PlanningDocumentWithUsers> => {
    if (!state.document) {
      throw new Error('반려할 문서가 없습니다.');
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const response = await fetch(`/api/ai-pm/documents/${state.document.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '문서 반려에 실패했습니다.');
      }

      const data = await response.json();
      const updatedDocument = data.document;

      setState(prev => ({ 
        ...prev, 
        document: updatedDocument,
        isSaving: false,
        lastSaved: new Date(updatedDocument.updated_at)
      }));

      return updatedDocument;
    } catch (error: any) {
      setState(prev => ({ ...prev, isSaving: false, error: error.message }));
      throw error;
    }
  }, [state.document]);

  // Get approval history
  const getApprovalHistory = useCallback(async (): Promise<ApprovalHistoryEntry[]> => {
    if (!state.document) {
      throw new Error('승인 히스토리를 조회할 문서가 없습니다.');
    }

    try {
      const response = await fetch(`/api/ai-pm/documents/${state.document.id}/approval-history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '승인 히스토리 조회에 실패했습니다.');
      }

      const data = await response.json();
      return data.history || [];
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  }, [state.document]);

  // Load document on mount
  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveManagerRef.current && state.document) {
        // Force save any pending changes before unmounting
        autoSaveManagerRef.current.forceSave(state.document.id);
      }
    };
  }, [state.document]);

  const actions: DocumentManagerActions = {
    loadDocument,
    createDocument,
    updateDocument,
    generateDocument,
    changeStatus,
    deleteDocument,
    saveChanges,
    markAsChanged,
    clearError,
    requestApproval,
    approveDocument,
    rejectDocument,
    getApprovalHistory
  };

  return [state, actions];
}

export default useDocumentManager;