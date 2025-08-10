'use client';

import React, { useState } from 'react';
import { 
  PlanningDocumentWithUsers,
  ApprovalHistoryEntry,
  DocumentStatus,
  getStatusDescription
} from '@/types/ai-pm';

interface DocumentApprovalPanelProps {
  document: PlanningDocumentWithUsers;
  onRequestApproval: () => Promise<void>;
  onApprove: () => Promise<void>;
  onReject: (reason?: string) => Promise<void>;
  onGetHistory: () => Promise<ApprovalHistoryEntry[]>;
  canApprove: boolean;
  isOwner: boolean;
  isLoading?: boolean;
}

export function DocumentApprovalPanel({
  document,
  onRequestApproval,
  onApprove,
  onReject,
  onGetHistory,
  canApprove,
  isOwner,
  isLoading = false
}: DocumentApprovalPanelProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadHistory = async () => {
    if (loadingHistory) return;
    
    setLoadingHistory(true);
    try {
      const historyData = await onGetHistory();
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load approval history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRequestApproval = async () => {
    setActionLoading('request');
    try {
      await onRequestApproval();
    } catch (error) {
      console.error('Failed to request approval:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      await onApprove();
    } catch (error) {
      console.error('Failed to approve document:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    setActionLoading('reject');
    try {
      await onReject(rejectReason.trim() || undefined);
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject document:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleHistory = () => {
    if (!showHistory) {
      loadHistory();
    }
    setShowHistory(!showHistory);
  };

  const getStatusBadgeClass = (status: DocumentStatus) => {
    switch (status) {
      case 'private':
        return 'bg-gray-100 text-gray-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'official':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'requested':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Status Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">문서 상태:</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(document.status)}`}>
            {getStatusDescription(document.status)}
          </span>
        </div>
        
        <button
          onClick={toggleHistory}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          disabled={loadingHistory}
        >
          {loadingHistory ? '로딩 중...' : showHistory ? '히스토리 숨기기' : '승인 히스토리 보기'}
        </button>
      </div>

      {/* Document Info */}
      <div className="text-sm text-gray-600 space-y-1">
        <div>작성자: {document.creator_name || document.creator_email}</div>
        {document.approved_by && (
          <div>승인자: {document.approver_name || document.approver_email}</div>
        )}
        {document.approved_at && (
          <div>승인일: {formatDate(document.approved_at)}</div>
        )}
        <div>최종 수정: {formatDate(document.updated_at)}</div>
        <div>버전: {document.version}</div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        {/* Request Approval Button */}
        {isOwner && document.status === 'private' && (
          <button
            onClick={handleRequestApproval}
            disabled={isLoading || actionLoading === 'request'}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'request' ? '요청 중...' : '승인 요청'}
          </button>
        )}

        {/* Approve Button */}
        {canApprove && document.status === 'pending_approval' && (
          <button
            onClick={handleApprove}
            disabled={isLoading || actionLoading === 'approve'}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'approve' ? '승인 중...' : '승인'}
          </button>
        )}

        {/* Reject Button */}
        {canApprove && document.status === 'pending_approval' && (
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isLoading || actionLoading === 'reject'}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            반려
          </button>
        )}
      </div>

      {/* Approval History */}
      {showHistory && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">승인 히스토리</h4>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">승인 히스토리가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeClass(entry.action)}`}>
                    {entry.action === 'requested' ? '요청' : entry.action === 'approved' ? '승인' : '반려'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900">
                      {entry.user_name || entry.user_email}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(entry.created_at)}
                    </div>
                    {entry.reason && (
                      <div className="text-sm text-gray-700 mt-1">
                        사유: {entry.reason}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {entry.previous_status} → {entry.new_status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">문서 반려</h3>
            <div className="mb-4">
              <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 mb-2">
                반려 사유 (선택사항)
              </label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base text-[16px] sm:px-3 sm:py-2 sm:text-sm sm:rows-3"
                placeholder="반려 사유를 입력하세요..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={actionLoading === 'reject'}
              >
                취소
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={actionLoading === 'reject'}
              >
                {actionLoading === 'reject' ? '반려 중...' : '반려'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentApprovalPanel;