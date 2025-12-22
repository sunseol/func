'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Select, 
  DatePicker, 
  Space, 
  Typography, 
  Spin, 
  Row,
  Col,
  Statistic,
  Tag,
  Divider
} from 'antd';
import { 
  FileTextOutlined, 
  UserOutlined, 
  CalendarOutlined,
  BarChartOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/app/components/ThemeProvider';
import type { Dayjs } from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface DailyReport {
  id: string;
  user_id: string;
  report_date: string;
  report_type: string;
  user_name_snapshot: string;
  report_content: string;
  projects_data?: unknown;
  misc_tasks_data?: unknown;
  created_at: string;
}

interface SummaryData {
  totalReports: number;
  userCount: number;
  reportsByType: Record<string, number>;
  reportsByUser: Record<string, number>;
  keyInsights: string[];
  aiSummary: string;
}

interface ReportSummaryProps {
  onSummaryGenerated?: (summary: SummaryData) => void;
}

export default function ReportSummary({ onSummaryGenerated }: ReportSummaryProps) {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [reportType, setReportType] = useState<string>('all');
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, name: string}>>([]);
  const [supabase] = useState(() => createClient());

  // 사용자 목록 로드
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: reportsData } = await supabase
          .from('daily_reports')
          .select('user_id, user_name_snapshot')
          .order('created_at', { ascending: false });

        if (reportsData) {
          const uniqueUsers = new Map();
          reportsData.forEach(report => {
            if (!uniqueUsers.has(report.user_id)) {
              uniqueUsers.set(report.user_id, {
                id: report.user_id,
                name: report.user_name_snapshot
              });
            }
          });
          setAvailableUsers(Array.from(uniqueUsers.values()));
        }
      } catch (error) {
        console.error('사용자 목록 로드 실패:', error);
      }
    };

    fetchUsers();
  }, [supabase]);

  // 필터 조건 변경 시 AI 요약 초기화
  useEffect(() => {
    if (summaryData) {
      setSummaryData(null);
    }
  }, [dateRange, selectedUsers, reportType]);

  const fetchReports = async () => {
    setLoading(true);
    // 새로운 조회 시 기존 AI 요약 초기화
    setSummaryData(null);
    
    try {
      let query = supabase
        .from('daily_reports')
        .select('*')
        .order('created_at', { ascending: false });

      // 날짜 범위 필터
      if (dateRange && dateRange[0] && dateRange[1]) {
        const startDate = dateRange[0].format('YYYY-MM-DD');
        const endDate = dateRange[1].format('YYYY-MM-DD');
        query = query.gte('report_date', startDate).lte('report_date', endDate);
      }

      // 사용자 필터
      if (selectedUsers.length > 0) {
        query = query.in('user_id', selectedUsers);
      }

      // 보고서 타입 필터
      if (reportType !== 'all') {
        query = query.eq('report_type', reportType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('보고서 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (reports.length === 0) {
      return;
    }

    setLoading(true);
    try {
      // 기본 통계 계산
      const totalReports = reports.length;
      const uniqueUsers = new Set(reports.map(r => r.user_id));
      const userCount = uniqueUsers.size;

      // 타입별 보고서 수
      const reportsByType = reports.reduce((acc, report) => {
        acc[report.report_type] = (acc[report.report_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // 사용자별 보고서 수
      const reportsByUser = reports.reduce((acc, report) => {
        const userName = report.user_name_snapshot;
        acc[userName] = (acc[userName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // 키 인사이트 생성
      const keyInsights = generateKeyInsights(reports, reportsByType, reportsByUser);

      // AI 요약 생성
      const aiSummary = await generateAISummary(reports);

      const summary: SummaryData = {
        totalReports,
        userCount,
        reportsByType,
        reportsByUser,
        keyInsights,
        aiSummary
      };

      setSummaryData(summary);
      onSummaryGenerated?.(summary);
    } catch (error) {
      console.error('요약 생성 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateKeyInsights = (
    reports: DailyReport[], 
    reportsByType: Record<string, number>,
    reportsByUser: Record<string, number>
  ): string[] => {
    const insights: string[] = [];

    // 가장 활발한 사용자
    const mostActiveUser = Object.entries(reportsByUser)
      .sort(([,a], [,b]) => b - a)[0];
    if (mostActiveUser) {
      insights.push(`가장 활발한 사용자: ${mostActiveUser[0]} (${mostActiveUser[1]}개 보고서)`);
    }

    // 보고서 타입 분석
    const typeNames = {
      morning: '출근 보고서',
      evening: '퇴근 보고서',
      weekly: '주간 보고서'
    };
    const mostCommonType = Object.entries(reportsByType)
      .sort(([,a], [,b]) => b - a)[0];
    if (mostCommonType) {
      insights.push(`가장 많은 보고서 유형: ${typeNames[mostCommonType[0] as keyof typeof typeNames]} (${mostCommonType[1]}개)`);
    }

    // 최근 활동 분석
    const recentReports = reports.filter(r => {
      const reportDate = new Date(r.report_date);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      return reportDate >= threeDaysAgo;
    });
    insights.push(`최근 3일간 ${recentReports.length}개의 보고서가 작성되었습니다`);

    return insights;
  };

  const generateAISummary = async (reports: DailyReport[]): Promise<string> => {
    try {
      // 보고서 내용을 요약하기 위한 샘플 데이터 준비
      const sampleReports = reports.slice(0, 10).map(r => ({
        date: r.report_date,
        type: r.report_type,
        user: r.user_name_snapshot,
        content: r.report_content.substring(0, 200) // 처음 200자만
      }));

      const prompt = `
다음은 업무 보고서 데이터입니다. 이를 바탕으로 간결하고 유용한 요약을 한국어로 작성해주세요:

보고서 수: ${reports.length}개
기간: ${reports[reports.length - 1]?.report_date} ~ ${reports[0]?.report_date}

샘플 보고서:
${sampleReports.map(r => `- ${r.date} (${r.type}): ${r.user} - ${r.content}`).join('\n')}

다음 관점에서 요약해주세요:
1. 전반적인 업무 동향
2. 주요 프로젝트나 업무 패턴
3. 팀의 생산성 및 협업 상황
4. 개선점이나 주목할 점

요약은 3-4문단으로 작성해주세요.
      `;

      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });

      if (!response.ok) {
        throw new Error('AI 요약 생성 실패');
      }

      const data = await response.json();
      return data.content || '요약을 생성할 수 없습니다.';
    } catch (error) {
      console.error('AI 요약 생성 오류:', error);
      return '현재 AI 요약 기능을 사용할 수 없습니다. 수동으로 보고서를 검토해주세요.';
    }
  };

  return (
    <Card 
      title={<span style={{ color: isDarkMode ? '#fff' : '#000' }}>📊 보고서 요약 분석</span>}
      style={{ 
        marginBottom: 24,
        backgroundColor: isDarkMode ? '#1f1f1f' : '#fff',
        borderColor: isDarkMode ? '#434343' : '#d9d9d9'
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 필터 옵션 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Text strong style={{ color: isDarkMode ? '#fff' : '#000' }}>기간 선택:</Text>
            <RangePicker
              style={{ width: '100%', marginTop: 4 }}
              onChange={(dates) => setDateRange(dates)}
              placeholder={['시작일', '종료일']}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Text strong style={{ color: isDarkMode ? '#fff' : '#000' }}>사용자 선택:</Text>
            <Select
              mode="multiple"
              style={{ width: '100%', marginTop: 4 }}
              placeholder="사용자 선택 (전체)"
              value={selectedUsers}
              onChange={setSelectedUsers}
              allowClear
            >
              {availableUsers.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Text strong style={{ color: isDarkMode ? '#fff' : '#000' }}>보고서 유형:</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              value={reportType}
              onChange={setReportType}
            >
              <Option value="all">전체</Option>
              <Option value="morning">출근 보고서</Option>
              <Option value="evening">퇴근 보고서</Option>
              <Option value="weekly">주간 보고서</Option>
            </Select>
          </Col>
        </Row>

        {/* 액션 버튼 */}
        <Row gutter={[16, 16]}>
          <Col>
            <Button 
              type="primary" 
              icon={<BarChartOutlined />}
              onClick={fetchReports}
              loading={loading}
            >
              보고서 조회
            </Button>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<RobotOutlined />}
              onClick={generateSummary}
              loading={loading}
              disabled={reports.length === 0}
            >
              AI 요약 생성
            </Button>
          </Col>
        </Row>

        {/* 기본 통계 */}
        {reports.length > 0 && (
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Statistic
                title="총 보고서"
                value={reports.length}
                prefix={<FileTextOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="참여 사용자"
                value={new Set(reports.map(r => r.user_id)).size}
                prefix={<UserOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="기간"
                value={reports.length > 0 ? `${reports[reports.length - 1]?.report_date} ~ ${reports[0]?.report_date}` : '-'}
                prefix={<CalendarOutlined />}
              />
            </Col>
          </Row>
        )}

        {/* AI 요약 결과 */}
        {summaryData && (
          <Card 
            title={<span style={{ color: isDarkMode ? '#fff' : '#000' }}>🤖 AI 분석 결과</span>}
            type="inner"
            style={{
              backgroundColor: isDarkMode ? '#141414' : '#fafafa',
              borderColor: isDarkMode ? '#434343' : '#d9d9d9'
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* 키 인사이트 */}
              <div>
                <Title level={5}>📈 주요 인사이트</Title>
                {summaryData.keyInsights.map((insight, index) => (
                  <Tag key={index} color="blue" style={{ margin: '2px 4px 2px 0' }}>
                    {insight}
                  </Tag>
                ))}
              </div>

              <Divider />

              {/* AI 요약 */}
              <div>
                <Title level={5}>🧠 AI 종합 분석</Title>
                <Paragraph style={{ 
                  backgroundColor: isDarkMode ? '#262626' : '#f6f8fa', 
                  padding: 16, 
                  borderRadius: 8,
                  whiteSpace: 'pre-wrap',
                  color: isDarkMode ? '#fff' : '#000'
                }}>
                  {summaryData.aiSummary}
                </Paragraph>
              </div>

              {/* 상세 통계 */}
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Title level={5}>📊 보고서 유형별 분포</Title>
                  {Object.entries(summaryData.reportsByType).map(([type, count]) => (
                    <div key={type} style={{ marginBottom: 8 }}>
                      <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>
                        {type === 'morning' ? '출근' : type === 'evening' ? '퇴근' : '주간'}: 
                        <strong style={{ marginLeft: 8 }}>{count}개</strong>
                      </Text>
                    </div>
                  ))}
                </Col>
                <Col xs={24} sm={12}>
                  <Title level={5}>👥 사용자별 작성 현황</Title>
                  {Object.entries(summaryData.reportsByUser)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([user, count]) => (
                    <div key={user} style={{ marginBottom: 8 }}>
                      <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>
                        {user}: <strong>{count}개</strong>
                      </Text>
                    </div>
                  ))}
                </Col>
              </Row>
            </Space>
          </Card>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ color: isDarkMode ? '#999' : '#666' }}>분석 중...</Text>
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
}
