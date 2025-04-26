'use client';

import React, { useEffect } from 'react';
import { Form, Input, Button, Card, Space, Popconfirm, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Project, TaskItem, ReportData } from '../api/grop';
import dayjs from 'dayjs'; // 날짜 추가 위해

const { Paragraph, Text } = Typography;

// AntD Form Item 타입 정의 (주간 보고서에 필요한 필드만 포함)
interface WeeklyFormValues {
  userName: string;
  projects: Project[];
  miscTasks: TaskItem[];
}

interface WeeklyReportFormProps {
  onSubmit: (data: ReportData) => void;
  initialData: ReportData; // 초기 데이터 prop 추가
}

export const WeeklyReportForm: React.FC<WeeklyReportFormProps> = ({ onSubmit, initialData }) => {
  const [form] = Form.useForm<WeeklyFormValues>();

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
    const reportData: ReportData = {
      ...values,
      date: dayjs().toISOString(), // 제출 시점의 날짜 추가
      reportType: 'weekly',
      // 필요시 여기서 values 추가 가공
    };
    onSubmit(reportData);
  };

  return (
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
          프로젝트명을 입력하세요 (예: 다독이 시스템 기획)<br />
          업무에는 다음과 같은 형식으로 입력하면 그룹화됩니다: 
          <Text code>내 서재 - 다독이_도서 목록 시스템 기획</Text><br />
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
                    <Input placeholder="예: 다독이 시스템 기획" />
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
                              <Input.TextArea placeholder="예: 내 서재 - 다독이_도서 목록 시스템 기획" autoSize={{ minRows: 1, maxRows: 3 }} />
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
  );
}; 