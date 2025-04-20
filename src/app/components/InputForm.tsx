'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project, TaskItem } from '../api/grop';

interface InputFormProps {
  onDataChange: (data: {
    userName: string;
    date: string;
    projects: Project[];
    miscTasks: TaskItem[];
  }) => void;
}

export default function InputForm({ onDataChange }: InputFormProps) {
  const today = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const formattedDate = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}(${days[today.getDay()]})`;

  const [userName, setUserName] = useState('');
  const [date, setDate] = useState(formattedDate);
  const [projects, setProjects] = useState<Project[]>([]);
  const [miscTasks, setMiscTasks] = useState<TaskItem[]>([]);

  // ID 생성 함수
  const generateId = () => `id-${Math.random().toString(36).substring(2, 9)}`;

  // 상태가 변경될 때마다 부모 컴포넌트에 알림
  const updateParent = useCallback(() => {
    onDataChange({
      userName,
      date,
      projects,
      miscTasks,
    });
  }, [userName, date, projects, miscTasks, onDataChange]);

  // 초기 로드 시에만 부모에게 데이터 전달
  useEffect(() => {
    updateParent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 의존성 배열을 비워 처음 한 번만 실행

  // 새 프로젝트 추가
  const addProject = () => {
    const newProject: Project = {
      id: generateId(),
      name: '',
      tasks: [],
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    onDataChange({
      userName,
      date,
      projects: updatedProjects,
      miscTasks,
    });
  };

  // 프로젝트 삭제
  const removeProject = (projectId: string) => {
    const updatedProjects = projects.filter(project => project.id !== projectId);
    setProjects(updatedProjects);
    onDataChange({
      userName,
      date,
      projects: updatedProjects,
      miscTasks,
    });
  };

  // 프로젝트 이름 업데이트
  const updateProjectName = (projectId: string, name: string) => {
    const updatedProjects = projects.map(project => 
      project.id === projectId ? { ...project, name } : project
    );
    setProjects(updatedProjects);
    onDataChange({
      userName,
      date,
      projects: updatedProjects,
      miscTasks,
    });
  };

  // 업무 추가
  const addTask = (projectId: string) => {
    const newTask: TaskItem = {
      id: generateId(),
      description: '',
    };
    
    const updatedProjects = projects.map(project => 
      project.id === projectId 
        ? { ...project, tasks: [...project.tasks, newTask] } 
        : project
    );
    setProjects(updatedProjects);
    onDataChange({
      userName,
      date,
      projects: updatedProjects,
      miscTasks,
    });
  };

  // 업무 삭제
  const removeTask = (projectId: string, taskId: string) => {
    const updatedProjects = projects.map(project => 
      project.id === projectId 
        ? { ...project, tasks: project.tasks.filter(task => task.id !== taskId) } 
        : project
    );
    setProjects(updatedProjects);
    onDataChange({
      userName,
      date,
      projects: updatedProjects,
      miscTasks,
    });
  };

  // 협업자 정보 포맷팅 ('/w' 자동 추가)
  const formatCollaborator = (value: string): string => {
    if (!value.trim()) return value;
    
    // 이미 '/w'로 시작하면 그대로 반환
    if (value.trim().startsWith('/w')) return value;
    
    // 앞뒤 공백 제거 후 '/w '를 추가
    return `/w ${value.trim()}`;
  };

  // 업무 상세 정보 업데이트
  const updateTask = (projectId: string, taskId: string, field: keyof TaskItem, value: string) => {
    const updatedProjects = projects.map(project => 
      project.id === projectId 
        ? { 
            ...project, 
            tasks: project.tasks.map(task => 
              task.id === taskId 
                ? { 
                    ...task, 
                    [field]: field === 'collaborator' ? formatCollaborator(value) : value 
                  } 
                : task
            ) 
          } 
        : project
    );
    setProjects(updatedProjects);
    onDataChange({
      userName,
      date,
      projects: updatedProjects,
      miscTasks,
    });
  };

  // 기타 업무 추가
  const addMiscTask = () => {
    const newTask: TaskItem = {
      id: generateId(),
      description: '',
    };
    const updatedMiscTasks = [...miscTasks, newTask];
    setMiscTasks(updatedMiscTasks);
    onDataChange({
      userName,
      date,
      projects,
      miscTasks: updatedMiscTasks,
    });
  };

  // 기타 업무 삭제
  const removeMiscTask = (taskId: string) => {
    const updatedMiscTasks = miscTasks.filter(task => task.id !== taskId);
    setMiscTasks(updatedMiscTasks);
    onDataChange({
      userName,
      date,
      projects,
      miscTasks: updatedMiscTasks,
    });
  };

  // 기타 업무 업데이트
  const updateMiscTask = (taskId: string, field: keyof TaskItem, value: string) => {
    const updatedMiscTasks = miscTasks.map(task => 
      task.id === taskId 
        ? { 
            ...task, 
            [field]: field === 'collaborator' ? formatCollaborator(value) : value 
          } 
        : task
    );
    setMiscTasks(updatedMiscTasks);
    onDataChange({
      userName,
      date,
      projects,
      miscTasks: updatedMiscTasks,
    });
  };

  // 이름 변경 핸들러
  const handleUserNameChange = (value: string) => {
    setUserName(value);
    onDataChange({
      userName: value,
      date,
      projects,
      miscTasks,
    });
  };

  // 날짜 변경 핸들러
  const handleDateChange = (value: string) => {
    setDate(value);
    onDataChange({
      userName,
      date: value,
      projects,
      miscTasks,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">기본 정보</h2>
        <div className="flex flex-col space-y-2">
          <input
            type="text"
            placeholder="이름을 입력하세요"
            value={userName}
            onChange={(e) => handleUserNameChange(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="날짜"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="border p-2 rounded"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">프로젝트별 업무</h2>
          <button
            onClick={addProject}
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            프로젝트 추가
          </button>
        </div>

        <div className="space-y-4">
          {projects.map((project, index) => (
            <div key={project.id} className="border p-4 rounded space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="font-bold">{index + 1}.</span>
                  <input
                    type="text"
                    placeholder="프로젝트 이름"
                    value={project.name}
                    onChange={(e) => updateProjectName(project.id || '', e.target.value)}
                    className="border p-2 rounded flex-grow"
                  />
                </div>
                <button
                  onClick={() => removeProject(project.id || '')}
                  className="text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>

              <div className="space-y-2">
                {project.tasks.map((task) => (
                  <div key={task.id} className="pl-4 space-y-1">
                    <div className="flex items-start space-x-2">
                      <input
                        type="text"
                        placeholder="업무 설명"
                        value={task.description || ''}
                        onChange={(e) => updateTask(project.id || '', task.id || '', 'description', e.target.value)}
                        className="border p-2 rounded flex-grow"
                      />
                      <button
                        onClick={() => removeTask(project.id || '', task.id || '')}
                        className="text-red-500 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="협업자 정보 (선택사항, 예: 김길동동)"
                        value={task.collaborator || ''}
                        onChange={(e) => updateTask(project.id || '', task.id || '', 'collaborator', e.target.value)}
                        className="border p-2 rounded flex-grow text-sm"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="후속 조치 (선택사항)"
                        value={task.followUp || ''}
                        onChange={(e) => updateTask(project.id || '', task.id || '', 'followUp', e.target.value)}
                        className="border p-2 rounded flex-grow text-sm"
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => addTask(project.id || '')}
                  className="ml-4 text-blue-500 hover:text-blue-700"
                >
                  + 업무 추가
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">기타 업무</h2>
          <button
            onClick={addMiscTask}
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            업무 추가
          </button>
        </div>

        <div className="space-y-4">
          {miscTasks.map((task) => (
            <div key={task.id} className="space-y-2">
              <div className="flex items-start space-x-2">
                <input
                  type="text"
                  placeholder="기타 업무"
                  value={task.description || ''}
                  onChange={(e) => updateMiscTask(task.id || '', 'description', e.target.value)}
                  className="border p-2 rounded flex-grow"
                />
                <button
                  onClick={() => removeMiscTask(task.id || '')}
                  className="text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>
              <div className="pl-4 space-y-1">
                <input
                  type="text"
                  placeholder="협업자 정보 (선택사항, 예: 김길동동)"
                  value={task.collaborator || ''}
                  onChange={(e) => updateMiscTask(task.id || '', 'collaborator', e.target.value)}
                  className="border p-2 rounded w-full text-sm"
                />
                <input
                  type="text"
                  placeholder="후속 조치 (선택사항)"
                  value={task.followUp || ''}
                  onChange={(e) => updateMiscTask(task.id || '', 'followUp', e.target.value)}
                  className="border p-2 rounded w-full mt-1 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 