'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  DocumentIcon, 
  EyeIcon,
  ArrowUturnLeftIcon,
  UserIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface DocumentVersion {
  id: string;
  version: number;
  content: string;
  created_by: string;
  created_at: string;
  creator_name?: string;
  creator_email: string;
  changes_summary?: string;
}

interface DocumentVersionHistoryProps {
  projectId: string;
  documentId: string;
  currentVersion: number;
  isOpen: boolean;
  onClose: () => void;
  onPreviewVersion: (version: DocumentVersion) => void;
  onRestoreVersion?: (versionId: string) => Promise<void>;
  className?: string;
}

export default function DocumentVersionHistory({
  projectId,
  documentId,
  currentVersion,
  isOpen,
  onClose,
  onPreviewVersion,
  onRestoreVersion,
  className = ''
}: DocumentVersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);

  // Fetch document versions
  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ai-pm/documents/${documentId}/versions`);
      
      if (!response.ok) {
        throw new Error('버전 히스토리를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (err: any) {
      console.error('Failed to fetch versions:', err);
      setError(err.message || '버전 히스토리를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Load versions when component opens
  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, documentId]);

  // Handle version preview
  const handlePreviewVersion = (version: DocumentVersion) => {
    setSelectedVersion(version);
    onPreviewVersion(version);
  };

  // Handle version restore
  const handleRestoreVersion = async (version: DocumentVersion) => {
    if (!onRestoreVersion) return;

    const confirmed = window.confirm(
      `버전 ${version.version}으로 되돌리시겠습니까? 현재 변경사항은 새로운 버전으로 저장됩니다.`
    );
    
    if (!confirmed) return;

    try {
      setError(null);
      await onRestoreVersion(version.id);
      await fetchVersions(); // Refresh versions list
    } catch (err: any) {
      setError(err.message || '버전 복원에 실패했습니다.');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days === 0) {
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes < 1 ? '방금 전' : `${minutes}분 전`;
      }
      return `${hours}시간 전`;
    } else if (days < 7) {
      return `${days}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Get content preview (first 100 characters)
  const getContentPreview = (content: string) => {
    const plainText = content.replace(/[#*`\[\]]/g, '').trim();
    return plainText.length > 100 ? 
      plainText.substring(0, 100) + '...' : 
      plainText;
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-6 h-6 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-900">문서 버전 히스토리</h2>
            <span className="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded">
              총 {versions.length}개 버전
            </span>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Versions list */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">버전 목록</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="w-6 h-6 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-600">로딩 중...</span>
                </div>
              ) : versions.length === 0 ? (
                <div className="flex items-center justify-center p-8 text-gray-500">
                  <DocumentIcon className="w-8 h-8 mr-2" />
                  버전 히스토리가 없습니다.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedVersion?.id === version.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                      onClick={() => handlePreviewVersion(version)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            version.version === currentVersion 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            v{version.version}
                            {version.version === currentVersion && ' (현재)'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewVersion(version);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                            title="미리보기"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          
                          {onRestoreVersion && version.version !== currentVersion && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreVersion(version);
                              }}
                              className="p-1 text-gray-400 hover:text-orange-600 rounded"
                              title="이 버전으로 복원"
                            >
                              <ArrowUturnLeftIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <UserIcon className="w-4 h-4" />
                        <span>{version.creator_name || version.creator_email}</span>
                        <span className="text-gray-400">•</span>
                        <span>{formatDate(version.created_at)}</span>
                      </div>
                      
                      {version.changes_summary && (
                        <p className="text-sm text-gray-700 mb-2">{version.changes_summary}</p>
                      )}
                      
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {getContentPreview(version.content)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Version preview */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">
                {selectedVersion ? (
                  <>버전 {selectedVersion.version} 미리보기</>
                ) : (
                  '버전을 선택하여 미리보기'
                )}
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {selectedVersion ? (
                <div className="p-4">
                  {/* Version metadata */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">버전:</span>
                        <span className="ml-2 font-medium">v{selectedVersion.version}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">작성자:</span>
                        <span className="ml-2">{selectedVersion.creator_name || selectedVersion.creator_email}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">생성일:</span>
                        <span className="ml-2">{new Date(selectedVersion.created_at).toLocaleString('ko-KR')}</span>
                      </div>
                      {selectedVersion.changes_summary && (
                        <div className="col-span-2">
                          <span className="text-gray-600">변경 요약:</span>
                          <span className="ml-2">{selectedVersion.changes_summary}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Content preview */}
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">
                      {selectedVersion.content}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <DocumentIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>왼쪽에서 버전을 선택하면</p>
                    <p>여기에 미리보기가 표시됩니다.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            닫기
          </button>
          
          {selectedVersion && onRestoreVersion && selectedVersion.version !== currentVersion && (
            <button
              onClick={() => handleRestoreVersion(selectedVersion)}
              className="px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700"
            >
              이 버전으로 복원
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 