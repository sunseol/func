'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  handleLogout: () => Promise<void>;
  // 필요한 경우 다른 인증 관련 상태나 함수 추가 가능
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Error getting session:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const handleAuthStateChange = async (event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      setLoading(false); // 세션 변경 시 로딩 상태 업데이트
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // setUser(null)은 onAuthStateChange 핸들러가 처리
    } catch (error) {
      console.error('Error logging out:', error);
      // 사용자에게 에러 메시지 표시 (예: alert 또는 UI 컴포넌트)
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 