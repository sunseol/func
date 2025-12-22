'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert, Space } from 'antd';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/app/components/ThemeProvider';

const { Title, Text } = Typography;

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { isDarkMode } = useTheme();
  const supabase = useMemo(() => createClient(), []);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user || loading) return;
    form.setFieldsValue({
      fullName: profile?.full_name || user.user_metadata?.full_name || '',
      email: user.email || '',
    });
  }, [form, loading, profile, user]);

  const handleSave = async (values: { fullName: string; email: string }) => {
    if (!user) {
      setError('Please sign in to update your profile.');
      return;
    }

    const fullName = values.fullName?.trim();
    if (!fullName) {
      setError('Please enter your name.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    if (authError) {
      setError(`Failed to update profile: ${authError.message}`);
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (profileError) {
      setError(`Failed to update profile: ${profileError.message}`);
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSuccess('Profile updated.');
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Text>Please sign in to view your profile.</Text>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: isDarkMode ? '#141414' : '#f0f2f5',
        transition: 'background-color 0.3s',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
          borderColor: isDarkMode ? '#434343' : '#d9d9d9',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ color: isDarkMode ? '#ffffff' : '#000000', marginBottom: 8 }}>
              Profile
            </Title>
            <Text type="secondary">Update your personal information</Text>
          </div>

          <Form form={form} onFinish={handleSave} layout="vertical" size="large">
            <Form.Item
              name="fullName"
              label="Full name"
              rules={[{ required: true, message: 'Please enter your name.' }]}
            >
              <Input placeholder="Your name" />
            </Form.Item>

            <Form.Item name="email" label="Email">
              <Input disabled />
            </Form.Item>

            {error && (
              <Form.Item>
                <Alert message={error} type="error" showIcon />
              </Form.Item>
            )}

            {success && (
              <Form.Item>
                <Alert message={success} type="success" showIcon />
              </Form.Item>
            )}

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={saving} block size="large">
                Save changes
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
