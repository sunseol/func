'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  PendingApprovalDocument,
  AIpmErrorType
} from '@/types/ai-pm';

interface UsePendingApprovalsState {
  documents: PendingApprovalDocument[];
  isLoading: boolean;
  error: string | null;
}

interface UsePendingApprovalsActions {
  loadPendingApprovals: () => Promise<void>;
  refreshApprovals: () => Promise<void>;
  clearError: () => void;
}

export function usePendingApprovals(): [UsePendingApprovalsState, UsePendingApprovalsActions] {
  const [state, setState] = useState<UsePendingApprovalsState>({
    documents: [],
    isLoading: true,
    error: null
  });

  // Load pending approvals
  const loadPendingApprovals = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/ai-pm/documents/pending-approvals', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '승인 대기 문서 조회에 실패했습니다.');
      }

      const data = await response.json();
      const documents = data.documents || [];

      setState(prev => ({ 
        ...prev, 
        documents, 
        isLoading: false 
      }));

    } catch (error: any) {
      console.error('Error loading pending approvals:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
    }
  }, []);

  // Refresh approvals (alias for loadPendingApprovals)
  const refreshApprovals = useCallback(async () => {
    await loadPendingApprovals();
  }, [loadPendingApprovals]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Load pending approvals on mount
  useEffect(() => {
    loadPendingApprovals();
  }, [loadPendingApprovals]);

  const actions: UsePendingApprovalsActions = {
    loadPendingApprovals,
    refreshApprovals,
    clearError
  };

  return [state, actions];
}

export default usePendingApprovals;