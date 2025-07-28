'use client';

import { useState } from 'react';
import { ProjectMemberWithProfile, ProjectRole, AddMemberRequest, isValidProjectRole } from '@/types/ai-pm';
import { 
  PlusIcon, 
  TrashIcon, 
  UserIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';

interface MemberManagementProps {
  projectId: string;
  members: ProjectMemberWithProfile[];
  isAdmin: boolean;
  onMembersUpdate: () => void;
}

interface AddMemberModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddMemberModal({ projectId, onClose, onSuccess }: AddMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectRole>('콘텐츠기획');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const roles: ProjectRole[] = ['콘텐츠기획', '서비스기획', 'UIUX기획', '개발자'];

  const searchUsers = async (searchEmail: string) => {
    if (!searchEmail.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      // This would typically search for users in your system
      // For now, we'll simulate a simple search
      setSearchResults([
        { id: 'user1', email: searchEmail, full_name: null }
      ]);
    } catch (err) {
      console.error('User search failed:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser && !email.trim()) {
      setError('사용자를 선택하거나 이메일을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const requestData: AddMemberRequest = {
        user_id: selectedUser?.id || email.trim(),
        role
      };

      const response = await fetch(`/api/ai-pm/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '멤버 추가에 실패했습니다.');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">멤버 추가</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사용자 이메일
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                역할
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ProjectRole)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading || (!selectedUser && !email.trim())}
              >
                {loading ? '추가 중...' : '멤버 추가'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function MemberManagement({ 
  projectId, 
  members, 
  isAdmin, 
  onMembersUpdate 
}: MemberManagementProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('정말로 이 멤버를 제거하시겠습니까?')) {
      return;
    }

    try {
      setRemovingMember(memberId);
      
      const response = await fetch(`/api/ai-pm/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '멤버 제거에 실패했습니다.');
      }

      onMembersUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setRemovingMember(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">프로젝트 멤버</h2>
          <p className="mt-1 text-sm text-gray-600">
            총 {members.length}명의 멤버가 이 프로젝트에 참여하고 있습니다.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            멤버 추가
          </button>
        )}
      </div>

      {/* Members List */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">멤버 목록</h3>
        </div>
        
        {members.length === 0 ? (
          <div className="p-6 text-center">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">멤버가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">
              {isAdmin ? '첫 번째 멤버를 추가해보세요.' : '관리자가 멤버를 추가할 때까지 기다려주세요.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {members.map((member) => (
              <div key={member.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {(member.full_name || member.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {member.full_name || member.email}
                        </p>
                        {member.user_role === 'admin' && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            관리자
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{member.email}</p>
                      <p className="text-xs text-gray-400">
                        추가일: {formatDate(member.added_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {member.role}
                    </span>
                    
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingMember === member.id}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        title="멤버 제거"
                      >
                        {removingMember === member.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <TrashIcon className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Role Distribution */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">역할별 분포</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['콘텐츠기획', '서비스기획', 'UIUX기획', '개발자'] as ProjectRole[]).map((role) => {
            const count = members.filter(m => m.role === role).length;
            return (
              <div key={role} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600">{role}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMemberModal
          projectId={projectId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            onMembersUpdate();
          }}
        />
      )}
    </div>
  );
}