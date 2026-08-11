'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/app/components/ThemeProvider';

const { Title, Text } = Typography;

type ResetFormValues = {
  password: string;
  confirmPassword: string;
};

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();
  const supabase = createClient();

  const handleSubmit = async (values: ResetFormValues) => {
    setError(null);
    setMessage(null);
    if (values.password !== values.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: values.password });
      if (updateError) {
        setError(`비밀번호 재설정 실패: ${updateError.message}`);
        return;
      }
      setMessage('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.');
    } catch (caught: unknown) {
      if (caught instanceof Error) {
        setError(`비밀번호 재설정 실패: ${caught.message}`);
      } else {
        setError('비밀번호 재설정 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: isDarkMode ? '#141414' : '#f0f2f5',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
          borderColor: isDarkMode ? '#434343' : '#d9d9d9',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ color: isDarkMode ? '#ffffff' : '#000000', marginBottom: 8 }}>
              비밀번호 재설정
            </Title>
            <Text type="secondary">새 비밀번호를 입력해주세요.</Text>
          </div>

          <Form<ResetFormValues> layout="vertical" size="large" onFinish={handleSubmit}>
            <Form.Item
              name="password"
              label="새 비밀번호"
              rules={[{ required: true, min: 6, message: '6자 이상의 비밀번호를 입력해주세요.' }]}
            >
              <Input.Password prefix={<LockOutlined />} aria-label="새 비밀번호" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="새 비밀번호 확인"
              rules={[{ required: true, message: '비밀번호를 다시 입력해주세요.' }]}
            >
              <Input.Password prefix={<LockOutlined />} aria-label="새 비밀번호 확인" />
            </Form.Item>

            {error && <Alert message={error} type="error" showIcon />}
            {message && <Alert message={message} type="success" showIcon />}

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading} block>
                비밀번호 변경
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Link href="/login">로그인으로 돌아가기</Link>
          </div>
        </Space>
      </Card>
    </div>
  );
}
