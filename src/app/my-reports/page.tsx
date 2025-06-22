'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Card, List, Spin, Typography, Button, Space, Layout, Switch, Avatar, Input, Select, DatePicker, Row, Col, Modal, App as AntApp, Form } from 'antd';
import { LogoutOutlined, UserOutlined, EditOutlined, SunOutlined, MoonOutlined, DeleteOutlined, DownOutlined, UpOutlined, PlusOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

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

interface ManualReportFormValues {
  report_date: Dayjs;
  report_type: string;
  report_content: string;
}

export default function MyReportsPage() {
  const { user, loading: authLoading, handleLogout } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isSubmittingManualReport, setIsSubmittingManualReport] = useState(false);
  const [manualReportForm] = Form.useForm<ManualReportFormValues>();

  const { message: messageApi, modal } = AntApp.useApp();

  const fetchReports = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('daily_reports')
        .select<'*', DailyReport>('*')
        .eq('user_id', user.id)
        .order('report_date', { ascending: false });
      if (dbError) throw dbError;
      setReports(data || []);
    } catch (err: unknown) {
      let errorMessage = '보고서를 불러오는 중 오류가 발생했습니다.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: string }).message === 'string') {
        errorMessage = (err as { message: string }).message;
      }
      console.error('보고서 로딩 오류:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filteredReports = reports.filter(report => {
    const searchTermMatch = report.report_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          report.report_date.includes(searchTerm);
    
    const typeMatch = filterType === 'all' || report.report_type === filterType;
    
    const dateMatch = !filterDate || report.report_date === filterDate;

    return searchTermMatch && typeMatch && dateMatch;
  });

  const handleDeleteReport = async (reportId: string) => {
    if (!user) return;
    try {
      const { error: deleteError } = await supabase
        .from('daily_reports')
        .delete()
        .eq('id', reportId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setReports(prevReports => prevReports.filter(report => report.id !== reportId));
      messageApi.success('보고서가 성공적으로 삭제되었습니다.');
    } catch (err: unknown) {
      let errorMessage = '보고서 삭제 중 오류가 발생했습니다.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: string }).message === 'string') {
        errorMessage = (err as { message: string }).message;
      }
      console.error('보고서 삭제 오류:', err);
      messageApi.error(errorMessage);
    }
  };

  const showDeleteConfirm = (reportId: string, reportDate: string) => {
    modal.confirm({
      title: `'${reportDate}' 보고서를 삭제하시겠습니까?`,
      content: '삭제된 보고서는 복구할 수 없습니다.',
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk() {
        handleDeleteReport(reportId);
      },
      onCancel() {
        // console.log('삭제 취소');
      },
    });
  };

  const MAX_LINES = 3;
  const LINE_HEIGHT = 1.5;
  const MAX_HEIGHT_THRESHOLD = `${MAX_LINES * LINE_HEIGHT}em`;

  if (authLoading || (loading && !reports.length && !error)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)', textAlign: 'center' }}>
        <Spin size="large">
          <div style={{ padding: '50px', border: '1px solid transparent' }} />
        </Spin>
      </div>
    );
  }

  const PageHeader = () => (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        width: '100%',
        backgroundColor: '#fff',
        borderBottom: '1px solid #f0f0f0',
        padding: '0 24px',
      }}
    >
      <Link href="/" passHref>
        <Title level={3} style={{ margin: 0, color: '#000' }}>
          FunCommute
        </Title>
      </Link>
      <Space align="center" size="middle">
        <Switch
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
          checked={false}
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          onChange={(_checked) => {
            // This is a placeholder for the theme switch.
            // The actual implementation should be handled by the ThemeProvider.
          }}
        />
        {user ? (
          <>
            <Link href="/" passHref>
              <Button icon={<EditOutlined />}>새 보고서 작성</Button>
            </Link>
            <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
            <Text style={{ color: '#000' }}>
              {user.user_metadata?.full_name || user.email?.split('@')[0]}
            </Text>
            <Button icon={<LogoutOutlined />} onClick={handleLogout} ghost>
              로그아웃
            </Button>
          </>
        ) : (
          <Space>
            <Link href="/login" passHref><Button>로그인</Button></Link>
            <Link href="/signup" passHref><Button type="primary">회원가입</Button></Link>
          </Space>
        )}
      </Space>
    </Header>
  );

  const handleManualAddReport = async (values: ManualReportFormValues) => {
    if (!user) {
      messageApi.error('로그인이 필요합니다.');
      return;
    }
    setIsSubmittingManualReport(true);
    try {
      const reportDate = values.report_date.format('YYYY-MM-DD');
      const newReport = {
        user_id: user.id,
        report_date: reportDate,
        report_type: values.report_type,
        user_name_snapshot: user.user_metadata?.full_name || user.email?.split('@')[0] || '익명',
        report_content: values.report_content,
        projects_data: null,
        misc_tasks_data: null,
      };

      const { error: insertError } = await supabase.from('daily_reports').insert([newReport]);
      if (insertError) throw insertError;

      messageApi.success('과거 보고서가 성공적으로 추가되었습니다.');
      setIsAddModalVisible(false);
      manualReportForm.resetFields();
      await fetchReports();
    } catch (err: unknown) {
      let errorMessage = '과거 보고서 추가 중 오류가 발생했습니다.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: string }).message === 'string') {
        errorMessage = (err as { message: string }).message;
      }
      console.error('과거 보고서 추가 오류:', err);
      messageApi.error(errorMessage);
    } finally {
      setIsSubmittingManualReport(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <PageHeader />
      <Content style={{ padding: '24px', paddingTop: '88px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ color: '#000', margin: 0 }}>내 보고서 목록</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setIsAddModalVisible(true)}
          >
            과거 보고서 추가
          </Button>
        </div>
        
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input.Search
              placeholder="보고서 내용, 날짜 검색"
              allowClear
              onSearch={setSearchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
              value={searchTerm}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Select
              value={filterType}
              onChange={setFilterType}
              style={{ width: '100%' }}
            >
              <Option value="all">모든 종류</Option>
              <Option value="daily">일일 보고서</Option>
              <Option value="weekly">주간 보고서</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <DatePicker 
              placeholder="날짜 선택 (YYYY-MM-DD)"
              onChange={(date, dateString) => {
                const singleDateString = Array.isArray(dateString) ? dateString[0] : dateString;
                if (singleDateString && /^\d{4}-\d{2}-\d{2}$/.test(singleDateString)) {
                  setFilterDate(singleDateString);
                } else if (!singleDateString) {
                  setFilterDate(null);
                }
              }}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
            />
          </Col>
        </Row>

        {error && <Text type="danger" style={{ marginBottom: '16px', display: 'block' }}>오류: {error}</Text>}
        {!loading && !filteredReports.length && !error && (
          <Text style={{ color: 'rgba(0,0,0,0.65)', display: 'block', textAlign: 'center', fontSize: '16px' }}>
            {searchTerm || filterType !== 'all' || filterDate ? '검색/필터 결과가 없습니다.' : '작성된 보고서가 없습니다. "새 보고서 작성" 버튼을 눌러 첫 보고서를 작성해보세요!'}
          </Text>
        )}
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 4 }}
          dataSource={filteredReports}
          renderItem={(report) => {
            const isExpanded = expandedReportId === report.id;
            const needsExpansionToggle = report.report_content && report.report_content.length > 100;

            return (
              <List.Item>
                <Card
                  title={`${report.report_date} (${report.report_type})`}
                  hoverable
                  style={{ backgroundColor: '#fff', borderColor: '#f0f0f0' }}
                  styles={{
                    header: {
                      color: 'rgba(0,0,0,0.85)',
                      borderColor: '#f0f0f0',
                    },
                    body: {
                      color: 'rgba(0,0,0,0.65)',
                      position: 'relative',
                    },
                  }}
                  actions={[
                    <Button 
                      key="delete" 
                      icon={<DeleteOutlined />} 
                      onClick={() => showDeleteConfirm(report.id, report.report_date)}
                      danger 
                      type="text"
                    />
                  ]}
                >
                  <div 
                    style={{
                      maxHeight: isExpanded ? 'none' : MAX_HEIGHT_THRESHOLD,
                      overflow: 'hidden',
                      position: 'relative',
                      lineHeight: `${LINE_HEIGHT}em`,
                      opacity: isExpanded && needsExpansionToggle ? 0.85 : 1, 
                    }}
                  >
                    <Paragraph style={{ marginBottom: needsExpansionToggle ? '1em' : 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {report.report_content || '내용 없음'}
                    </Paragraph>
                    {!isExpanded && needsExpansionToggle && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '1.5em',
                          background: 'linear-gradient(to bottom, transparent, #fff)',
                        }}
                      />
                    )}
                  </div>
                  {needsExpansionToggle && (
                    <Button 
                      type="link" 
                      onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                      icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                      style={{ paddingLeft: 0, marginTop: '8px' }}
                    >
                      {isExpanded ? '접기' : '더보기'}
                    </Button>
                  )}
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '10px' }}>
                    작성자: {report.user_name_snapshot || '정보 없음'} <br/>
                    생성일: {new Date(report.created_at).toLocaleString()}
                  </Text>
                </Card>
              </List.Item>
            );
          }}
        />

        <Modal
          title="과거 보고서 수동 추가"
          open={isAddModalVisible}
          onCancel={() => {
            setIsAddModalVisible(false);
            manualReportForm.resetFields();
          }}
          footer={[
            <Button key="back" onClick={() => {
              setIsAddModalVisible(false);
              manualReportForm.resetFields();
            }}>
              취소
            </Button>,
            <Button 
              key="submit" 
              type="primary" 
              loading={isSubmittingManualReport} 
              onClick={() => manualReportForm.submit()}
            >
              저장
            </Button>,
          ]}
        >
          <Form
            form={manualReportForm}
            layout="vertical"
            onFinish={handleManualAddReport}
            name="manual_report_form"
          >
            <Form.Item
              name="report_date"
              label="보고서 날짜"
              rules={[{ required: true, message: '보고서 날짜를 선택해주세요!' }]}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item
              name="report_type"
              label="보고서 종류"
              rules={[{ required: true, message: '보고서 종류를 선택해주세요!' }]}
            >
              <Select placeholder="보고서 종류 선택">
                <Option value="daily">일일 보고서</Option>
                <Option value="weekly">주간 보고서</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="report_content"
              label="보고서 내용"
              rules={[{ required: true, message: '보고서 내용을 입력해주세요!' }]}
            >
              <Input.TextArea rows={6} placeholder="여기에 과거 보고서 내용을 입력하세요..." />
            </Form.Item>
          </Form>
        </Modal>

      </Content>
    </Layout>
  );
} 