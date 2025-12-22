'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Typography,
  Spin,
  Alert,
  List,
  Avatar,
  Divider,
  Tag,
  Tooltip
} from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  BulbOutlined,
  BarChartOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/app/components/ThemeProvider';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: string; // 어떤 데이터를 기반으로 답변했는지
}

interface AdminAIAssistantProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function AdminAIAssistant({ className, style }: AdminAIAssistantProps) {
  const { isDarkMode } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [supabase] = useState(() => createClient());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 초기 환영 메시지
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'assistant',
      content: `안녕하세요! 저는 FunCommute AI 어시스턴트입니다. 📊

보고서 데이터를 분석하고 다음과 같은 질문에 답변할 수 있습니다:

• "이번 주 가장 활발한 사용자는 누구인가요?"
• "프로젝트별 업무 분포를 알려주세요"
• "최근 보고서 작성 패턴은 어떤가요?"
• "팀의 생산성 트렌드를 분석해주세요"
• "특정 사용자의 업무 현황을 요약해주세요"

궁금한 것이 있으시면 언제든 물어보세요!`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  // 메시지 추가 시 스크롤
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
      // 관련 보고서 데이터 조회
      const reportData = await fetchRelevantReports(inputValue);

      // AI 응답 생성
      const aiResponse = await generateAIResponse(inputValue, reportData);

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
      // 쿼리 분석하여 필요한 데이터 결정
      const isUserQuery = query.includes('사용자') || query.includes('누구');
      const isProjectQuery = query.includes('프로젝트') || query.includes('업무');
      const isTimeQuery = query.includes('최근') || query.includes('이번') || query.includes('오늘') || query.includes('주');

      let queryBuilder = supabase
        .from('daily_reports')
        .select('*')
        .order('created_at', { ascending: false });

      // 시간 기반 필터링
      if (isTimeQuery) {
        if (query.includes('오늘')) {
          const today = new Date().toISOString().split('T')[0];
          queryBuilder = queryBuilder.eq('report_date', today);
        } else if (query.includes('이번 주')) {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          queryBuilder = queryBuilder.gte('report_date', weekAgo.toISOString().split('T')[0]);
        } else if (query.includes('최근')) {
          queryBuilder = queryBuilder.limit(50); // 최근 50개
        }
      } else {
        queryBuilder = queryBuilder.limit(100); // 기본적으로 최근 100개
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
      // 보고서 데이터 요약
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
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
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

    // 기본 통계
    const totalReports = reportData.length;
    const uniqueUsers = new Set(reportData.map(r => r.user_id)).size;
    const reportTypes = reportData.reduce((acc: Record<string, number>, r) => {
      acc[r.report_type] = (acc[r.report_type] || 0) + 1;
      return acc;
    }, {});

    // 사용자별 통계
    const userStats = reportData.reduce((acc: Record<string, number>, r) => {
      const userName = r.user_name_snapshot;
      acc[userName] = (acc[userName] || 0) + 1;
      return acc;
    }, {});

    // 최근 활동
    const recentDates = [...new Set(reportData.map(r => r.report_date))].sort().reverse().slice(0, 7);

    let context = `총 ${totalReports}개의 보고서, ${uniqueUsers}명의 사용자\n`;
    context += `보고서 유형: ${Object.entries(reportTypes).map(([type, count]) => `${type}(${count})`).join(', ')}\n`;
    context += `활발한 사용자: ${Object.entries(userStats).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 5).map(([name, count]) => `${name}(${count})`).join(', ')}\n`;
    context += `최근 활동 날짜: ${recentDates.join(', ')}\n`;

    // 샘플 보고서 내용 (처음 3개)
    if (reportData.length > 0) {
      context += '\n최근 보고서 샘플:\n';
      reportData.slice(0, 3).forEach((report, index) => {
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
    <Card
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          AI 어시스턴트
        </Space>
      }
      className={className}
      style={{
        minHeight: '600px',
        height: 'auto',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: isDarkMode ? '#1f1f1f' : '#fff',
        borderColor: isDarkMode ? '#434343' : '#d9d9d9',
        ...style
      }}
      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', padding: 0 } }}
    >
      {/* 메시지 영역 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        backgroundColor: isDarkMode ? '#141414' : '#fafafa',
        minHeight: '400px',
        maxHeight: '70vh'
      }}>
        <List
          dataSource={messages}
          renderItem={(message) => (
            <List.Item style={{ border: 'none', padding: '8px 0' }}>
              <div style={{
                display: 'flex',
                width: '100%',
                justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  maxWidth: '80%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  flexDirection: message.type === 'user' ? 'row-reverse' : 'row'
                }}>
                  <Avatar
                    icon={message.type === 'user' ? <UserOutlined /> : <RobotOutlined />}
                    style={{
                      backgroundColor: message.type === 'user' ? '#1890ff' : '#52c41a',
                      flexShrink: 0
                    }}
                  />
                  <div style={{
                    backgroundColor: message.type === 'user'
                      ? '#1890ff'
                      : isDarkMode ? '#262626' : '#fff',
                    color: message.type === 'user'
                      ? '#fff'
                      : isDarkMode ? '#fff' : '#000',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    position: 'relative',
                    border: isDarkMode && message.type === 'assistant' ? '1px solid #434343' : 'none'
                  }}>
                    <Paragraph
                      style={{
                        margin: 0,
                        color: message.type === 'user'
                          ? '#fff'
                          : isDarkMode ? '#fff' : '#000',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {message.content}
                    </Paragraph>
                    {message.context && (
                      <div style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: isDarkMode ? '1px solid #434343' : '1px solid #f0f0f0'
                      }}>
                        <Text type="secondary" style={{
                          fontSize: '12px',
                          color: isDarkMode ? '#999' : '#666'
                        }}>
                          📊 {message.context}
                        </Text>
                      </div>
                    )}
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{
                        fontSize: '11px',
                        color: message.type === 'user'
                          ? 'rgba(255,255,255,0.7)'
                          : isDarkMode ? '#999' : '#666'
                      }}>
                        {message.timestamp.toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            </List.Item>
          )}
        />
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ color: isDarkMode ? '#999' : '#666' }}>
                AI가 답변을 생성하고 있습니다...
              </Text>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 추천 질문 (메시지가 적을 때만 표시) */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 16px 16px' }}>
          <Text type="secondary" style={{ fontSize: '12px', color: isDarkMode ? '#999' : '#666' }}>
            💡 추천 질문:
          </Text>
          <div style={{ marginTop: 8 }}>
            <Space wrap>
              {suggestedQuestions.map((question, index) => (
                <Tag
                  key={index}
                  style={{ cursor: 'pointer', marginBottom: 4 }}
                  onClick={() => handleSuggestedQuestion(question)}
                >
                  {question}
                </Tag>
              ))}
            </Space>
          </div>
        </div>
      )}

      <Divider style={{ margin: 0 }} />

      {/* 입력 영역 */}
      <div style={{ padding: '16px' }}>
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="보고서에 대해 궁금한 것을 물어보세요..."
            autoSize={{ minRows: 1, maxRows: 3 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={loading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            loading={loading}
            disabled={!inputValue.trim()}
          >
            전송
          </Button>
        </Space.Compact>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: '11px', color: isDarkMode ? '#999' : '#666' }}>
            💡 Shift + Enter로 줄바꿈, Enter로 전송
          </Text>
        </div>
      </div>
    </Card>
  );
}
