'use client';

import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Space, Popconfirm, Typography, Modal, Spin, Alert, Checkbox, List } from 'antd';
import { PlusOutlined, DeleteOutlined, RobotOutlined, EditOutlined } from '@ant-design/icons';
import type { Project, ReportDraft, TaskItem } from '@/features/reports/types';
import dayjs from 'dayjs'; // 날짜 추가 위해
import { useAuth } from '@/contexts/AuthContext';
import { getRecentDailyReports, formatDailyReportsForAI, DailyReport } from '@/lib/weekly-report-utils';
import ResultDisplay from './ResultDisplay';

const { Paragraph, Text, Title } = Typography;

// AntD Form Item 타입 정의 (주간 보고서에 필요한 필드만 포함)
interface WeeklyFormValues {
  userName: string;
  projects: Project[];
  miscTasks: TaskItem[];
}

interface WeeklyReportFormProps {
  onSubmit: (data: ReportDraft) => void;
  initialData: ReportDraft; // 초기 데이터 prop 추가
  onAIGenerate?: (weeklyData: string) => void; // AI 생성 콜백
  isLoadingAI?: boolean; // AI 로딩 상태
  generatedText?: string | null; // AI 생성된 텍스트
}

type WriteMode = 'selection' | 'manual' | 'ai';

