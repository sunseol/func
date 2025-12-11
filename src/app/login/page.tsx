'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuthApiError } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Lock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  // FormLabel, // Not used in original design, sticking to placeholder
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // I'll assume standard Shadcn Alert is not installed, so I'll style a div or use sonner. Wait, I didn't install alert. I'll use styled div.

const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { resolvedTheme } = useTheme();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) {
        if (signInError instanceof AuthApiError && signInError.status === 400) {
          setError('아이디 혹은 비밀번호가 틀렸습니다. 다시 확인해주세요.');
        } else {
          setError(`로그인 실패: ${signInError.message}`);
        }
        return;
      }

      toast.success('로그인 성공!');
      router.push('/');
    } catch (err: unknown) {
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
    const email = form.getValues('email');
    if (!email) {
      setError('비밀번호 재설정을 위해 이메일을 먼저 입력해주세요.');
      // Focus email field
      form.setFocus('email');
      return;
    }

    setResetLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success('비밀번호 재설정 링크가 이메일로 전송되었습니다.');
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-4 transition-colors">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-bold">FunCommute</CardTitle>
          <CardDescription>로그인하여 시작하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="이메일"
                          className="pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="비밀번호"
                          className="pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          </Form>

          <Button
            variant="link"
            className="w-full px-0 text-xs text-muted-foreground"
            onClick={handlePasswordReset}
            disabled={resetLoading}
          >
            {resetLoading ? '재설정 링크 전송 중...' : '비밀번호를 잊으셨나요?'}
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              회원가입
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
