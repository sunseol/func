'use client';

import { useEffect, useState } from 'react';
import { PROJECT_ROLES, ProjectMemberWithProfile, ProjectRole, ROLE_LABELS } from '@/types/ai-pm';
import { App, Avatar, Button, Card, Form, Modal, Popconfirm, Select, Space, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined, UserOutlined, UsergroupAddOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text, Title } = Typography;

const getRoleColor = (role: ProjectRole): string => {
  const colors = new Map<ProjectRole, string>([
    [PROJECT_ROLES[0], '#1890ff'],
    [PROJECT_ROLES[1], '#52c41a'],
    [PROJECT_ROLES[2], '#fa8c16'],
    [PROJECT_ROLES[3], '#722ed1'],
  ]);
  return colors.get(role) ?? '#1890ff';
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await fetch('/api/ai-pm/users/search', { cache: 'no-store' });
        if (!response.ok) throw new Error('사용자 목록을 불러오지 못했습니다.');

        const data = await response.json();
        const availableUsers = (data.users || []).filter(
          (user: any) => !currentMembers.some((member) => member.user_id === user.id),
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

  const handleSubmit = async (values: { userId: string; role: ProjectRole }) => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/ai-pm/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: values.userId, role: values.role }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '멤버 추가에 실패했습니다.');
      }

      message.success('멤버가 추가되었습니다.');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="새 멤버 추가" open onCancel={onClose} footer={null} width={420} centered>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ marginTop: 24 }}
        initialValues={{ role: PROJECT_ROLES[0] as ProjectRole }}
      >
        <Form.Item
          name="userId"
          label="사용자 선택"
          rules={[{ required: true, message: '추가할 사용자를 선택해 주세요.' }]}
        >
          <Select
            placeholder="사용자를 검색하고 선택하세요"
            loading={loadingUsers}
            showSearch
            filterOption={(input, option) => String(option?.children).toLowerCase().includes(input.toLowerCase())}
          >
            {allUsers.map((user) => (
              <Option key={user.id} value={user.id}>
                {user.full_name || user.email}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="role" label="역할" rules={[{ required: true, message: '역할을 선택해 주세요.' }]}>
          <Select>
            {PROJECT_ROLES.map((role) => (
              <Option key={role} value={role}>
                {ROLE_LABELS[role]}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={submitting}>
              취소
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} icon={<UserOutlined />}>
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
  const [loadingState, setLoadingState] = useState<Record<string, boolean>>({});

  const handleRemoveMember = async (memberId: string) => {
    setLoadingState((prev) => ({ ...prev, [memberId]: true }));
    try {
      const response = await fetch(`/api/ai-pm/projects/${projectId}/members?memberId=${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '멤버 삭제에 실패했습니다.');
      }

      message.success('멤버가 삭제되었습니다.');
      onMembersUpdate();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '멤버 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoadingState((prev) => ({ ...prev, [memberId]: false }));
    }
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
            <p className="text-sm">새 멤버를 추가해 보세요.</p>
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
                  <div
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: getRoleColor(member.role),
                      color: 'white',
                      fontSize: 12,
                    }}
                  >
                    {ROLE_LABELS[member.role]}
                  </div>
                  <Popconfirm
                    title="정말로 멤버를 삭제하시겠습니까?"
                    onConfirm={() => handleRemoveMember(member.id)}
                    okText="삭제"
                    cancelText="취소"
                  >
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} loading={loadingState[member.id]} />
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
          onSuccess={() => {
            setShowAddModal(false);
            onMembersUpdate();
          }}
        />
      )}
    </div>
  );
}
