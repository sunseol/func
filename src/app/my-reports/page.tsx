'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/app/components/ThemeProvider';
import { useNotification } from '@/context/NotificationContext';
import { List, Spin, Typography, Button, Space, Layout, Switch, Avatar, Input, Select, DatePicker, Row, Col, Modal, App as AntApp, Form } from 'antd';
import { LogoutOutlined, UserOutlined, EditOutlined, SunOutlined, MoonOutlined, DeleteOutlined, DownOutlined, UpOutlined, PlusOutlined, CopyOutlined, BellOutlined } from '@ant-design/icons';
import RichEditor from '@/app/components/RichEditor';
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
  const { isDarkMode, setIsDarkMode } = useTheme();
  const { unreadCount } = useNotification();
  const router = useRouter();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isSubmittingManualReport, setIsSubmittingManualReport] = useState(false);
  const [manualReportForm] = Form.useForm<ManualReportFormValues>();

  // 편집 관련 상태
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // 복사 관련 상태
  const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);
  const [copyingReport, setCopyingReport] = useState<DailyReport | null>(null);
  const [isSavingCopy, setIsSavingCopy] = useState(false);
  const [copyReportForm] = Form.useForm<ManualReportFormValues>();

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
  }, [user, supabase]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user, fetchReports]);

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

  // ReportItem 컴포넌트
  const ReportItem = ({ 
    item, 
    isDarkMode, 
    expandedReportId, 
    setExpandedReportId, 
    showDeleteConfirm, 
    handleEditReport,
    handleCopyReport,
    MAX_HEIGHT_THRESHOLD, 
    LINE_HEIGHT 
  }: {
    item: DailyReport;
    isDarkMode: boolean;
    expandedReportId: string | null;
    setExpandedReportId: (id: string | null) => void;
    showDeleteConfirm: (id: string, date: string) => void;
    handleEditReport: (report: DailyReport) => void;
    handleCopyReport: (report: DailyReport) => void;
    MAX_HEIGHT_THRESHOLD: string;
    LINE_HEIGHT: number;
  }) => {
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
      if (contentRef.current) {
        const el = contentRef.current;
        if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
          setIsOverflowing(true);
        } else {
          setIsOverflowing(false);
        }
      }
    }, [item.report_content]);

    return (
      <List.Item
        key={item.id}
        actions={[
          <Button
            key="edit"
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditReport(item)}
            title="보고서 편집"
          />,
          <Button
            key="copy"
            type="text"
            icon={<CopyOutlined />}
            onClick={() => handleCopyReport(item)}
            title="보고서 복사"
          />,
          <Button
            key="delete"
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => showDeleteConfirm(item.id, item.report_date)}
            title="보고서 삭제"
          />,
        ]}
        style={{
          background: isDarkMode ? '#1d1d1d' : '#fafafa',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}
      >
        <List.Item.Meta
          title={<Text style={{color: isDarkMode ? 'white' : 'black'}}>{`${item.report_date} - ${item.report_type === 'morning' ? '☀️ 출근' : '🌙 퇴근'} 보고서`}</Text>}
          description={<Text type="secondary">{`작성자: ${item.user_name_snapshot}`}</Text>}
        />

        <Paragraph
          ref={contentRef}
          style={{
            maxHeight: expandedReportId === item.id ? 'none' : MAX_HEIGHT_THRESHOLD,
            overflow: 'hidden',
            lineHeight: LINE_HEIGHT,
            position: 'relative',
            color: isDarkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
            whiteSpace: 'pre-wrap'
          }}
        >
          {item.report_content}
        </Paragraph>
        {isOverflowing && (
          <Button
            type="link"
            icon={expandedReportId === item.id ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setExpandedReportId(expandedReportId === item.id ? null : item.id)}
            style={{ padding: 0, height: 'auto' }}
          >
            {expandedReportId === item.id ? '접기' : '더보기'}
          </Button>
        )}
      </List.Item>
    );
  };

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
        backgroundColor: isDarkMode ? '#001529' : '#fff',
        borderBottom: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
        padding: '0 24px',
        transition: 'background-color 0.3s, border-color 0.3s',
      }}
    >
      <Link href="/" passHref>
        <Title level={3} style={{ margin: 0, color: isDarkMode ? '#fff' : '#000' }}>
          FunCommute
        </Title>
      </Link>
      <Space align="center" size="middle">
        <Switch
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
          checked={isDarkMode}
          onChange={setIsDarkMode}
        />
        {user ? (
          <>
            <Link href="/ai-pm" passHref>
              <Button icon={<EditOutlined />}>🤖 AI PM</Button>
            </Link>
            <Link href="/" passHref>
              <Button icon={<EditOutlined />}>새 보고서 작성</Button>
            </Link>
            <Link href="/notifications">
              <Button 
                type="text" 
                style={{ color: isDarkMode ? 'rgba(255,255,255,0.85)' : '#000', position: 'relative' }}
                icon={<BellOutlined />}
              >
                알림
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      backgroundColor: '#ff4d4f',
                      color: 'white',
                      borderRadius: '50%',
                      width: 16,
                      height: 16,
                      fontSize: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
            <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
            <Text style={{ color: isDarkMode ? 'rgba(255,255,255,0.85)' : '#000' }}>
              {user.user_metadata?.full_name || user.email?.split('@')[0]}
            </Text>
            <Button icon={<LogoutOutlined />} onClick={handleLogout} ghost={!isDarkMode}>
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

  const handleEditReport = (report: DailyReport) => {
    setEditingReport(report);
    setEditingReportId(report.id);
    setIsEditModalVisible(true);
  };

  const handleSaveEditedReport = async (editedContent: string) => {
    if (!editingReport || !user) {
      messageApi.error('편집할 보고서 정보가 없습니다.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const { error: updateError } = await supabase
        .from('daily_reports')
        .update({
          report_content: editedContent,
        })
        .eq('id', editingReport.id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // 로컬 상태 업데이트
      setReports(prevReports =>
        prevReports.map(report =>
          report.id === editingReport.id
            ? { ...report, report_content: editedContent }
            : report
        )
      );

      messageApi.success('보고서가 성공적으로 수정되었습니다.');
      setIsEditModalVisible(false);
      setEditingReport(null);
      setEditingReportId(null);
    } catch (err: unknown) {
      let errorMessage = '보고서 수정 중 오류가 발생했습니다.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: string }).message === 'string') {
        errorMessage = (err as { message: string }).message;
      }
      console.error('보고서 수정 오류:', err);
      messageApi.error(errorMessage);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCopyReport = (report: DailyReport) => {
    setCopyingReport(report);
    setIsCopyModalVisible(true);
    // 폼에 기본값 설정 (오늘 날짜, 같은 타입, 같은 내용)
    copyReportForm.setFieldsValue({
      report_date: undefined, // 사용자가 직접 선택하도록
      report_type: report.report_type,
      report_content: report.report_content,
    });
  };

  const handleSaveCopiedReport = async (values: ManualReportFormValues) => {
    if (!user || !copyingReport) {
      messageApi.error('로그인이 필요하거나 복사할 보고서 정보가 없습니다.');
      return;
    }
    setIsSavingCopy(true);
    try {
      const reportDate = values.report_date.format('YYYY-MM-DD');
      const newReport = {
        user_id: user.id,
        report_date: reportDate,
        report_type: values.report_type,
        user_name_snapshot: user.user_metadata?.full_name || user.email?.split('@')[0] || '익명',
        report_content: values.report_content,
        projects_data: copyingReport.projects_data,
        misc_tasks_data: copyingReport.misc_tasks_data,
      };

      const { error: insertError } = await supabase.from('daily_reports').insert([newReport]);
      if (insertError) throw insertError;

      messageApi.success('보고서가 성공적으로 복사되었습니다.');
      setIsCopyModalVisible(false);
      setCopyingReport(null);
      copyReportForm.resetFields();
      await fetchReports();
    } catch (err: unknown) {
      let errorMessage = '보고서 복사 중 오류가 발생했습니다.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: string }).message === 'string') {
        errorMessage = (err as { message: string }).message;
      }
      console.error('보고서 복사 오류:', err);
      messageApi.error(errorMessage);
    } finally {
      setIsSavingCopy(false);
    }
  };

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
    <Layout style={{ minHeight: '100vh', backgroundColor: isDarkMode ? '#001529' : '#f0f2f5' }}>
      <PageHeader />
      <Content style={{ padding: '24px 48px', transition: 'background-color 0.3s' }}>
        <div 
          style={{
            background: isDarkMode ? '#141414' : '#fff',
            padding: 24,
            borderRadius: 8,
            transition: 'background-color 0.3s'
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Title level={2} style={{color: isDarkMode ? 'white' : 'black'}}>내 보고서 목록</Title>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} md={8}>
                <Input
                  placeholder="내용 또는 날짜으로 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  value={filterType}
                  onChange={setFilterType}
                  style={{ width: '100%' }}
                >
                  <Option value="all">모든 종류</Option>
                  <Option value="morning">출근 보고서</Option>
                  <Option value="evening">퇴근 보고서</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <DatePicker
                  onChange={(_date, dateString) => setFilterDate(typeof dateString === 'string' ? dateString : null)}
                  style={{ width: '100%' }}
                  placeholder="날짜 선택"
                />
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsAddModalVisible(true)}
                  style={{ width: '100%' }}
                >
                  수동 추가
                </Button>
              </Col>
            </Row>

            {loading ? (
               <div style={{ textAlign: 'center', padding: '50px 0' }}>
                 <Spin size="large" />
               </div>
            ) : error ? (
              <div style={{ textAlign: 'center', color: 'red' }}>{error}</div>
            ) : (
              <List
                itemLayout="vertical"
                size="large"
                dataSource={filteredReports}
                renderItem={item => (
                  <ReportItem 
                    key={item.id}
                    item={item}
                    isDarkMode={isDarkMode}
                    expandedReportId={expandedReportId}
                    setExpandedReportId={setExpandedReportId}
                    showDeleteConfirm={showDeleteConfirm}
                    handleEditReport={handleEditReport}
                    handleCopyReport={handleCopyReport}
                    MAX_HEIGHT_THRESHOLD={MAX_HEIGHT_THRESHOLD}
                    LINE_HEIGHT={LINE_HEIGHT}
                  />
                )}
              />
            )}
          </Space>
        </div>
      </Content>
      <Modal
        title="과거 보고서 수동 추가"
        open={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={manualReportForm}
          layout="vertical"
          onFinish={handleManualAddReport}
          initialValues={{ report_type: 'morning' }}
        >
          <Form.Item
            name="report_date"
            label="보고 날짜"
            rules={[{ required: true, message: '날짜를 선택해주세요.' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="report_type"
            label="보고 종류"
            rules={[{ required: true, message: '보고 종류를 선택해주세요.' }]}
          >
            <Select>
              <Option value="morning">출근 보고서</Option>
              <Option value="evening">퇴근 보고서</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="report_content"
            label="보고 내용"
            rules={[{ required: true, message: '내용을 입력해주세요.' }]}
          >
            <Input.TextArea rows={10} />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button onClick={() => setIsAddModalVisible(false)} style={{ marginRight: 8 }}>
              취소
            </Button>
            <Button type="primary" htmlType="submit" loading={isSubmittingManualReport}>
              {isSubmittingManualReport ? '저장 중...' : '저장'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 보고서 편집 모달 */}
      <Modal
        title={`보고서 편집 - ${editingReport?.report_date} (${editingReport?.report_type === 'morning' ? '출근' : '퇴근'})`}
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setEditingReport(null);
          setEditingReportId(null);
        }}
        footer={null}
        width="90%"
        style={{ maxWidth: '1200px' }}
        destroyOnClose
      >
        {editingReport && (
          <div style={{ minHeight: '500px' }}>
            <RichEditor
              initialContent={editingReport.report_content}
              onSave={handleSaveEditedReport}
              isSaving={isSavingEdit}
              saveActionDisabled={false}
              title={`${editingReport.report_date} - ${editingReport.report_type === 'morning' ? '☀️ 출근' : '🌙 퇴근'} 보고서 편집`}
            />
          </div>
        )}
      </Modal>

      {/* 보고서 복사 모달 */}
      <Modal
        title={`보고서 복사 - ${copyingReport?.report_date} (${copyingReport?.report_type === 'morning' ? '출근' : '퇴근'})`}
        open={isCopyModalVisible}
        onCancel={() => {
          setIsCopyModalVisible(false);
          setCopyingReport(null);
          copyReportForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={copyReportForm}
          layout="vertical"
          onFinish={handleSaveCopiedReport}
        >
          <Form.Item
            name="report_date"
            label="새 보고서 날짜"
            rules={[{ required: true, message: '날짜를 선택해주세요.' }]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="복사할 날짜를 선택하세요" />
          </Form.Item>
          <Form.Item
            name="report_type"
            label="보고 종류"
            rules={[{ required: true, message: '보고 종류를 선택해주세요.' }]}
          >
            <Select>
              <Option value="morning">출근 보고서</Option>
              <Option value="evening">퇴근 보고서</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="report_content"
            label="보고 내용"
            rules={[{ required: true, message: '내용을 입력해주세요.' }]}
          >
            <Input.TextArea rows={12} placeholder="복사된 내용을 수정할 수 있습니다" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button 
              onClick={() => {
                setIsCopyModalVisible(false);
                setCopyingReport(null);
                copyReportForm.resetFields();
              }} 
              style={{ marginRight: 8 }}
            >
              취소
            </Button>
            <Button type="primary" htmlType="submit" loading={isSavingCopy}>
              {isSavingCopy ? '복사 중...' : '복사하여 저장'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
} 