'use client';

import { useState, useEffect } from 'react';

interface TaskItem {
  id: string;
  description: string;
  collaborator?: string;
  followUp?: string;
}

interface Project {
  id: string;
  name: string;
  tasks: TaskItem[];
}

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

  // 새 프로젝트 추가
  const addProject = () => {
    const newProject: Project = {
      id: generateId(),
      name: '',
      tasks: [],
    };
    setProjects([...projects, newProject]);
  };

  // 프로젝트 삭제
  const removeProject = (projectId: string) => {
    setProjects(projects.filter(project => project.id !== projectId));
  };

  // 프로젝트 이름 업데이트
  const updateProjectName = (projectId: string, name: string) => {
    setProjects(
      projects.map(project => 
        project.id === projectId ? { ...project, name } : project
      )
    );
  };

  // 업무 추가
  const addTask = (projectId: string) => {
    const newTask: TaskItem = {
      id: generateId(),
      description: '',
    };
    
    setProjects(
      projects.map(project => 
        project.id === projectId 
          ? { ...project, tasks: [...project.tasks, newTask] } 
          : project
      )
    );
  };

  // 업무 삭제
  const removeTask = (projectId: string, taskId: string) => {
    setProjects(
      projects.map(project => 
        project.id === projectId 
          ? { ...project, tasks: project.tasks.filter(task => task.id !== taskId) } 
          : project
      )
    );
  };

  // 업무 상세 정보 업데이트
  const updateTask = (projectId: string, taskId: string, field: keyof TaskItem, value: string) => {
    setProjects(
      projects.map(project => 
        project.id === projectId 
          ? { 
              ...project, 
              tasks: project.tasks.map(task => 
                task.id === taskId 
                  ? { ...task, [field]: value } 
                  : task
              ) 
            } 
          : project
      )
    );
  };

  // 기타 업무 추가
  const addMiscTask = () => {
    const newTask: TaskItem = {
      id: generateId(),
      description: '',
    };
    setMiscTasks([...miscTasks, newTask]);
  };

  // 기타 업무 삭제
  const removeMiscTask = (taskId: string) => {
    setMiscTasks(miscTasks.filter(task => task.id !== taskId));
  };

  // 기타 업무 업데이트
  const updateMiscTask = (taskId: string, field: keyof TaskItem, value: string) => {
    setMiscTasks(
      miscTasks.map(task => 
        task.id === taskId 
          ? { ...task, [field]: value } 
          : task
      )
    );
  };

  // 데이터 변경 시 부모 컴포넌트에 알림
  const handleDataChange = () => {
    onDataChange({
      userName,
      date,
      projects,
      miscTasks,
    });
  };

  // 입력 값이 변경될 때마다 데이터 업데이트
  useEffect(() => {
    handleDataChange();
  }, [userName, date, projects, miscTasks]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">기본 정보</h2>
        <div className="flex flex-col space-y-2">
          <input
            type="text"
            placeholder="이름을 입력하세요"
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value);
              handleDataChange();
            }}
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="날짜"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              handleDataChange();
            }}
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
                    onChange={(e) => {
                      updateProjectName(project.id, e.target.value);
                      handleDataChange();
                    }}
                    className="border p-2 rounded flex-grow"
                  />
                </div>
                <button
                  onClick={() => removeProject(project.id)}
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
                        value={task.description}
                        onChange={(e) => {
                          updateTask(project.id, task.id, 'description', e.target.value);
                          handleDataChange();
                        }}
                        className="border p-2 rounded flex-grow"
                      />
                      <button
                        onClick={() => removeTask(project.id, task.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="협업자 정보 (선택사항, 예: /w 김길동동)"
                        value={task.collaborator || ''}
                        onChange={(e) => {
                          updateTask(project.id, task.id, 'collaborator', e.target.value);
                          handleDataChange();
                        }}
                        className="border p-2 rounded flex-grow text-sm"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="후속 조치 (선택사항)"
                        value={task.followUp || ''}
                        onChange={(e) => {
                          updateTask(project.id, task.id, 'followUp', e.target.value);
                          handleDataChange();
                        }}
                        className="border p-2 rounded flex-grow text-sm"
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => addTask(project.id)}
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

        <div className="space-y-2">
          {miscTasks.map((task) => (
            <div key={task.id} className="flex items-start space-x-2">
              <input
                type="text"
                placeholder="기타 업무"
                value={task.description}
                onChange={(e) => {
                  updateMiscTask(task.id, 'description', e.target.value);
                  handleDataChange();
                }}
                className="border p-2 rounded flex-grow"
              />
              <button
                onClick={() => removeMiscTask(task.id)}
                className="text-red-500 hover:text-red-700"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 