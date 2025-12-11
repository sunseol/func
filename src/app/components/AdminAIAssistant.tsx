'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import {
  Send,
  Bot,
  User,
  HelpCircle,
  Lightbulb,
  BarChart2,
  FileText,
  Loader2
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: string;
}

interface AdminAIAssistantProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function AdminAIAssistant({ className, style }: AdminAIAssistantProps) {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [supabase] = useState(() => createClient());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'assistant',
      content: `안녕하세요! 저는 FunCommute AI 어시스턴트입니다. 📊\n\n보고서 데이터를 분석하고 다음과 같은 질문에 답변할 수 있습니다:\n\n• "이번 주 가장 활발한 사용자는 누구인가요?"\n• "프로젝트별 업무 분포를 알려주세요"\n• "최근 보고서 작성 패턴은 어떤가요?"\n• "팀의 생산성 트렌드를 분석해주세요"\n• "특정 사용자의 업무 현황을 요약해주세요"\n\n궁금한 것이 있으시면 언제든 물어보세요!`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const reportData = await fetchRelevantReports(userMessage.content);
      const aiResponse = await generateAIResponse(userMessage.content, reportData);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        context: aiResponse.context
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI 응답 생성 실패:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '죄송합니다. 현재 응답을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelevantReports = async (query: string) => {
    try {
      const isTimeQuery = query.includes('최근') || query.includes('이번') || query.includes('오늘') || query.includes('주');

      let queryBuilder = supabase
        .from('daily_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (isTimeQuery) {
        if (query.includes('오늘')) {
          const today = new Date().toISOString().split('T')[0];
          queryBuilder = queryBuilder.eq('report_date', today);
        } else if (query.includes('이번 주')) {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          queryBuilder = queryBuilder.gte('report_date', weekAgo.toISOString().split('T')[0]);
        } else if (query.includes('최근')) {
          queryBuilder = queryBuilder.limit(50);
        }
      } else {
        queryBuilder = queryBuilder.limit(100);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('보고서 데이터 조회 실패:', error);
      return [];
    }
  };

  const generateAIResponse = async (query: string, reportData: any[]) => {
    try {
      const dataContext = generateDataContext(reportData);

      const prompt = `
당신은 FunCommute 업무 보고서 시스템의 AI 어시스턴트입니다.
다음 보고서 데이터를 바탕으로 사용자의 질문에 한국어로 답변해주세요.

사용자 질문: "${query}"

보고서 데이터 요약:
${dataContext}

답변 시 다음 사항을 고려해주세요:
1. 구체적인 수치와 데이터를 포함하여 답변
2. 인사이트나 패턴이 있다면 언급
3. 필요시 개선 제안이나 권장사항 포함
4. 친근하고 전문적인 톤으로 작성
5. 답변은 3-5문단으로 구성

데이터가 부족하거나 질문과 관련이 없다면 정중히 설명해주세요.
      `;

      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('AI 응답 생성 실패');
      }

      const data = await response.json();

      return {
        content: data.content || '죄송합니다. 응답을 생성할 수 없습니다.',
        context: `${reportData.length}개의 보고서 데이터 분석`
      };
    } catch (error) {
      console.error('AI 응답 생성 오류:', error);
      return {
        content: '현재 AI 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.',
        context: 'AI 서비스 오류'
      };
    }
  };

  const generateDataContext = (reportData: any[]) => {
    if (reportData.length === 0) {
      return '현재 조회된 보고서 데이터가 없습니다.';
    }

    const totalReports = reportData.length;
    const uniqueUsers = new Set(reportData.map(r => r.user_id)).size;
    const reportTypes = reportData.reduce((acc: Record<string, number>, r: any) => {
      acc[r.report_type] = (acc[r.report_type] || 0) + 1;
      return acc;
    }, {});

    const userStats = reportData.reduce((acc: Record<string, number>, r: any) => {
      const userName = r.user_name_snapshot;
      acc[userName] = (acc[userName] || 0) + 1;
      return acc;
    }, {});

    const recentDates = [...new Set(reportData.map((r: any) => r.report_date))].sort().reverse().slice(0, 7);

    let context = `총 ${totalReports}개의 보고서, ${uniqueUsers}명의 사용자\n`;
    context += `보고서 유형: ${Object.entries(reportTypes).map(([type, count]) => `${type}(${count})`).join(', ')}\n`;
    context += `활발한 사용자: ${Object.entries(userStats).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 5).map(([name, count]) => `${name}(${count})`).join(', ')}\n`;
    context += `최근 활동 날짜: ${recentDates.join(', ')}\n`;

    if (reportData.length > 0) {
      context += '\n최근 보고서 샘플:\n';
      reportData.slice(0, 3).forEach((report: any, index: number) => {
        context += `${index + 1}. ${report.report_date} - ${report.user_name_snapshot} (${report.report_type}): ${report.report_content.substring(0, 100)}...\n`;
      });
    }

    return context;
  };

  const suggestedQuestions = [
    "이번 주 가장 활발한 사용자는 누구인가요?",
    "최근 보고서 작성 패턴을 분석해주세요",
    "프로젝트별 업무 분포를 알려주세요",
    "팀의 생산성 트렌드는 어떤가요?"
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
  };

  return (
    <Card className={cn("flex flex-col h-[600px]", className)} style={style}>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-primary" />
          AI 데이터 분석 어시스턴트
        </CardTitle>
        <CardDescription>
          보고서 데이터를 기반으로 질문에 답변해드립니다.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden bg-muted/20">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  message.type === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <Avatar className={cn(
                  "h-8 w-8",
                  message.type === 'assistant' ? "bg-primary/10 text-primary" : "bg-muted"
                )}>
                  {message.type === 'user' ?
                    <AvatarImage src="" /> :
                    null}
                  <AvatarFallback className={message.type === 'assistant' ? "bg-primary text-primary-foreground" : ""}>
                    {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>

                <div className={cn(
                  "rounded-lg p-3 text-sm shadow-sm",
                  message.type === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border text-card-foreground"
                )}>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </div>
                  {message.context && (
                    <div className="mt-2 pt-2 border-t border-primary/10 text-xs opacity-70 flex items-center gap-1">
                      <BarChart2 className="h-3 w-3" /> {message.context}
                    </div>
                  )}
                  <div className="mt-1 text-[10px] opacity-70 text-right">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 max-w-[85%] mr-auto">
                <Avatar className="h-8 w-8 bg-primary/10 text-primary">
                  <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="rounded-lg p-3 text-sm bg-card border text-card-foreground shadow-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-muted-foreground">답변을 생성하고 있습니다...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <div className="bg-background p-2 border-t text-xs text-muted-foreground flex gap-2 overflow-x-auto pb-4 px-4 sticky bottom-[70px]">
        {messages.length <= 2 && suggestedQuestions.map((q, i) => (
          <Badge
            key={i}
            variant="outline"
            className="cursor-pointer hover:bg-muted whitespace-nowrap py-1"
            onClick={() => handleSuggestedQuestion(q)}
          >
            {q}
          </Badge>
        ))}
      </div>

      <CardFooter className="p-3 pt-0 border-t bg-background">
        <form
          className="flex w-full items-center gap-2 mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <Input
            placeholder="궁금한 내용을 입력하세요..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={loading || !inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}