'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!fullName.trim()) {
      setError('이름을 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
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
      setEmail('');
      setPassword('');
      setFullName('');

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '40px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '24px', color: '#333' }}>회원가입</h1>
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="이름"
            required
            style={{ padding: '12px 15px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            required
            style={{ padding: '12px 15px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)"
            required
            minLength={6}
            style={{ padding: '12px 15px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
          />
          {error && <p style={{ color: 'red', fontSize: '14px', textAlign: 'center', margin: '0' }}>{error}</p>}
          {message && <p style={{ color: 'green', fontSize: '14px', textAlign: 'center', margin: '0' }}>{message}</p>}
          <button 
            type="submit" 
            disabled={loading}
            style={{
              padding: '12px 15px',
              backgroundColor: loading ? '#ccc' : '#28a745', // 초록색 계열로 변경
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? '가입 처리 중...' : '회원가입'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          이미 계정이 있으신가요? <Link href="/login" style={{ color: '#0070f3', textDecoration: 'none' }}>로그인</Link>
        </p>
      </div>
    </div>
  );
} 