export const WeeklyReportForm: React.FC<WeeklyReportFormProps> = ({
  onSubmit,
  initialData,
  onAIGenerate,
  isLoadingAI = false,
  generatedText = null
}) => {
  const [form] = Form.useForm<WeeklyFormValues>();
  const { user } = useAuth();
  const [writeMode, setWriteMode] = useState<WriteMode>('selection');
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState<DailyReport[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [previewReport, setPreviewReport] = useState<DailyReport | null>(null);

  const selectAllReports = () => {
    setSelectedReportIds(weeklyReports.map(report => report.id));
  };

  const clearSelection = () => {
    setSelectedReportIds([]);
  };

  const selectCurrentWeekReports = () => {
    const thisWeekStart = dayjs().startOf('isoWeek').format('YYYY-MM-DD');
    const currentWeekIds = weeklyReports
      .filter(report => report.report_date >= thisWeekStart)
      .map(report => report.id);
    setSelectedReportIds(currentWeekIds);
  };

  // 초기 데이터 설정
  useEffect(() => {
    form.setFieldsValue({
      userName: initialData.userName,
      // 주간 보고서에서는 날짜를 직접 입력받지 않으므로 date 필드는 제외
      // projects와 miscTasks가 없거나 비어있으면 기본 구조 추가
      projects: initialData.projects && initialData.projects.length > 0 
                  ? initialData.projects 
                  : [{ id: `project-${Date.now()}`, name: '', tasks: [{ id: `task-${Date.now()}`, description: '' }] }],
      miscTasks: initialData.miscTasks && initialData.miscTasks.length > 0 
                  ? initialData.miscTasks 
                  : [{ id: `misc-${Date.now()}`, description: '' }],
    });
  }, [initialData, form]);

  // 폼 제출 핸들러 (AntD onFinish 사용)
  const handleFinish = (values: WeeklyFormValues) => {
    const reportData: ReportDraft = {
      ...values,
      date: dayjs().format('YYYY-MM-DD'), // 제출 시점의 날짜(ISO)
      reportType: 'weekly',
      // 필요시 여기서 values 추가 가공
    };
    onSubmit(reportData);
  };

  // AI 자동 생성 모드 선택
  const handleAIMode = async () => {
    if (!user) {
      Modal.error({ title: '로그인 필요', content: '로그인 후 이용해주세요.' });
      return;
    }

    setIsLoadingReports(true);
    try {
      const reports = await getRecentDailyReports(user.id, 9);

      setWeeklyReports(reports);
      setPreviewReport(null);
      // 이번 주 보고서를 기본 선택하되, 없으면 전체 선택
      const thisWeekStart = dayjs().startOf('isoWeek').format('YYYY-MM-DD');
      const defaultSelected = reports
        .filter(r => r.report_date >= thisWeekStart)
        .map(r => r.id);
      setSelectedReportIds(defaultSelected.length > 0 ? defaultSelected : reports.map(r => r.id));

      setWriteMode('ai');
    } catch (error) {
      console.error('일일 보고서 조회 오류:', error);
      Modal.error({
        title: '조회 실패',
        content: error instanceof Error ? error.message : '일일 보고서를 불러오는데 실패했습니다.',
      });
    } finally {
      setIsLoadingReports(false);
    }
  };

  // AI 생성 확인
  const handleConfirmAIGenerate = () => {
    const selectedReports = weeklyReports.filter(r => selectedReportIds.includes(r.id));

    if (selectedReports.length === 0) {
      Modal.warning({
        title: '보고서 선택 필요',
        content: '주간 보고서 생성에 사용할 일일 보고서를 최소 1개 이상 선택해주세요.',
      });
      return;
    }

    const aiPromptData = formatDailyReportsForAI(selectedReports);

    if (onAIGenerate) {
      onAIGenerate(aiPromptData);
    }
  };

  // 수동 작성 모드로 전환
  const handleManualMode = () => {
    setWriteMode('manual');
  };

  // 모드 선택 화면으로 돌아가기
  const handleBackToSelection = () => {
    setWriteMode('selection');
  };

  // 모드 선택 화면
  if (writeMode === 'selection') {
    return (
      <>
        {/* Form 인스턴스 경고 방지용 숨겨진 Form */}
        <Form form={form} style={{ display: 'none' }} />
        <Card title="주간 보고서 작성 방식 선택">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card
            hoverable
            style={{ cursor: 'pointer' }}
            onClick={handleAIMode}
          >
            <Space direction="vertical" size="small">
              <Title level={4}>
                <RobotOutlined /> AI 자동 생성
              </Title>
              <Paragraph type="secondary">
                이번 주 일일 보고서를 기반으로 AI가 자동으로 주간 보고서를 작성합니다.
                <br />
                완료한 업무와 다음 주 예상 업무를 분석하여 제공합니다.
              </Paragraph>
              <Button type="primary" icon={<RobotOutlined />} loading={isLoadingReports} block>
                {isLoadingReports ? '일일 보고서 조회 중...' : '이번 주 보고서로 자동 생성'}
              </Button>
            </Space>
          </Card>

          <Card
            hoverable
            style={{ cursor: 'pointer' }}
            onClick={handleManualMode}
          >
            <Space direction="vertical" size="small">
              <Title level={4}>
                <EditOutlined /> 수동 작성
              </Title>
              <Paragraph type="secondary">
                프로젝트와 업무를 직접 입력하여 주간 보고서를 작성합니다.
              </Paragraph>
              <Button icon={<EditOutlined />} block>
                직접 작성하기
              </Button>
            </Space>
          </Card>
        </Space>
        </Card>
      </>
    );
  }

  // AI 생성 모드
  if (writeMode === 'ai') {
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const isAllSelected = weeklyReports.length > 0 && selectedReportIds.length === weeklyReports.length;
    const isIndeterminate = selectedReportIds.length > 0 && !isAllSelected;

    return (
      <>
        {/* Form 인스턴스 경고 방지용 숨겨진 Form */}
        <Form form={form} style={{ display: 'none' }} />
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Button
          onClick={handleBackToSelection}
          style={{ marginBottom: 16 }}
        >
          ← 작성 방식 선택으로 돌아가기
        </Button>

        {isLoadingReports ? (
          <Card>
            <Spin tip="일일 보고서 조회 중..." />
          </Card>
        ) : weeklyReports.length === 0 ? (
          <Alert
            message="작성된 일일 보고서가 없습니다"
            description="주간 보고서를 생성하려면 먼저 일일 보고서를 작성해주세요."
            type="info"
            showIcon
          />
        ) : (
          <>
            <Card title={`일일 보고서 선택 (최근 ${weeklyReports.length}건)`}>
              <Alert
                message={`${selectedReportIds.length}개 선택됨`}
                description="주간 보고서에 포함할 일일 보고서를 선택해주세요. 원하는 보고서를 체크박스로 선택할 수 있습니다."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Space style={{ marginBottom: 16 }} size={[16, 8]} wrap>
                <Checkbox
                  indeterminate={isIndeterminate}
                  checked={isAllSelected}
                  onChange={(e) => (e.target.checked ? selectAllReports() : clearSelection())}
                >
                  전체 선택
                </Checkbox>
                <Button size="small" type="link" onClick={selectCurrentWeekReports}>
                  이번 주만 선택
                </Button>
                <Button size="small" type="link" onClick={clearSelection}>
                  선택 해제
                </Button>
              </Space>
              <List
                dataSource={weeklyReports}
                rowKey="id"
                renderItem={(report) => {
                  const date = dayjs(report.report_date);
                  const dayOfWeek = weekDays[date.day()];
                  const emoji = report.report_type === 'morning' ? '🌅' : '🌙';
                  const projectNames = report.projects_data
                    ?.map(project => project.name)
                    .filter((name): name is string => Boolean(name)) || [];
                  const projects = projectNames.length > 0 ? projectNames.join(', ') : '없음';
                  const taskCount = (report.projects_data?.reduce((sum, project) => sum + (project.tasks?.length ?? 0), 0) || 0) +
                                   (report.misc_tasks_data?.length || 0);

                  return (
                    <List.Item
                      key={report.id}
                      actions={[
                        <Button
                          key="preview"
                          type="link"
                          size="small"
                          onClick={() => setPreviewReport(report)}
                        >
                          자세히 보기
                        </Button>,
                      ]}
                      style={{ alignItems: 'flex-start' }}
                    >
                      <Checkbox
                        checked={selectedReportIds.includes(report.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReportIds(prev => (prev.includes(report.id) ? prev : [...prev, report.id]));
                          } else {
                            setSelectedReportIds(prev => prev.filter(id => id !== report.id));
                          }
                        }}
                      >
                        <Space direction="vertical" size={0}>
                          <Text strong>
                            {emoji} {dayOfWeek}요일 ({date.format('MM/DD')})
                          </Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {projects} 외 {taskCount}개 업무
                          </Text>
                        </Space>
                      </Checkbox>
                    </List.Item>
                  );
                }}
              />
            </Card>

            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={handleConfirmAIGenerate}
              disabled={selectedReportIds.length === 0}
              loading={isLoadingAI}
              block
              size="large"
            >
              {isLoadingAI ? 'AI 생성 중...' : `선택한 ${selectedReportIds.length}개 보고서로 AI 생성하기`}
            </Button>

            {generatedText && (
              <ResultDisplay
                isLoading={isLoadingAI}
                textToDisplay={generatedText}
              />
            )}

            <Modal
              open={!!previewReport}
              onCancel={() => setPreviewReport(null)}
              footer={null}
              title={previewReport
                ? (() => {
                    const previewDate = dayjs(previewReport.report_date);
                    const previewDayOfWeek = weekDays[previewDate.day()];
                    const previewEmoji = previewReport.report_type === 'morning' ? '🌅' : '🌙';
                    return `${previewEmoji} ${previewDayOfWeek}요일 (${previewDate.format('YYYY-MM-DD')}) 상세 내용`;
                  })()
                : undefined}
            >
              {previewReport && (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>프로젝트별 업무</Text>
                    {(previewReport.projects_data && previewReport.projects_data.length > 0) ? (
                      <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
                        {previewReport.projects_data.map((project, index) => (
                          <div key={project.id || project.name || index}>
                            <Text>{project.name || '프로젝트명 없음'}</Text>
                            {(project.tasks && project.tasks.length > 0) ? (
                              <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
                                {project.tasks.map((task, taskIndex) => (
                                  <li key={task.id || `${project.id || index}-${taskIndex}`}>
                                    {task.description || '업무 내용 없음'}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                등록된 업무가 없습니다.
                              </Paragraph>
                            )}
                          </div>
                        ))}
                      </Space>
                    ) : (
                      <Paragraph type="secondary" style={{ marginTop: 8 }}>
                        등록된 프로젝트 업무가 없습니다.
                      </Paragraph>
                    )}
                  </div>

                  {(previewReport.misc_tasks_data && previewReport.misc_tasks_data.length > 0) && (
                    <div>
                      <Text strong>기타 업무</Text>
                      <ul style={{ paddingLeft: 20, marginTop: 8 }}>
                        {previewReport.misc_tasks_data.map((task, index) => (
                          <li key={task.id || index}>{task.description || '업무 내용 없음'}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {previewReport.report_content && (
                    <div>
                      <Text strong>기타 메모</Text>
                      <Paragraph style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                        {previewReport.report_content}
                      </Paragraph>
                    </div>
                  )}
                </Space>
              )}
            </Modal>
          </>
        )}
        </Space>
      </>
    );
  }

  // 수동 작성 모드
  return (
    <>
      <Button
        onClick={handleBackToSelection}
        style={{ marginBottom: 16 }}
      >
        ← 작성 방식 선택으로 돌아가기
      </Button>
      <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish} // onSubmit 대신 onFinish 사용
      initialValues={{ // Form.List 위한 초기 빈 배열
        projects: [{}],
        miscTasks: [{}],
      }}
    >
      <Card title="기본 정보" style={{ marginBottom: 24 }}>
        <Form.Item
          label="이름"
          name="userName"
          rules={[{ required: true, message: '이름을 입력해주세요.' }]}
        >
          <Input placeholder="홍길동" />
        </Form.Item>
      </Card>

      <Card title="주간 보고서 작성 가이드" style={{ marginBottom: 24 }}>
         <Paragraph type="secondary">
          프로젝트명을 입력하세요 (예: 신규 서비스 개발)<br />
          업무에는 다음과 같은 형식으로 입력하면 그룹화됩니다: 
          <Text code>UI 디자인 - 메인 페이지 시안 작업</Text><br />
          동일한 그룹의 업무는 자동으로 묶여서 표시됩니다.
        </Paragraph>
      </Card>

      <Card title="프로젝트별 업무" style={{ marginBottom: 24 }}>
        <Form.List name="projects">
          {(fields, { add, remove }) => (
            <Space direction="vertical" style={{ width: '100%' }}>
              {fields.map(({ key, name, ...restField }, index) => (
                <Card 
                  key={key} 
                  size="small" 
                  title={`프로젝트 ${index + 1}`}
                  extra={
                     // 프로젝트가 1개 이상일 때만 삭제 버튼 표시
                     fields.length > 1 ? (
                        <Popconfirm title="이 프로젝트를 삭제할까요?" onConfirm={() => remove(name)} okText="예" cancelText="아니오">
                            <Button icon={<DeleteOutlined />} type="text" danger />
                        </Popconfirm>
                     ) : null
                  }
                >
                  <Form.Item
                    {...restField}
                    name={[name, 'name']}
                    label="프로젝트명"
                    rules={[{ required: true, message: '프로젝트명을 입력해주세요.' }]}
                    style={{ marginBottom: 16 }}
                  >
                    <Input placeholder="예: 신규 서비스 개발" />
                  </Form.Item>
                  
                  <Form.List name={[name, 'tasks']}>
                    {(taskFields, { add: addTask, remove: removeTask }) => (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {taskFields.map(({ key: taskKey, name: taskName, ...restTaskField }, taskIndex) => (
                          <div key={taskKey}>
                            <Form.Item
                              {...restTaskField}
                              label={taskFields.length > 1 ? `업무 ${taskIndex + 1}` : '업무'} // 업무가 여러 개일 때만 번호 표시
                              name={[taskName, 'description']}
                              rules={[{ required: true, message: '업무 내용을 입력해주세요.' }]}
                            >
                              <Input.TextArea placeholder="예: UI 디자인 - 메인 페이지 시안 작업" autoSize={{ minRows: 1, maxRows: 3 }} />
                            </Form.Item>
                            <Paragraph type="secondary" style={{ marginTop: '-12px', marginBottom: '8px', fontSize: '12px' }}>
                                그룹화를 위해 &quot;그룹명 - 업무내용&quot; 형식 권장
                                {taskFields.length > 1 && ( // 업무가 1개 이상일 때만 삭제 버튼 표시
                                    <Button 
                                        icon={<DeleteOutlined />} 
                                        onClick={() => removeTask(taskName)} 
                                        type="text" 
                                        danger 
                                        size="small" 
                                        style={{ float: 'right' }} 
                                    />
                                )}
                            </Paragraph>
                         </div>
                        ))}
                        <Button type="dashed" onClick={() => addTask()} block icon={<PlusOutlined />}>
                          업무 추가
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                </Card>
              ))}
              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                프로젝트 추가
              </Button>
            </Space>
          )}
        </Form.List>
      </Card>

       <Card title="기타 업무" style={{ marginBottom: 24 }}>
         <Form.List name="miscTasks">
          {(fields, { add, remove }) => (
            <Space direction="vertical" style={{ width: '100%' }}>
              {fields.map(({ key, name, ...restField }, index) => (
                 <div key={key}>
                    <Form.Item
                        {...restField}
                        label={fields.length > 1 ? `기타 업무 ${index + 1}` : '기타 업무'}
                        name={[name, 'description']}
                        rules={[{ required: true, message: '업무 내용을 입력해주세요.' }]}
                    >
                        <Input.TextArea placeholder="예: 주간 회의 자료 준비" autoSize={{ minRows: 1, maxRows: 3 }} />
                    </Form.Item>
                    {fields.length > 1 && ( // 항목이 1개 이상일 때만 삭제 버튼 표시
                        <Button 
                            icon={<DeleteOutlined />} 
                            onClick={() => remove(name)} 
                            type="text" 
                            danger 
                            size="small" 
                            style={{ marginTop: '-28px', float: 'right' }} // 위치 조정
                        />
                    )}
                 </div>
              ))}
              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                기타 업무 추가
              </Button>
            </Space>
          )}
        </Form.List>
      </Card>

      <Form.Item>
        <Button type="primary" htmlType="submit" block size="large">
          제출하기
        </Button>
      </Form.Item>
    </Form>
    </>
  );
}; 
