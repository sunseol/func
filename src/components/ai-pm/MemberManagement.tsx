'use client';

import { useState, useEffect } from 'react';
import { ProjectMemberWithProfile, ProjectRole } from '@/types/ai-pm';
import { Modal, Select, Button, Form, Alert, Avatar, Card, Space, Typography, Popconfirm, App } from 'antd';
import { UserOutlined, TeamOutlined, PlusOutlined, DeleteOutlined, UsergroupAddOutlined, EditOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text, Title } = Typography;

// Helper function to get role color
const getRoleColor = (role: ProjectRole): string => {
  const colors = {
    '콘텐츠기획': '#1890ff',
    '서비스기획': '#52c41a', 
    'UIUX기획': '#fa8c16',
    '개발자': '#722ed1'
  };
  return colors[role] || '#1890ff';
};

interface AddMemberModalProps {
  projectId: string;
  currentMembers: ProjectMemberWithProfile[];
  onClose: () => void;
  onSuccess: () => void;
}

function AddMemberModal({ projectId, currentMembers, onClose, onSuccess }: AddMemberModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const roles: ProjectRole[] = ['콘텐츠기획', '서비스기획', 'UIUX기획', '개발자'];

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await fetch('/api/ai-pm/users/search', { cache: 'no-store' });
        if (!response.ok) throw new Error('사용자 목록을 불러오는데 실패했습니다.');
        
        const data = await response.json();
        const availableUsers = (data.users || []).filter(
          (user: any) => !currentMembers.some(member => member.user_id === user.id)
        );
        setAllUsers(availableUsers);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, [currentMembers]);

  const handleSubmit = async (values: { userId: string, role: ProjectRole }) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/ai-pm/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: values.userId, role: values.role }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '멤버 추가에 실패했습니다.');
      }

      message.success('멤버가 성공적으로 추가되었습니다.');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal
      title="새 멤버 추가"
      open={true}
      onCancel={onClose}
      footer={null}
      width={400}
      centered
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ marginTop: 24 }}
        initialValues={{ role: '콘텐츠기획' }}
      >
        <Form.Item
          name="userId"
          label="사용자 선택"
          rules={[{ required: true, message: '추가할 사용자를 선택해주세요.' }]}
        >
          <Select
            placeholder="사용자를 검색하고 선택하세요"
            loading={loadingUsers}
            showSearch
            filterOption={(input, option) =>
              String(option?.children).toLowerCase().includes(input.toLowerCase())
            }
          >
            {allUsers.map((user) => (
              <Option key={user.id} value={user.id}>
                {user.full_name || user.email}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="role"
          label="역할 선택"
          rules={[{ required: true, message: '멤버의 역할을 선택해주세요.' }]}
        >
          <Select>
            {roles.map((r) => (
              <Option key={r} value={r}>
                <Space>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getRoleColor(r) }} />
                  {r}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={loading}>취소</Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={<UserOutlined />}>
              멤버 추가
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

interface MemberManagementProps {
  projectId: string;
  members: ProjectMemberWithProfile[];
  onMembersUpdate: () => void;
}

export default function MemberManagement({ projectId, members, onMembersUpdate }: MemberManagementProps) {
  const { message } = App.useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [loadingState, setLoadingState] = useState<{ [key: string]: boolean }>({});

  const handleRemoveMember = async (memberId: string) => {
    setLoadingState(prev => ({ ...prev, [memberId]: true }));
    try {
      const response = await fetch(`/api/ai-pm/projects/${projectId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '멤버 제거에 실패했습니다.');
      }
      
      message.success('멤버가 성공적으로 제거되었습니다.');
      onMembersUpdate();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '멤버 제거 중 오류가 발생했습니다.');
    } finally {
      setLoadingState(prev => ({ ...prev, [memberId]: false }));
    }
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    onMembersUpdate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Title level={4}>프로젝트 멤버</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
          멤버 추가
        </Button>
      </div>

      <Card>
        {members.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <UsergroupAddOutlined style={{ fontSize: 48, color: '#d1d5db' }} />
            <p className="mt-2">프로젝트에 멤버가 없습니다.</p>
            <p className="text-sm">새로운 멤버를 추가해보세요.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {members.map((member) => (
              <div key={member.id} className="p-4 flex items-center justify-between">
                <Space>
                  <Avatar style={{ backgroundColor: '#87d068' }} icon={<UserOutlined />} />
                  <div>
                    <Text strong>{member.full_name || member.email}</Text>
                    <br />
                    <Text type="secondary">{member.email}</Text>
                  </div>
                </Space>
                
                <Space>
                  <div style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: getRoleColor(member.role), color: 'white', fontSize: 12 }}>
                    {member.role}
                  </div>
                  <Popconfirm
                    title="정말로 이 멤버를 제거하시겠습니까?"
                    onConfirm={() => handleRemoveMember(member.id)}
                    okText="제거"
                    cancelText="취소"
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      loading={loadingState[member.id]}
                    />
                  </Popconfirm>
                </Space>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showAddModal && (
        <AddMemberModal
          projectId={projectId}
          currentMembers={members}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
}
