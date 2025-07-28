'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/app/components/ThemeProvider';
import { 
  Card, 
  Spin, 
  Typography, 
  Button, 
  Space, 
  Layout, 
  Switch, 
  Avatar, 
  Input, 
  Select, 
  DatePicker, 
  Row, 
  Col, 
  Modal, 
  App as AntApp, 
  Table,
  Tag,
  Popconfirm,
  Statistic,
  Tabs
} from 'antd';
import ReportSummary from '@/app/components/ReportSummary';
import AdminAIAssistant from '@/app/components/AdminAIAssistant';
import { 
  LogoutOutlined, 
  UserOutlined, 
  EditOutlined, 
  SunOutlined, 
  MoonOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  BarChartOutlined,
  TeamOutlined,
  FileTextOutlined,
  RobotOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
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

interface UserProfile {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    role?: string;
  };
  created_at: string;
  last_sign_in_at?: string;
}

interface AdminStats {
  totalUsers: number;
  totalReports: number;
  reportsToday: number;
  reportsThisWeek: number;
}

export default function AdminPage() {
  const { user, loading: authLoading, handleLogout } = useAuth();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const router = useRouter();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalReports: 0,
    reportsToday: 0,
    reportsThisWeek: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('ai-summary');

  const { message: messageApi } = AntApp.useApp();

  // 관리자 권한 확인 (최고 관리자 이메일만)
  const isAdmin = user?.email === 'jakeseol99@keduall.com';
  
  // 디버깅용 - 사용자 정보 출력
  useEffect(() => {
    if (user) {
      console.log('현재 사용자 정보:', {
        email: user.email,
        user_metadata: user.user_metadata,
        isAdmin: isAdmin
      });
    }
  }, [user, isAdmin]);

  const fetchData = useCallback(async () => {
    if (!user || !isAdmin) {
      console.log('fetchData 중단: user 또는 isAdmin 조건 불만족', { user: !!user, isAdmin });
      return;
    }
    
    console.log('관리자 데이터 로딩 시작...');
    setLoading(true);
    setError(null);
    
    try {
      console.log('1. 보고서 데이터 조회 시작...');
      // 모든 보고서 가져오기
      const { data: reportsData, error: reportsError } = await supabase
        .from('daily_reports')
        .select<'*', DailyReport>('*')
        .order('created_at', { ascending: false });
      
      if (reportsError) {
        console.error('보고서 조회 오류:', reportsError);
        throw new Error(`보고서 조회 실패: ${reportsError.message}`);
      }
      
      console.log('보고서 데이터 조회 성공:', reportsData?.length || 0, '개');
      setReports(reportsData || []);

      // 사용자 통계 계산
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const reportsToday = reportsData?.filter(r => r.report_date === today).length || 0;
      const reportsThisWeek = reportsData?.filter(r => r.report_date >= weekAgo).length || 0;

      console.log('2. 사용자 프로필 데이터 조회 시작...');
      
      // 먼저 user_profiles 테이블 시도
      let profilesData = null;
      let profilesError = null;
      
      try {
        const result = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        profilesData = result.data;
        profilesError = result.error;
      } catch (err) {
        console.log('user_profiles 테이블 접근 실패, 대체 방법 사용');
        profilesError = err;
      }

      if (profilesError || !profilesData) {
        console.error('사용자 프로필 조회 오류:', profilesError);
        console.log('보고서 데이터에서 사용자 정보를 추출합니다.');
        
        // 보고서 데이터에서 사용자 정보 추출
        const uniqueUsers = new Map();
        
        // 보고서에서 사용자 정보 추출
        reportsData?.forEach(report => {
          if (!uniqueUsers.has(report.user_id)) {
            uniqueUsers.set(report.user_id, {
              id: report.user_id,
              email: 'Unknown', // 보고서에서는 이메일 정보가 없음
              user_metadata: { 
                full_name: report.user_name_snapshot,
                role: 'user' // 기본값
              },
              created_at: report.created_at,
              last_sign_in_at: null
            });
          }
        });
        
        // 현재 로그인한 사용자 추가 (관리자)
        if (user && !uniqueUsers.has(user.id)) {
          uniqueUsers.set(user.id, {
            id: user.id,
            email: user.email || 'Unknown',
            user_metadata: {
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
              role: user.email === 'jakeseol99@keduall.com' ? 'admin' : 'user'
            },
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at
          });
        }
        
        const extractedUsers = Array.from(uniqueUsers.values());
        setUsers(extractedUsers);
        
        // 통계 업데이트
        setStats({
          totalUsers: extractedUsers.length,
          totalReports: reportsData?.length || 0,
          reportsToday,
          reportsThisWeek
        });
        
        console.log('보고서에서 추출한 사용자 수:', extractedUsers.length);
      } else {
        console.log('사용자 프로필 데이터 조회 성공:', profilesData?.length || 0, '개');
        
        // user_profiles 데이터를 UserProfile 형식으로 변환
        const formattedUsers = profilesData.map(profile => ({
          id: profile.id,
          email: profile.email,
          user_metadata: { 
            full_name: profile.full_name,
            role: profile.role 
          },
          created_at: profile.created_at,
          last_sign_in_at: undefined // user_profiles 테이블에는 없는 정보
        }));
        setUsers(formattedUsers);
        
        // 통계 업데이트 (실제 사용자 수 사용)
        setStats({
          totalUsers: profilesData?.length || 1,
          totalReports: reportsData?.length || 0,
          reportsToday,
          reportsThisWeek
        });
      }
      
      console.log('관리자 데이터 로딩 완료');

    } catch (err: unknown) {
      console.error('관리자 데이터 로딩 중 상세 오류:', err);
      
      let errorMessage = '데이터를 불러오는 중 오류가 발생했습니다.';
      
      if (err instanceof Error) {
        errorMessage = `오류: ${err.message}`;
        console.error('Error 객체:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        console.error('오류 객체 상세:', JSON.stringify(err, null, 2));
        errorMessage = `오류: ${JSON.stringify(err)}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, supabase]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (!authLoading && user && !isAdmin) {
      messageApi.error('관리자 권한이 필요합니다.');
      router.push('/');
      return;
    }
  }, [user, authLoading, isAdmin, router, messageApi]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin, fetchData]);

  const handleDeleteReport = async (reportId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('daily_reports')
        .delete()
        .eq('id', reportId);

      if (deleteError) throw deleteError;

      setReports(prevReports => prevReports.filter(report => report.id !== reportId));
      messageApi.success('보고서가 성공적으로 삭제되었습니다.');
    } catch (err: unknown) {
      let errorMessage = '보고서 삭제 중 오류가 발생했습니다.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error('보고서 삭제 오류:', err);
      messageApi.error(errorMessage);
    }
  };

  const showReportDetail = (report: DailyReport) => {
    setSelectedReport(report);
    setIsReportModalVisible(true);
  };

  const handleUpdateUserRole = async (userId: string, role: string) => {
    try {
      // user_profiles 테이블에서 직접 role 업데이트
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          role: role === 'admin' ? 'admin' : 'user',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // 사용자 목록 새로고침
      await fetchData();
      messageApi.success(`사용자 권한이 ${role === 'admin' ? '관리자로' : '일반 사용자로'} 변경되었습니다.`);
    } catch (err: unknown) {
      let errorMessage = '사용자 권한 변경 중 오류가 발생했습니다.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error('사용자 권한 변경 오류:', err);
      messageApi.error(errorMessage);
    }
  };

  const UserManagementTab = () => {
    const userColumns: ColumnsType<UserProfile> = [
      {
        title: '이메일',
        dataIndex: 'email',
        key: 'email',
        width: 250,
      },
      {
        title: '이름',
        key: 'full_name',
        render: (_, record) => (
          <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>
            {record.user_metadata?.full_name || '-'}
          </Text>
        ),
        width: 150,
      },
      {
        title: '권한',
        key: 'role',
        render: (_, record) => {
          const isUserAdmin = record.email === 'jakeseol99@keduall.com' || record.user_metadata?.role === 'admin';
          return (
            <Tag color={isUserAdmin ? 'red' : 'blue'}>
              {isUserAdmin ? '관리자' : '일반 사용자'}
            </Tag>
          );
        },
        width: 120,
      },
      {
        title: '가입일',
        dataIndex: 'created_at',
        key: 'created_at',
        render: (date: string) => new Date(date).toLocaleDateString('ko-KR'),
        width: 120,
      },
      {
        title: '최근 로그인',
        dataIndex: 'last_sign_in_at',
        key: 'last_sign_in_at',
        render: (date: string | null) => date ? new Date(date).toLocaleDateString('ko-KR') : '-',
        width: 120,
      },
      {
        title: '작업',
        key: 'actions',
        render: (_, record) => {
          const isUserAdmin = record.email === 'jakeseol99@keduall.com' || record.user_metadata?.role === 'admin';
          const isSuperAdmin = record.email === 'jakeseol99@keduall.com';
          
          return (
            <Space>
              {!isSuperAdmin && (
                <Button
                  type={isUserAdmin ? 'default' : 'primary'}
                  size="small"
                  onClick={() => handleUpdateUserRole(record.id, isUserAdmin ? 'user' : 'admin')}
                >
                  {isUserAdmin ? '관리자 해제' : '관리자 지정'}
                </Button>
              )}
              {isSuperAdmin && (
                <Tag color="gold">최고 관리자</Tag>
              )}
            </Space>
          );
        },
        width: 150,
      },
    ];

    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Text type="secondary" style={{ color: isDarkMode ? '#999' : '#666' }}>
              총 {users.length}명의 사용자가 등록되어 있습니다.
            </Text>
          </Col>
        </Row>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', color: 'red' }}>{error}</div>
        ) : (
          <Table
            columns={userColumns}
            dataSource={users}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} / 총 ${total}명`,
            }}
            scroll={{ x: 800 }}
          />
        )}
      </div>
    );
  };

  const filteredReports = reports.filter(report => {
    const searchTermMatch = report.report_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          report.user_name_snapshot.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          report.report_date.includes(searchTerm);
    
    const typeMatch = filterType === 'all' || report.report_type === filterType;
    const dateMatch = !filterDate || report.report_date === filterDate;

    return searchTermMatch && typeMatch && dateMatch;
  });

  const columns: ColumnsType<DailyReport> = [
    {
      title: '날짜',
      dataIndex: 'report_date',
      key: 'report_date',
      sorter: (a, b) => a.report_date.localeCompare(b.report_date),
      width: 120,
    },
    {
      title: '작성자',
      dataIndex: 'user_name_snapshot',
      key: 'user_name_snapshot',
      width: 120,
    },
    {
      title: '종류',
      dataIndex: 'report_type',
      key: 'report_type',
      render: (type: string) => (
        <Tag color={type === 'morning' ? 'blue' : type === 'evening' ? 'orange' : 'green'}>
          {type === 'morning' ? '출근' : type === 'evening' ? '퇴근' : '주간'}
        </Tag>
      ),
      width: 80,
    },
    {
      title: '내용 미리보기',
      dataIndex: 'report_content',
      key: 'report_content',
      render: (content: string) => (
        <Text 
          ellipsis={{ tooltip: true }} 
          style={{ 
            maxWidth: 300,
            color: isDarkMode ? '#fff' : '#000'
          }}
        >
          {content.substring(0, 100)}...
        </Text>
      ),
    },
    {
      title: '작성일시',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('ko-KR'),
      width: 150,
    },
    {
      title: '작업',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => showReportDetail(record)}
          />
          <Popconfirm
            title="이 보고서를 삭제하시겠습니까?"
            onConfirm={() => handleDeleteReport(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
      width: 100,
    },
  ];

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
          FunCommute Admin
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
            <Link href="/" passHref>
              <Button icon={<EditOutlined />}>메인으로</Button>
            </Link>
            <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
            <Text style={{ color: isDarkMode ? 'rgba(255,255,255,0.85)' : '#000' }}>
              {user.user_metadata?.full_name || user.email?.split('@')[0]} (관리자)
            </Text>
            <Button icon={<LogoutOutlined />} onClick={handleLogout} ghost={!isDarkMode}>
              로그아웃
            </Button>
          </>
        ) : (
          <Space>
            <Link href="/login" passHref><Button>로그인</Button></Link>
          </Space>
        )}
      </Space>
    </Header>
  );

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: isDarkMode ? '#001529' : '#f0f2f5' }}>
      <PageHeader />
      <Content style={{ padding: '24px 48px', transition: 'background-color 0.3s' }}>
        <div 
          style={{
            background: isDarkMode ? '#1f1f1f' : '#fff',
            padding: 24,
            borderRadius: 8,
            transition: 'background-color 0.3s',
            border: isDarkMode ? '1px solid #434343' : '1px solid #d9d9d9'
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Title level={2} style={{color: isDarkMode ? 'white' : 'black'}}>관리자 대시보드</Title>
            
            {/* 통계 카드 */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="총 사용자"
                    value={stats.totalUsers}
                    prefix={<TeamOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="총 보고서"
                    value={stats.totalReports}
                    prefix={<FileTextOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="오늘 보고서"
                    value={stats.reportsToday}
                    prefix={<BarChartOutlined />}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="이번 주 보고서"
                    value={stats.reportsThisWeek}
                    prefix={<BarChartOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 탭 메뉴 */}
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              items={[
                {
                  key: 'ai-summary',
                  label: (
                    <Space>
                      <RobotOutlined />
                      AI 분석
                    </Space>
                  ),
                  children: (
                    <Row gutter={[24, 24]} align="stretch">
                      <Col xs={24} lg={14}>
                        <ReportSummary />
                      </Col>
                      <Col xs={24} lg={10} style={{ display: 'flex' }}>
                        <AdminAIAssistant style={{ width: '100%' }} />
                      </Col>
                    </Row>
                  )
                },
                {
                  key: 'reports',
                  label: (
                    <Space>
                      <FileTextOutlined />
                      보고서 관리
                    </Space>
                  ),
                  children: (
                    <>
                      {/* 필터 */}
                      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} sm={12} md={8}>
                          <Input
                            placeholder="작성자, 내용 또는 날짜로 검색"
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
                            <Option value="weekly">주간 보고서</Option>
                          </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <DatePicker
                            onChange={(_date, dateString) => setFilterDate(typeof dateString === 'string' ? dateString : null)}
                            style={{ width: '100%' }}
                            placeholder="날짜 선택"
                          />
                        </Col>
                      </Row>

                      {/* 보고서 테이블 */}
                      {loading ? (
                         <div style={{ textAlign: 'center', padding: '50px 0' }}>
                           <Spin size="large" />
                         </div>
                      ) : error ? (
                        <div style={{ textAlign: 'center', color: 'red' }}>{error}</div>
                      ) : (
                        <Table
                          columns={columns}
                          dataSource={filteredReports}
                          rowKey="id"
                          pagination={{
                            pageSize: 20,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} / 총 ${total}개`,
                          }}
                          scroll={{ x: 800 }}
                        />
                      )}
                    </>
                  )
                },
                {
                  key: 'users',
                  label: (
                    <Space>
                      <TeamOutlined />
                      사용자 관리
                    </Space>
                  ),
                  children: <UserManagementTab />
                }
              ]}
            />
          </Space>
        </div>
      </Content>

      {/* 보고서 상세 모달 */}
      <Modal
        title={`보고서 상세 - ${selectedReport?.report_date} (${selectedReport?.user_name_snapshot})`}
        open={isReportModalVisible}
        onCancel={() => setIsReportModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsReportModalVisible(false)}>
            닫기
          </Button>
        ]}
        width={800}
      >
        {selectedReport && (
          <div>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong style={{ color: isDarkMode ? '#fff' : '#000' }}>종류: </Text>
                <Tag color={selectedReport.report_type === 'morning' ? 'blue' : selectedReport.report_type === 'evening' ? 'orange' : 'green'}>
                  {selectedReport.report_type === 'morning' ? '출근 보고서' : selectedReport.report_type === 'evening' ? '퇴근 보고서' : '주간 보고서'}
                </Tag>
              </div>
              <div>
                <Text strong style={{ color: isDarkMode ? '#fff' : '#000' }}>작성일시: </Text>
                <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>
                  {new Date(selectedReport.created_at).toLocaleString('ko-KR')}
                </Text>
              </div>
              <div>
                <Text strong style={{ color: isDarkMode ? '#fff' : '#000' }}>내용:</Text>
                <div style={{ 
                  marginTop: 8, 
                  padding: 16, 
                  border: '1px solid #d9d9d9', 
                  borderRadius: 6,
                  backgroundColor: isDarkMode ? '#1f1f1f' : '#fafafa',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 400,
                  overflow: 'auto'
                }}>
                  {selectedReport.report_content}
                </div>
              </div>
            </Space>
          </div>
        )}
      </Modal>
    </Layout>
  );
}