import React from 'react';
import { createClient } from '@/lib/supabase/client';
import { PlanningDocumentWithUsers, WorkflowStep } from '@/types/ai-pm';

export interface DocumentSyncOptions {
  projectId: string;
  workflowStep?: WorkflowStep;
  onDocumentUpdate?: (document: PlanningDocumentWithUsers) => void;
  onDocumentDelete?: (documentId: string) => void;
  onError?: (error: Error) => void;
}

export class DocumentSyncService {
  private supabase = createClient();
  private subscriptions: Map<string, any> = new Map();
  private options: DocumentSyncOptions;

  constructor(options: DocumentSyncOptions) {
    this.options = options;
  }

  /**
   * Start listening for document changes
   */
  startSync(): void {
    const { projectId, workflowStep } = this.options;
    
    // Create subscription key
    const subscriptionKey = workflowStep 
      ? `${projectId}-${workflowStep}`
      : projectId;

    // Don't create duplicate subscriptions
    if (this.subscriptions.has(subscriptionKey)) {
      return;
    }

    // Build filter
    let filter = `project_id=eq.${projectId}`;
    if (workflowStep) {
      filter += `,workflow_step=eq.${workflowStep}`;
    }

    // Create subscription
    const subscription = this.supabase
      .channel(`documents-${subscriptionKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planning_documents',
          filter
        },
        (payload) => this.handleDocumentChange(payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Document sync started for ${subscriptionKey}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Document sync error for ${subscriptionKey}`);
          this.options.onError?.(new Error('실시간 동기화 연결에 실패했습니다.'));
        }
      });

    this.subscriptions.set(subscriptionKey, subscription);
  }

  /**
   * Stop listening for document changes
   */
  stopSync(): void {
    this.subscriptions.forEach((subscription, key) => {
      this.supabase.removeChannel(subscription);
      console.log(`Document sync stopped for ${key}`);
    });
    this.subscriptions.clear();
  }

  /**
   * Handle document change events
   */
  private async handleDocumentChange(payload: any): Promise<void> {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      switch (eventType) {
        case 'INSERT':
        case 'UPDATE':
          if (newRecord) {
            // Fetch complete document with user info
            const document = await this.fetchDocumentWithUsers(newRecord.id);
            if (document && this.options.onDocumentUpdate) {
              this.options.onDocumentUpdate(document);
            }
          }
          break;

        case 'DELETE':
          if (oldRecord && this.options.onDocumentDelete) {
            this.options.onDocumentDelete(oldRecord.id);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling document change:', error);
      this.options.onError?.(error as Error);
    }
  }

  /**
   * Fetch document with user information
   */
  private async fetchDocumentWithUsers(documentId: string): Promise<PlanningDocumentWithUsers | null> {
    try {
          const { data, error } = await this.supabase
      .from('planning_documents')
      .select(`*`)
      .eq('id', documentId)
      .single();

    if (error || !data) {
      return null;
    }
    
    // Manually fetch user details
    const userIds = [data.created_by, data.approved_by].filter(Boolean);
    let userMap = new Map();
    if(userIds.length > 0) {
        const { data: profiles } = await this.supabase.from('user_profiles').select('id, full_name').in('id', userIds);
        const { data: users } = await this.supabase.from('users').select('id, email').in('id', userIds);
        if(profiles) profiles.forEach(p => userMap.set(p.id, { ...userMap.get(p.id), full_name: p.full_name }));
        if(users) users.forEach(u => userMap.set(u.id, { ...userMap.get(u.id), email: u.email }));
    }

    // Format response
    const documentWithUsers: PlanningDocumentWithUsers = {
      ...data,
      creator_email: userMap.get(data.created_by)?.email || '',
      creator_name: userMap.get(data.created_by)?.full_name || null,
      approver_email: userMap.get(data.approved_by)?.email || null,
      approver_name: userMap.get(data.approved_by)?.full_name || null
    };

    return documentWithUsers;
    } catch (error) {
      console.error('Error fetching document with users:', error);
      return null;
    }
  }

  /**
   * Update sync options
   */
  updateOptions(newOptions: Partial<DocumentSyncOptions>): void {
    const oldProjectId = this.options.projectId;
    const oldWorkflowStep = this.options.workflowStep;

    this.options = { ...this.options, ...newOptions };

    // Restart sync if project or workflow step changed
    if (
      newOptions.projectId !== oldProjectId ||
      newOptions.workflowStep !== oldWorkflowStep
    ) {
      this.stopSync();
      this.startSync();
    }
  }
}

/**
 * Hook for using document synchronization in React components
 */
export function useDocumentSync(options: DocumentSyncOptions) {
  const syncService = new DocumentSyncService(options);

  React.useEffect(() => {
    syncService.startSync();

    return () => {
      syncService.stopSync();
    };
  }, [options.projectId, options.workflowStep]);

  React.useEffect(() => {
    syncService.updateOptions(options);
  }, [options.onDocumentUpdate, options.onDocumentDelete, options.onError]);

  return syncService;
}

