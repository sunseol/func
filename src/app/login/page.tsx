'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuthApiError } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/app/components/ThemeProvider';
import { Card, Form, Input, Button, Typography, Alert, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { isDarkMode } = useTheme();
  const [form] = Form.useForm();

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);

    console.log('로그인 시도:', values.email); // 디버깅용

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      console.log('로그인 응답:', { data, error: signInError }); // 디버깅용

      if (signInError) {
        console.error('Supabase 로그인 오류:', signInError);
        if (signInError instanceof AuthApiError && signInError.status === 400) {
          setError('아이디 혹은 비밀번호가 틀렸습니다. 다시 확인해주세요.');
        } else {
          setError(`로그인 실패: ${signInError.message}`);
        }
        return;
      }

      console.log('로그인 성공:', data.user?.email);
      // 로그인 성공 시 메인 페이지 또는 대시보드로 이동
      router.push('/');
    } catch (err: unknown) {
      console.error('Login error details:', err);
      if (err instanceof AuthApiError && err.status === 400) {
        setError('아이디 혹은 비밀번호가 틀렸습니다. 다시 확인해주세요.');
      } else if (err instanceof Error) {
        setError(`로그인 실패: ${err.message}`);
      } else {
        setError('알 수 없는 오류로 로그인에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = form.getFieldValue('email');
    if (!email) {
      setError('비밀번호 재설정을 위해 이메일을 먼저 입력해주세요.');
      return;
    }

    setResetLoading(true);
    setResetMessage(null);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setResetMessage('비밀번호 재설정 링크가 이메일로 전송되었습니다.');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`비밀번호 재설정 실패: ${err.message}`);
      } else {
        setError('비밀번호 재설정 중 오류가 발생했습니다.');
      }
    } finally {
      setResetLoading(false);
    }
  };



  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      padding: '20px', 
      backgroundColor: isDarkMode ? '#141414' : '#f0f2f5',
      transition: 'background-color 0.3s'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: '400px',
          backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
          borderColor: isDarkMode ? '#434343' : '#d9d9d9'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ color: isDarkMode ? '#ffffff' : '#000000', marginBottom: 8 }}>
              FunCommute
            </Title>
            <Text type="secondary">로그인하여 시작하세요</Text>
          </div>

          <Form form={form} onFinish={handleLogin} layout="vertical" size="large">
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '이메일을 입력해주세요.' },
                { type: 'email', message: '올바른 이메일 형식이 아닙니다.' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="이메일"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '비밀번호를 입력해주세요.' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="비밀번호"
              />
            </Form.Item>

            {error && (
              <Form.Item>
                <Alert message={error} type="error" showIcon />
              </Form.Item>
            )}

            {resetMessage && (
              <Form.Item>
                <Alert message={resetMessage} type="success" showIcon />
              </Form.Item>
            )}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
              >
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="link"
                onClick={handlePasswordReset}
                loading={resetLoading}
                block
                style={{ padding: 0 }}
              >
                {resetLoading ? '재설정 링크 전송 중...' : '비밀번호를 잊으셨나요?'}
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              계정이 없으신가요?{' '}
              <Link href="/signup" style={{ color: isDarkMode ? '#1890ff' : '#1890ff' }}>
                회원가입
              </Link>
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
} 
