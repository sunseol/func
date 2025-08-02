'use client';

import { useState } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { CreateProjectRequest } from '@/types/ai-pm';

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('프로젝트 이름을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ai-pm/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '프로젝트 생성에 실패했습니다.');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateProjectRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 id="modal-title" className="text-lg font-medium text-gray-900">
              새 프로젝트 생성
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <CloseOutlined style={{ fontSize: 24 }} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Project Name */}
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                프로젝트 이름 <span className="text-red-500">*</span>
              </label>
              <input
                id="project-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="예: 전자책 플랫폼 기획"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
                maxLength={255}
              />
            </div>

            {/* Project Description */}
            <div>
              <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1">
                프로젝트 설명
              </label>
              <textarea
                id="project-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="프로젝트에 대한 간단한 설명을 입력해주세요..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                disabled={loading}
                maxLength={1000}
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.description?.length || 0}/1000
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !formData.name.trim()}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    생성 중...
                  </div>
                ) : (
                  '프로젝트 생성'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}