/**
 * Utility function to create a document sync service
 */
export function createDocumentSync(options: DocumentSyncOptions): DocumentSyncService {
  return new DocumentSyncService(options);
}

/**
 * Document version management utilities
 */
export class DocumentVersionManager {
  private supabase = createClient();

  /**
   * Get all versions of a document
   */
  async getDocumentVersions(documentId: string) {
    try {
      const { data: versions, error } = await this.supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version', { ascending: false });
        
      if (error) {
        throw new Error('문서 버전 조회에 실패했습니다.');
      }

      if (!versions || versions.length === 0) {
        return [];
      }

      const userIds = [...new Set(versions.map(v => v.created_by).filter(Boolean))];
      let userMap = new Map();

      if (userIds.length > 0) {
          const { data: profiles } = await this.supabase.from('user_profiles').select('id, full_name').in('id', userIds);
          const { data: users } = await this.supabase.from('users').select('id, email').in('id', userIds);
          if(profiles) profiles.forEach(p => userMap.set(p.id, { ...userMap.get(p.id), full_name: p.full_name }));
          if(users) users.forEach(u => userMap.set(u.id, { ...userMap.get(u.id), email: u.email }));
      }

      return versions.map(version => ({
        ...version,
        creator_email: userMap.get(version.created_by)?.email || '',
        creator_name: userMap.get(version.created_by)?.full_name || null
      }));
    } catch (error) {
      console.error('Error fetching document versions:', error);
      throw error;
    }
  }

  /**
   * Compare two document versions
   */
  compareVersions(version1: string, version2: string): {
    added: string[];
    removed: string[];
    modified: string[];
  } {
    const lines1 = version1.split('\n');
    const lines2 = version2.split('\n');
    
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Simple line-by-line comparison
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i];
      const line2 = lines2[i];

      if (line1 === undefined && line2 !== undefined) {
        added.push(line2);
      } else if (line1 !== undefined && line2 === undefined) {
        removed.push(line1);
      } else if (line1 !== line2) {
        modified.push(`${line1} → ${line2}`);
      }
    }

    return { added, removed, modified };
  }

  /**
   * Restore document to a specific version
   */
  async restoreToVersion(documentId: string, version: number): Promise<void> {
    try {
      // Get the version content
      const { data: versionData, error: versionError } = await this.supabase
        .from('document_versions')
        .select('content')
        .eq('document_id', documentId)
        .eq('version', version)
        .single();

      if (versionError || !versionData) {
        throw new Error('해당 버전을 찾을 수 없습니다.');
      }

      // Get current document to create a backup
      const { data: currentDoc, error: currentError } = await this.supabase
        .from('planning_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (currentError || !currentDoc) {
        throw new Error('현재 문서를 찾을 수 없습니다.');
      }

      // Create backup of current version
      await this.supabase
        .from('document_versions')
        .insert([{
          document_id: documentId,
          version: currentDoc.version,
          content: currentDoc.content,
          created_by: currentDoc.created_by
        }]);

      // Update document with restored content
      const { error: updateError } = await this.supabase
        .from('planning_documents')
        .update({
          content: versionData.content,
          version: currentDoc.version + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (updateError) {
        throw new Error('문서 복원에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error restoring document version:', error);
      throw error;
    }
  }
}

/**
 * Auto-save manager for documents
 */
export class AutoSaveManager {
  private saveTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private saveCallbacks: Map<string, () => Promise<void>> = new Map();
  private readonly SAVE_DELAY = 2000; // 2 seconds

  /**
   * Schedule auto-save for a document
   */
  scheduleAutoSave(documentId: string, saveCallback: () => Promise<void>): void {
    // Clear existing timeout
    const existingTimeout = this.saveTimeouts.get(documentId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Store callback
    this.saveCallbacks.set(documentId, saveCallback);

    // Schedule new save
    const timeout = setTimeout(async () => {
      try {
        await saveCallback();
        this.saveTimeouts.delete(documentId);
        this.saveCallbacks.delete(documentId);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, this.SAVE_DELAY);

    this.saveTimeouts.set(documentId, timeout);
  }

  /**
   * Cancel auto-save for a document
   */
  cancelAutoSave(documentId: string): void {
    const timeout = this.saveTimeouts.get(documentId);
    if (timeout) {
      clearTimeout(timeout);
      this.saveTimeouts.delete(documentId);
      this.saveCallbacks.delete(documentId);
    }
  }

  /**
   * Force save immediately
   */
  async forceSave(documentId: string): Promise<void> {
    const saveCallback = this.saveCallbacks.get(documentId);
    if (saveCallback) {
      this.cancelAutoSave(documentId);
      await saveCallback();
    }
  }

  /**
   * Clean up all timeouts
   */
  cleanup(): void {
    this.saveTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.saveTimeouts.clear();
    this.saveCallbacks.clear();
  }
}