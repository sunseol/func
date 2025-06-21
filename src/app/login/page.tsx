'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      // 로그인 성공 시 메인 페이지 또는 대시보드로 이동
      router.push('/');
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '40px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '24px', color: '#333' }}>로그인</h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            placeholder="비밀번호"
            required
            style={{ padding: '12px 15px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
          />
          {error && <p style={{ color: 'red', fontSize: '14px', textAlign: 'center', margin: '0' }}>{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '12px 15px', 
              backgroundColor: loading ? '#ccc' : '#0070f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              fontSize: '16px', 
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          계정이 없으신가요? <Link href="/signup" style={{ color: '#0070f3', textDecoration: 'none' }}>회원가입</Link>
        </p>
      </div>
    </div>
  );
} 