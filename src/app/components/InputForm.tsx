'use client';

import { useEffect } from 'react';
import { Form, Input, Button, DatePicker, Card, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Project, TaskItem, ReportData } from '../api/grop';
import dayjs from 'dayjs'; // Dayjs import
import 'dayjs/locale/ko'; // 한국어 로케일
dayjs.locale('ko'); // 로케일 설정

// AntD Form Item 타입
interface FormValues {
  userName: string;
  date: dayjs.Dayjs | null; // DatePicker는 Dayjs 객체 사용
  projects: Project[];
  miscTasks: TaskItem[];
}

interface InputFormProps {
  onDataChange: (data: {
    userName: string;
    date: string; // 부모 컴포넌트에는 'YYYY-MM-DD 요일' 형식의 string으로 전달
    projects: Project[];
    miscTasks: TaskItem[];
  }) => void;
  initialData: ReportData; // 초기 데이터 prop 추가
}

  // 협업자 정보 포맷팅 ('/w' 자동 추가)
const formatCollaborator = (value: string | undefined): string => {
  if (!value || !value.trim()) return '';
    if (value.trim().startsWith('/w')) return value;
    return `/w ${value.trim()}`;
  };

export default function InputForm({ onDataChange, initialData }: InputFormProps) {
  const [form] = Form.useForm<FormValues>();

  // 초기 데이터 설정
  useEffect(() => {
    form.setFieldsValue({
      userName: initialData.userName,
      // 날짜 문자열을 Dayjs 객체로 변환, 유효하지 않으면 null (형식 지정)
      date: initialData.date ? dayjs(initialData.date, 'YYYY-MM-DD dddd') : null, 
      projects: initialData.projects || [],
      miscTasks: initialData.miscTasks || [],
    });
  }, [initialData, form]);

  // 폼 값 변경 시 부모 컴포넌트에 알림
  const handleValuesChange = (_changedValues: Partial<FormValues>, allValues: FormValues) => {
    // 날짜를 'YYYY-MM-DD 요일' 형식으로 변환하여 전달
    let formattedDateString = '';
    if (allValues.date) {
      // KST를 기준으로 날짜와 요일 포맷팅 (dayjs locale이 'ko'로 설정되어 있다고 가정)
      const year = allValues.date.year();
      const month = (allValues.date.month() + 1).toString().padStart(2, '0'); // month()는 0부터 시작
      const day = allValues.date.date().toString().padStart(2, '0');
      const dayOfWeek = allValues.date.format('dddd'); // 'ko' 로케일 사용 시 '월요일', '화요일' 등
      formattedDateString = `${year}-${month}-${day} ${dayOfWeek}`;
    }

    onDataChange({
        ...allValues,
        date: formattedDateString, // 수정된 날짜 형식으로 전달
        // projects와 miscTasks 내의 collaborator 필드 포맷팅
        projects: (allValues.projects || []).map(p => ({
          ...p,
          tasks: (p.tasks || []).map(t => ({
            ...t,
            collaborator: formatCollaborator(t.collaborator)
          }))
        })),
        miscTasks: (allValues.miscTasks || []).map(t => ({
          ...t,
            collaborator: formatCollaborator(t.collaborator)
        }))
    });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onValuesChange={handleValuesChange}
      initialValues={{
          projects: [], // 초기 빈 배열 설정
          miscTasks: [],
      }}
    >
      <Card title="기본 정보" style={{ marginBottom: 24 }}>
        <Form.Item
          label="이름"
          name="userName"
          rules={[{ required: true, message: '이름을 입력해주세요.' }]}
        >
          <Input placeholder="이름 입력" />
        </Form.Item>
        <Form.Item
          label="날짜"
          name="date"
          rules={[{ required: true, message: '날짜를 선택해주세요.' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD dddd" />
        </Form.Item>
      </Card>

      <Card title="프로젝트별 업무" style={{ marginBottom: 24 }}>
        <Form.List name="projects">
          {(fields, { add, remove }) => (
            <Space direction="vertical" style={{ width: '100%' }}>
              {fields.map(({ key, name, ...restField }) => (
                <Card 
                  key={key} 
                  size="small" 
                  title={`프로젝트 ${name + 1}`}
                  extra={
                    <Popconfirm title="이 프로젝트를 삭제할까요?" onConfirm={() => remove(name)} okText="예" cancelText="아니오">
                        <Button icon={<DeleteOutlined />} type="text" danger />
                    </Popconfirm>
                  }
                >
                  <Form.Item
                    {...restField}
                    name={[name, 'name']}
                    label="프로젝트명"
                    rules={[{ required: true, message: '프로젝트명을 입력해주세요.' }]}
                    style={{ marginBottom: 16 }}
                  >
                    <Input placeholder="예: 신규 서비스 기획" />
                  </Form.Item>
                  
                  <Form.List name={[name, 'tasks']}>
                    {(taskFields, { add: addTask, remove: removeTask }) => (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {taskFields.map(({ key: taskKey, name: taskName, ...restTaskField }) => (
                          <Space key={taskKey} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                            <Form.Item
                              {...restTaskField}
                              name={[taskName, 'description']}
                              rules={[{ required: true, message: '업무 내용을 입력해주세요.' }]}
                              style={{ flexGrow: 1, marginBottom: 0 }}
                            >
                              <Input.TextArea placeholder="예: 사용자 인터페이스 설계" autoSize={{ minRows: 1, maxRows: 3 }} />
                            </Form.Item>
                             <Form.Item
                              {...restTaskField}
                              name={[taskName, 'collaborator']}
                              style={{ marginBottom: 0, minWidth: '100px' }} // 협업자 입력칸 너비 조절
                            >
                              <Input placeholder="협업자 (/w 이름)" />
                            </Form.Item>
                            <Button icon={<DeleteOutlined />} onClick={() => removeTask(taskName)} type="text" danger />
                          </Space>
                        ))}
                        <Button type="dashed" onClick={() => addTask({ description: '', collaborator: '', status: '진행 중' })} block icon={<PlusOutlined />}>
                          업무 추가
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                </Card>
              ))}
              <Button type="dashed" onClick={() => add({ name: '', tasks: [{ description: '', collaborator: '', status: '진행 중' }] })} block icon={<PlusOutlined />}>
                프로젝트 추가
              </Button>
            </Space>
          )}
        </Form.List>
      </Card>

       <Card title="기타 업무">
         <Form.List name="miscTasks">
          {(fields, { add, remove }) => (
            <Space direction="vertical" style={{ width: '100%' }}>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'description']}
                    rules={[{ required: true, message: '업무 내용을 입력해주세요.' }]}
                    style={{ flexGrow: 1, marginBottom: 0 }}
                  >
                    <Input.TextArea placeholder="예: 팀 주간 회의 참석" autoSize={{ minRows: 1, maxRows: 3 }} />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'collaborator']}
                    style={{ marginBottom: 0, minWidth: '100px' }}
                  >
                    <Input placeholder="협업자 (/w 이름)" />
                  </Form.Item>
                  <Button icon={<DeleteOutlined />} onClick={() => remove(name)} type="text" danger />
                </Space>
              ))}
              <Button type="dashed" onClick={() => add({ description: '', collaborator: '', status: '진행 중' })} block icon={<PlusOutlined />}>
                기타 업무 추가
              </Button>
            </Space>
          )}
        </Form.List>
      </Card>
    </Form>
  );
} 