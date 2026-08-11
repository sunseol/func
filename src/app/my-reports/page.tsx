'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/app/components/ThemeProvider';
import { useNotification } from '@/contexts/NotificationContext';
import { Alert, List, Spin, Typography, Button, Space, Layout, Switch, Avatar, Input, Select, DatePicker, Row, Col, Modal, App as AntApp, Form } from 'antd';
import { LogoutOutlined, UserOutlined, EditOutlined, SunOutlined, MoonOutlined, DeleteOutlined, DownOutlined, UpOutlined, PlusOutlined, CopyOutlined, BellOutlined } from '@ant-design/icons';

import type { Dayjs } from 'dayjs';

const { Content } = Layout;
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
  const { user, loading: authLoading, initialized, signOut } = useAuth();
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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { modal } = AntApp.useApp();
  const showSuccess = useCallback((message: string) => setFeedback({ type: 'success', message }), []);
  const showError = useCallback((message: string) => setFeedback({ type: 'error', message }), []);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: dataRaw, error: dbError } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('report_date', { ascending: false });
      if (dbError) throw dbError;
      const data = (dataRaw || []) as DailyReport[];
      setReports(data);
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
      const { data: deletedReports, error: deleteError } = await supabase
        .from('daily_reports')
        .delete()
        .eq('id', reportId)
        .eq('user_id', user.id)
        .select('id');

      if (deleteError) throw deleteError;
      if (!deletedReports || deletedReports.length !== 1) {
        throw new Error('삭제할 수 있는 소유 보고서를 찾을 수 없습니다.');
      }

      setReports(prevReports => prevReports.filter(report => report.id !== reportId));
      showSuccess('보고서가 성공적으로 삭제되었습니다.');
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
      showError(errorMessage);
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
        return handleDeleteReport(reportId);
      },
      onCancel() {
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
            aria-label="보고서 편집"
            style={{ minWidth: 44, minHeight: 44 }}
          />,
          <Button
            key="copy"
            type="text"
            icon={<CopyOutlined />}
            onClick={() => handleCopyReport(item)}
            title="보고서 복사"
            aria-label="보고서 복사"
            style={{ minWidth: 44, minHeight: 44 }}
          />,
          <Button
            key="delete"
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => showDeleteConfirm(item.id, item.report_date)}
            title="보고서 삭제"
            aria-label="보고서 삭제"
            style={{ minWidth: 44, minHeight: 44 }}
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
            style={{ minHeight: 44, paddingInline: 8 }}
          >
            {expandedReportId === item.id ? '접기' : '더보기'}
          </Button>
        )}
      </List.Item>
    );
  };

  if ((authLoading && !initialized) || (loading && !reports.length && !error)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)', textAlign: 'center' }}>
        <Spin size="large">
          <div style={{ padding: '50px', border: '1px solid transparent' }} />
        </Spin>
      </div>
    );
  }

  // 전역 헤더 사용으로 페이지 로컬 헤더 제거

  const handleEditReport = (report: DailyReport) => {
    setEditingReport(report);
    setEditingReportId(report.id);
    setIsEditModalVisible(true);
  };

  const handleSaveEditedReport = async (editedContent: string) => {
    if (!editingReport || !user) {
      showError('편집할 보고서 정보가 없습니다.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const { data: updatedReport, error: updateError } = await supabase
        .from('daily_reports')
        .update({
          report_content: editedContent,
        })
        .eq('id', editingReport.id)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (updateError) throw updateError;
      if (!updatedReport) {
        throw new Error('수정할 수 있는 소유 보고서를 찾을 수 없습니다.');
      }

      // 로컬 상태 업데이트
      setReports(prevReports =>
        prevReports.map(report =>
          report.id === editingReport.id
            ? { ...report, ...(updatedReport as DailyReport) }
            : report
        )
      );

      showSuccess('보고서가 성공적으로 수정되었습니다.');
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
      showError(errorMessage);
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
      showError('로그인이 필요하거나 복사할 보고서 정보가 없습니다.');
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

      const { data: copiedReport, error: insertError } = await supabase
        .from('daily_reports')
        .insert(newReport)
        .select('*')
        .single();
      if (insertError) throw insertError;
      if (!copiedReport) {
        throw new Error('복사된 보고서를 저장하지 못했습니다.');
      }

      showSuccess('보고서가 성공적으로 복사되었습니다.');
      setIsCopyModalVisible(false);
      setCopyingReport(null);
      copyReportForm.resetFields();
      setReports(prevReports => [...prevReports, copiedReport as DailyReport].sort((left, right) => right.report_date.localeCompare(left.report_date)));
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
      showError(errorMessage);
    } finally {
      setIsSavingCopy(false);
    }
  };

  const handleManualAddReport = async (values: ManualReportFormValues) => {
    if (!user) {
      showError('로그인이 필요합니다.');
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

      const { data: addedReport, error: insertError } = await supabase
        .from('daily_reports')
        .insert(newReport)
        .select('*')
        .single();
      if (insertError) throw insertError;
      if (!addedReport) {
        throw new Error('과거 보고서를 저장하지 못했습니다.');
      }

      showSuccess('과거 보고서가 성공적으로 추가되었습니다.');
      setIsAddModalVisible(false);
      manualReportForm.resetFields();
      setReports(prevReports => [...prevReports, addedReport as DailyReport].sort((left, right) => right.report_date.localeCompare(left.report_date)));
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
      showError(errorMessage);
    } finally {
      setIsSubmittingManualReport(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: isDarkMode ? '#001529' : '#f0f2f5' }}>
      <Content className="px-3 sm:px-6 md:px-12 py-6" style={{ transition: 'background-color 0.3s' }}>
        <div className="rounded-lg" style={{ background: isDarkMode ? '#141414' : '#fff', padding: 12, transition: 'background-color 0.3s' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Title level={2} style={{color: isDarkMode ? 'white' : 'black'}}>내 보고서 목록</Title>
            {feedback && (
              <Alert
                role="alert"
                type={feedback.type}
                message={feedback.message}
                showIcon
                closable
                onClose={() => setFeedback(null)}
              />
            )}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} md={8}>
                <Input
                  className="my-reports-search-input"
                  placeholder="내용 또는 날짜으로 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  aria-label="보고서 유형 필터"
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
                  format="YYYY-MM-DD"
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
                  style={{ width: '100%', minHeight: 44 }}
                >
                  수동 추가
                </Button>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                    setFilterDate(null);
                  }}
                  style={{ width: '100%', minHeight: 44 }}
                >
                  초기화
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
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.target instanceof HTMLElement && event.target.closest('.ant-picker')) {
              event.preventDefault();
            }
          }}
          initialValues={{ report_type: 'morning' }}
        >
          <Form.Item
            name="report_date"
            label="보고 날짜"
            rules={[{ required: true, message: '날짜를 선택해주세요.' }]}
          >
            <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="report_type"
            label="보고 종류"
            rules={[{ required: true, message: '보고 종류를 선택해주세요.' }]}
          >
            <Select aria-label="수동 보고서 종류">
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
            <Button onClick={() => setIsAddModalVisible(false)} className="touch-target-44" style={{ marginRight: 8 }}>
              취소
            </Button>
            <Button type="primary" htmlType="submit" loading={isSubmittingManualReport} className="touch-target-44">
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
        destroyOnHidden
      >
        {editingReport && (
          <Form
            layout="vertical"
            initialValues={{ content: editingReport.report_content }}
            onFinish={(values) => handleSaveEditedReport(values.content)}
            style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}
          >
            <Form.Item
              name="content"
              style={{ flex: 1 }}
              rules={[{ required: true, message: '내용을 입력해주세요.' }]}
            >
              <Input.TextArea
                style={{ height: '100%', minHeight: '400px', resize: 'none' }}
              />
            </Form.Item>
            <Form.Item style={{ textAlign: 'right', marginTop: '16px' }}>
              <Button
                htmlType="submit"
                type="primary"
                loading={isSavingEdit}
                className="touch-target-44"
              >
                저장
              </Button>
            </Form.Item>
          </Form>
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
        destroyOnHidden
      >
        <Form
          form={copyReportForm}
          layout="vertical"
          onFinish={handleSaveCopiedReport}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.target instanceof HTMLElement && event.target.closest('.ant-picker')) {
              event.preventDefault();
            }
          }}
        >
          <Form.Item
            name="report_date"
            label="새 보고서 날짜"
            rules={[{ required: true, message: '날짜를 선택해주세요.' }]}
          >
            <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} placeholder="복사할 날짜를 선택하세요" />
          </Form.Item>
          <Form.Item
            name="report_type"
            label="보고 종류"
            rules={[{ required: true, message: '보고 종류를 선택해주세요.' }]}
          >
            <Select aria-label="복사 보고서 종류">
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
              className="touch-target-44"
              style={{ marginRight: 8 }}
            >
              취소
            </Button>
            <Button type="primary" htmlType="submit" loading={isSavingCopy} className="touch-target-44">
              {isSavingCopy ? '복사 중...' : '복사하여 저장'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
} 
