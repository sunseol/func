import { renderHook, act, waitFor } from '@testing-library/react';
import { useDocumentManager } from '../useDocumentManager';
import { PlanningDocumentWithUsers, DocumentStatus } from '@/types/ai-pm';

// Mock fetch
global.fetch = jest.fn();

// Mock document sync service
const mockDocumentSyncService = {
  startSync: jest.fn(),
  stopSync: jest.fn(),
};

const mockAutoSaveManager = {
  scheduleAutoSave: jest.fn(),
  forceSave: jest.fn(),
  cleanup: jest.fn(),
};

jest.mock('../document-sync', () => ({
  DocumentSyncService: jest.fn().mockImplementation(() => mockDocumentSyncService),
  AutoSaveManager: jest.fn().mockImplementation(() => mockAutoSaveManager),
}));

const mockDocument: PlanningDocumentWithUsers = {
  id: 'doc-1',
  project_id: 'project-1',
  workflow_step: 1,
  title: 'Test Document',
  content: '# Test Document\n\nTest content',
  status: 'private',
  version: 1,
  created_by: 'user-123',
  approved_by: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  approved_at: null,
  creator_email: 'test@example.com',
  creator_name: 'Test User',
  approver_email: null,
  approver_name: null,
};

describe('useDocumentManager', () => {
  const defaultOptions = {
    projectId: 'project-1',
    workflowStep: 1 as const,
    userId: 'user-123',
    autoSave: true,
    syncEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ documents: [] }),
      });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));
      const [state] = result.current;

      expect(state.isLoading).toBe(true);
      expect(state.document).toBe(null);
      expect(state.error).toBe(null);
    });

    it('should start sync service when syncEnabled is true', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ documents: [] }),
      });

      renderHook(() => useDocumentManager(defaultOptions));

      expect(mockDocumentSyncService.startSync).toHaveBeenCalled();
    });

    it('should not start sync service when syncEnabled is false', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ documents: [] }),
      });

      renderHook(() => useDocumentManager({
        ...defaultOptions,
        syncEnabled: false,
      }));

      expect(mockDocumentSyncService.startSync).not.toHaveBeenCalled();
    });
  });

  describe('loadDocument', () => {
    it('should load document successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ documents: [mockDocument] }),
      });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        const [state] = result.current;
        expect(state.isLoading).toBe(false);
        expect(state.document).toEqual(mockDocument);
        expect(state.error).toBe(null);
      });
    });

    it('should handle load errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Load failed' }),
      });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        const [state] = result.current;
        expect(state.isLoading).toBe(false);
        expect(state.document).toBe(null);
        expect(state.error).toBe('Load failed');
      });
    });

    it('should prioritize user document over official document', async () => {
      const userDocument = { ...mockDocument, created_by: 'user-123' };
      const officialDocument = { ...mockDocument, id: 'doc-2', status: 'official' as DocumentStatus, created_by: 'other-user' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ documents: [officialDocument, userDocument] }),
      });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        const [state] = result.current;
        expect(state.document).toEqual(userDocument);
      });
    });
  });

  describe('createDocument', () => {
    it('should create document successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documents: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ document: mockDocument }),
        });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        expect(result.current[0].isLoading).toBe(false);
      });

      let createdDocument: PlanningDocumentWithUsers;
      await act(async () => {
        const [, actions] = result.current;
        createdDocument = await actions.createDocument('New Document', 'New content');
      });

      expect(createdDocument!).toEqual(mockDocument);
      expect(global.fetch).toHaveBeenCalledWith('/api/ai-pm/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: 'project-1',
          workflow_step: 1,
          title: 'New Document',
          content: 'New content',
        }),
      });
    });

    it('should handle create errors', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documents: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: 'Create failed' }),
        });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        expect(result.current[0].isLoading).toBe(false);
      });

      await act(async () => {
        const [, actions] = result.current;
        await expect(actions.createDocument('New Document', 'New content'))
          .rejects
          .toThrow('Create failed');
      });

      const [state] = result.current;
      expect(state.error).toBe('Create failed');
    });
  });

  describe('updateDocument', () => {
    it('should update document successfully', async () => {
      const updatedDocument = { ...mockDocument, title: 'Updated Title' };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documents: [mockDocument] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ document: updatedDocument }),
        });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        expect(result.current[0].document).toEqual(mockDocument);
      });

      let updated: PlanningDocumentWithUsers;
      await act(async () => {
        const [, actions] = result.current;
        updated = await actions.updateDocument({ title: 'Updated Title' });
      });

      expect(updated!).toEqual(updatedDocument);
      expect(global.fetch).toHaveBeenCalledWith(`/api/ai-pm/documents/${mockDocument.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Updated Title' }),
      });
    });

    it('should throw error when no document exists', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ documents: [] }),
      });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        expect(result.current[0].isLoading).toBe(false);
      });

      await act(async () => {
        const [, actions] = result.current;
        await expect(actions.updateDocument({ title: 'Updated Title' }))
          .rejects
          .toThrow('업데이트할 문서가 없습니다.');
      });
    });
  });

  describe('generateDocument', () => {
    it('should generate document successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documents: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ document: mockDocument }),
        });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        expect(result.current[0].isLoading).toBe(false);
      });

      let generatedDocument: PlanningDocumentWithUsers;
      await act(async () => {
        const [, actions] = result.current;
        generatedDocument = await actions.generateDocument();
      });

      expect(generatedDocument!).toEqual(mockDocument);
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/ai-pm/documents/generate?projectId=project-1`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflow_step: 1,
          }),
        }
      );
    });

    it('should set generating state during generation', async () => {
      let resolveGenerate: (value: any) => void;
      const generatePromise = new Promise(resolve => {
        resolveGenerate = resolve;
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documents: [] }),
        })
        .mockReturnValueOnce(generatePromise);

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        expect(result.current[0].isLoading).toBe(false);
      });

      act(() => {
        const [, actions] = result.current;
        actions.generateDocument();
      });

      // Should be in generating state
      expect(result.current[0].isGenerating).toBe(true);

      // Resolve the promise
      act(() => {
        resolveGenerate!({
          ok: true,
          json: async () => ({ document: mockDocument }),
        });
      });

      await waitFor(() => {
        expect(result.current[0].isGenerating).toBe(false);
      });
    });
  });

  describe('approval workflow', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ documents: [mockDocument] }),
      });
    });

    it('should request approval successfully', async () => {
      const approvalDocument = { ...mockDocument, status: 'pending_approval' as DocumentStatus };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documents: [mockDocument] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ document: approvalDocument }),
        });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        expect(result.current[0].document).toEqual(mockDocument);
      });

      let approvedDoc: PlanningDocumentWithUsers;
      await act(async () => {
        const [, actions] = result.current;
        approvedDoc = await actions.requestApproval();
      });

      expect(approvedDoc!).toEqual(approvalDocument);
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/ai-pm/documents/${mockDocument.id}/request-approval`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should approve document successfully', async () => {
      const officialDocument = { ...mockDocument, status: 'official' as DocumentStatus };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documents: [mockDocument] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ document: officialDocument }),
        });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        expect(result.current[0].document).toEqual(mockDocument);
      });

      let approvedDoc: PlanningDocumentWithUsers;
      await act(async () => {
        const [, actions] = result.current;
        approvedDoc = await actions.approveDocument();
      });

      expect(approvedDoc!).toEqual(officialDocument);
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/ai-pm/documents/${mockDocument.id}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should reject document with reason', async () => {
      const rejectedDocument = { ...mockDocument, status: 'private' as DocumentStatus };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documents: [mockDocument] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ document: rejectedDocument }),
        });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        expect(result.current[0].document).toEqual(mockDocument);
      });

      let rejectedDoc: PlanningDocumentWithUsers;
      await act(async () => {
        const [, actions] = result.current;
        rejectedDoc = await actions.rejectDocument('Needs improvement');
      });

      expect(rejectedDoc!).toEqual(rejectedDocument);
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/ai-pm/documents/${mockDocument.id}/approve`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: 'Needs improvement' }),
        }
      );
    });
  });

  describe('auto-save functionality', () => {
    it('should schedule auto-save when enabled', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ documents: [mockDocument] }),
      });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        expect(result.current[0].document).toEqual(mockDocument);
      });

      await act(async () => {
        const [, actions] = result.current;
        await actions.saveChanges('New content', 'New title');
      });

      expect(mockAutoSaveManager.scheduleAutoSave).toHaveBeenCalledWith(
        mockDocument.id,
        expect.any(Function)
      );
    });

    it('should save immediately when auto-save is disabled', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documents: [mockDocument] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ document: { ...mockDocument, content: 'New content' } }),
        });

      const { result } = renderHook(() => useDocumentManager({
        ...defaultOptions,
        autoSave: false,
      }));

      await waitFor(() => {
        expect(result.current[0].document).toEqual(mockDocument);
      });

      await act(async () => {
        const [, actions] = result.current;
        await actions.saveChanges('New content', 'New title');
      });

      expect(mockAutoSaveManager.scheduleAutoSave).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(`/api/ai-pm/documents/${mockDocument.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: 'New content', title: 'New title' }),
      });
    });
  });

  describe('state management', () => {
    it('should mark as changed', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ documents: [mockDocument] }),
      });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        expect(result.current[0].hasUnsavedChanges).toBe(false);
      });

      act(() => {
        const [, actions] = result.current;
        actions.markAsChanged();
      });

      expect(result.current[0].hasUnsavedChanges).toBe(true);
    });

    it('should clear error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Test error' }),
      });

      const { result } = renderHook(() => useDocumentManager(defaultOptions));

      await waitFor(() => {
        expect(result.current[0].error).toBe('Test error');
      });

      act(() => {
        const [, actions] = result.current;
        actions.clearError();
      });

      expect(result.current[0].error).toBe(null);
    });
  });

  describe('cleanup', () => {
    it('should stop sync service on unmount', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ documents: [] }),
      });

      const { unmount } = renderHook(() => useDocumentManager(defaultOptions));

      unmount();

      expect(mockDocumentSyncService.stopSync).toHaveBeenCalled();
    });

    it('should cleanup auto-save manager on unmount', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ documents: [] }),
      });

      const { unmount } = renderHook(() => useDocumentManager(defaultOptions));

      unmount();

      expect(mockAutoSaveManager.cleanup).toHaveBeenCalled();
    });
  });
});