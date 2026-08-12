'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useTheme } from '@/app/components/ThemeProvider';
import { Card, Form, Input, Button, Typography, Alert, Space, Switch } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const GENERIC_SIGNUP_MESSAGE = '가입 요청을 처리했습니다. 입력하신 이메일의 안내를 확인해주세요.';
const GENERIC_RESEND_MESSAGE = '요청을 처리했습니다. 입력하신 이메일을 확인해주세요.';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const supabase = createClient();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const [form] = Form.useForm();

  const handleSignup = async (values: { fullName: string; email: string; password: string }) => {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!values.fullName.trim()) {
      setError('이름을 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          },
          // emailRedirectTo: `${window.location.origin}/` // 이메일 확인 후 리디렉션될 URL
        }
      });

      if (signUpError) {
        setMessage(GENERIC_SIGNUP_MESSAGE);
        return;
      }

      setMessage(GENERIC_SIGNUP_MESSAGE);
      form.resetFields();

    } catch (err: unknown) {
      setMessage(GENERIC_SIGNUP_MESSAGE);
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const email = form.getFieldValue('email');
    if (!email) {
      setError('이메일 확인을 위해 이메일을 먼저 입력해주세요.');
      return;
    }

    setResendLoading(true);
    setMessage(null);
    setError(null);

    try {
      await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      setMessage(GENERIC_RESEND_MESSAGE);
    } catch {
      setMessage(GENERIC_RESEND_MESSAGE);
    } finally {
      setResendLoading(false);
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
      {/* 테마 토글 버튼 */}
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <Switch
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
          checked={isDarkMode}
          onChange={setIsDarkMode}
        />
      </div>

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
            <Text type="secondary">새 계정을 만들어보세요</Text>
          </div>

          <Form form={form} onFinish={handleSignup} layout="vertical" size="large">
            <Form.Item
              name="fullName"
              rules={[{ required: true, message: '이름을 입력해주세요.' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="이름"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: '이메일을 입력해주세요.' },
                { type: 'email', message: '올바른 이메일 형식이 아닙니다.' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="이메일"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '비밀번호를 입력해주세요.' },
                { min: 6, message: '비밀번호는 최소 6자 이상이어야 합니다.' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="비밀번호 (6자 이상)"
              />
            </Form.Item>

            {error && (
              <Form.Item>
                <Alert message={error} type="error" showIcon />
              </Form.Item>
            )}

            {message && (
              <Form.Item>
                <Alert message={message} type="success" showIcon />
              </Form.Item>
            )}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                {loading ? '가입 처리 중...' : '회원가입'}
              </Button>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="link"
                onClick={handleResendConfirmation}
                loading={resendLoading}
                block
                style={{ padding: 0, fontSize: '12px' }}
              >
                {resendLoading ? '확인 링크 전송 중...' : '이메일 확인 링크 재전송'}
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" style={{ color: isDarkMode ? '#1890ff' : '#1890ff' }}>
                로그인
              </Link>
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
} 
