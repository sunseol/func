'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useTheme } from '@/app/components/ThemeProvider';
import { Card, Form, Input, Button, Typography, Alert, Space, Switch } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

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
      const { data, error: signUpError } = await supabase.auth.signUp({
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
        throw signUpError;
      }

      // signUp 함수의 반환값에서 user 객체를 확인합니다.
      // Supabase 설정에서 이메일 확인이 활성화된 경우, user 객체가 바로 반환되지 않거나,
      // user 객체 내의 `identities` 배열이 비어있을 수 있습니다.
      // 이메일 확인이 필요한 경우 사용자에게 안내 메시지를 표시합니다.

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setMessage(
          '가입 확인 메일이 발송되었습니다. 이메일을 확인하여 계정을 활성화해주세요. 메일이 보이지 않으면 스팸함도 확인해주세요.'
        );
      } else if (data.user) {
         setMessage(
          '회원가입이 완료되었습니다. 확인 메일이 발송되었을 수 있으니 확인해주세요. 바로 로그인할 수 있습니다.'
        );       
        // 이메일 확인이 필수가 아닌 경우 또는 자동 로그인되는 경우 바로 홈으로 보낼 수 있습니다.
        // router.push('/'); 
      } else {
        // data.user가 null이지만 에러도 없는 경우 (예: 이메일 확인이 강제되는 경우)
        setMessage(
          '가입 확인 메일이 발송되었습니다. 이메일을 확인하여 계정을 활성화해주세요. 메일이 보이지 않으면 스팸함도 확인해주세요.'
        );
      }
      // 폼 초기화
      form.resetFields();

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || '회원가입 중 오류가 발생했습니다.');
      } else {
        setError('알 수 없는 오류로 회원가입에 실패했습니다.');
      }
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
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        throw error;
      }

      setMessage('이메일 확인 링크가 재전송되었습니다. 이메일을 확인해주세요.');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`이메일 재전송 실패: ${err.message}`);
      } else {
        setError('이메일 재전송 중 오류가 발생했습니다.');
      }
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