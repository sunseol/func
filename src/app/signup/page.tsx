'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Lock, User, Mail, Sun, Moon, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch'; // Ensure Switch is installed

const signupSchema = z.object({
  fullName: z.string().min(1, '이름을 입력해주세요.'),
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
});

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const handleSignup = async (values: z.infer<typeof signupSchema>) => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setMessage(
          '가입 확인 메일이 발송되었습니다. 이메일을 확인하여 계정을 활성화해주세요. 메일이 보이지 않으면 스팸함도 확인해주세요.'
        );
      } else if (data.user) {
        setMessage(
          '회원가입이 완료되었습니다. 확인 메일이 발송되었을 수 있으니 확인해주세요.'
        );
      } else {
        setMessage(
          '가입 확인 메일이 발송되었습니다. 이메일을 확인하여 계정을 활성화해주세요.'
        );
      }

      form.reset();
      toast.success('회원가입 요청 처리 완료');

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
    const email = form.getValues('email');
    if (!email) {
      setError('이메일 확인을 위해 이메일을 먼저 입력해주세요.');
      form.setFocus('email');
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

      if (error) throw error;

      setMessage('이메일 확인 링크가 재전송되었습니다. 이메일을 확인해주세요.');
      toast.success('재전송 완료');
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-4 transition-colors relative">
      <div className="absolute top-5 right-5 flex items-center gap-2">
        {/* Simple theme switcher */}
        <Sun className="h-4 w-4 text-muted-foreground" />
        <Switch
          checked={theme === 'dark'}
          onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        />
        <Moon className="h-4 w-4 text-muted-foreground" />
      </div>

      <Card className="w-full max-w-[400px] shadow-lg">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-bold">FunCommute</CardTitle>
          <CardDescription>새 계정을 만들어보세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="이름"
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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
                          placeholder="비밀번호 (6자 이상)"
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
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {message && (
                <div className="flex items-center gap-2 rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-500">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <p>{message}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? '가입 처리 중...' : '회원가입'}
              </Button>
            </form>
          </Form>

          <Button
            variant="link"
            className="w-full px-0 text-xs text-muted-foreground"
            onClick={handleResendConfirmation}
            disabled={resendLoading}
          >
            {resendLoading ? '확인 링크 전송 중...' : '이메일 확인 링크 재전송'}
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              로그인
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}