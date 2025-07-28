'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  UsersIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface ProjectActivity {
  id: string;
  project_id: string;
  user_id: string | null;
  activity_type: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  description: string;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

interface CollaborationStats {
  total_documents: number;
  official_documents: number;
  pending_documents: number;
  total_members: number;
  total_activities: number;
  last_activity_at: string;
}

interface MemberActivitySummary {
  user_id: string;
  user_name: string | null;
  user_email: string;
  role: string;
  documents_created: number;
  documents_updated: number;
  documents_approved: number;
  ai_conversations: number;
  last_activity_at: string;
}

interface ProjectCollaborationDashboardProps {
  projectId: string;
  className?: string;
}

function ProjectCollaborationDashboard({
  projectId,
  className = ''
}: ProjectCollaborationDashboardProps) {
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [collaborationStats, setCollaborationStats] = useState<CollaborationStats | null>(null);
  const [memberSummary, setMemberSummary] = useState<MemberActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'stats' | 'members'>('timeline');

  // Fetch collaboration data
  const fetchCollaborationData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ai-pm/projects/${projectId}/activities?includeStats=true&includeMemberSummary=true&limit=20`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch collaboration data');
      }

      const data = await response.json();
      setActivities(data.activities || []);
      setCollaborationStats(data.collaborationStats || null);
      setMemberSummary(data.memberSummary || []);

    } catch (err: unknown) {
      console.error('Error fetching collaboration data:', err);
      setError(err instanceof Error ? err.message : '협업 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCollaborationData();
  }, [projectId, fetchCollaborationData]);

  // Format activity time
  const formatActivityTime = (dateString: string) => {
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
      return date.toLocaleDateString('ko-KR');
    }
  };

  // Get activity icon
  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'document_created':
      case 'document_updated':
        return DocumentTextIcon;
      case 'document_approved':
        return CheckCircleIcon;
      case 'document_approval_requested':
        return ExclamationCircleIcon;
      case 'member_added':
      case 'member_removed':
        return UsersIcon;
      case 'ai_conversation_started':
        return ChartBarIcon;
      default:
        return ClockIcon;
    }
  };

  // Get activity color
  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'document_created':
        return 'text-blue-600 bg-blue-50';
      case 'document_updated':
        return 'text-indigo-600 bg-indigo-50';
      case 'document_approved':
        return 'text-green-600 bg-green-50';
      case 'document_approval_requested':
        return 'text-yellow-600 bg-yellow-50';
      case 'member_added':
        return 'text-purple-600 bg-purple-50';
      case 'member_removed':
        return 'text-red-600 bg-red-50';
      case 'ai_conversation_started':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">협업 데이터 로딩 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchCollaborationData}
            className="px-4 py-2 text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UsersIcon className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">프로젝트 협업 현황</h2>
          </div>
          
          <button
            onClick={fetchCollaborationData}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="새로고침"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats */}
        {collaborationStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-800">전체 문서</span>
              </div>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                {collaborationStats.total_documents}
              </div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-800">승인된 문서</span>
              </div>
              <div className="text-2xl font-bold text-green-900 mt-1">
                {collaborationStats.official_documents}
              </div>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <ExclamationCircleIcon className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-800">승인 대기</span>
              </div>
              <div className="text-2xl font-bold text-yellow-900 mt-1">
                {collaborationStats.pending_documents}
              </div>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-purple-800">팀 멤버</span>
              </div>
              <div className="text-2xl font-bold text-purple-900 mt-1">
                {collaborationStats.total_members}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'timeline', label: '활동 타임라인', icon: CalendarDaysIcon },
            { id: 'stats', label: '진행 상황', icon: ChartBarIcon },
            { id: 'members', label: '멤버 활동', icon: UserCircleIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">최근 활동</h3>
            
            {activities.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDaysIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">아직 프로젝트 활동이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const ActivityIcon = getActivityIcon(activity.activity_type);
                  const activityColor = getActivityColor(activity.activity_type);
                  
                  return (
                    <div key={activity.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
                      <div className={`p-2 rounded-full ${activityColor}`}>
                        <ActivityIcon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>{activity.user_name || activity.user_email}</span>
                          <span>•</span>
                          <span>{formatActivityTime(activity.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && collaborationStats && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">프로젝트 진행 상황</h3>
            
            {/* Progress Overview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">문서 진행 현황</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>승인된 문서</span>
                    <span>{collaborationStats.official_documents}/{collaborationStats.total_documents}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full"
                      style={{ 
                        width: `${collaborationStats.total_documents > 0 
                          ? (collaborationStats.official_documents / collaborationStats.total_documents) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>승인 대기 문서</span>
                    <span>{collaborationStats.pending_documents}/{collaborationStats.total_documents}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full"
                      style={{ 
                        width: `${collaborationStats.total_documents > 0 
                          ? (collaborationStats.pending_documents / collaborationStats.total_documents) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">총 활동 수</h4>
                <div className="text-3xl font-bold text-blue-900">
                  {collaborationStats.total_activities}
                </div>
                <p className="text-sm text-blue-700 mt-1">프로젝트 시작 이후</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">마지막 활동</h4>
                <div className="text-lg font-semibold text-purple-900">
                  {formatActivityTime(collaborationStats.last_activity_at)}
                </div>
                <p className="text-sm text-purple-700 mt-1">최근 팀 활동</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">멤버별 활동 요약</h3>
            
            {memberSummary.length === 0 ? (
              <div className="text-center py-12">
                <UserCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">멤버 활동 데이터가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {memberSummary.map((member) => (
                  <div key={member.user_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserCircleIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {member.user_name || member.user_email}
                          </h4>
                          <p className="text-sm text-gray-500">{member.role}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-500">마지막 활동</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatActivityTime(member.last_activity_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-blue-600">
                          {member.documents_created}
                        </div>
                        <div className="text-xs text-gray-500">문서 생성</div>
                      </div>
                      
                      <div>
                        <div className="text-lg font-semibold text-indigo-600">
                          {member.documents_updated}
                        </div>
                        <div className="text-xs text-gray-500">문서 수정</div>
                      </div>
                      
                      <div>
                        <div className="text-lg font-semibold text-green-600">
                          {member.documents_approved}
                        </div>
                        <div className="text-xs text-gray-500">문서 승인</div>
                      </div>
                      
                      <div>
                        <div className="text-lg font-semibold text-orange-600">
                          {member.ai_conversations}
                        </div>
                        <div className="text-xs text-gray-500">AI 대화</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ProjectCollaborationDashboard); 