import React, { useState, useCallback } from 'react';
import { Project, TaskItem, ReportData } from '../api/grop';

interface WeeklyReportFormProps {
  onSubmit: (data: ReportData) => void;
}

// ID 생성 함수
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const WeeklyReportForm: React.FC<WeeklyReportFormProps> = ({ onSubmit }) => {
  const [userName, setUserName] = useState('');
  const [projects, setProjects] = useState<Project[]>(() => [{
    id: generateId('project'),
    name: '',
    tasks: [{ id: generateId('task'), description: '' }]
  }]);
  const [miscTasks, setMiscTasks] = useState<TaskItem[]>(() => [{
    id: generateId('misc'),
    description: ''
  }]);

  const handleProjectNameChange = (index: number, value: string) => {
    const newProjects = [...projects];
    newProjects[index].name = value;
    setProjects(newProjects);
  };

  const handleProjectTaskChange = (projectIndex: number, taskIndex: number, value: string) => {
    const newProjects = [...projects];
    newProjects[projectIndex].tasks[taskIndex].description = value;
    setProjects(newProjects);
  };

  const handleMiscTaskChange = (index: number, value: string) => {
    const newMiscTasks = [...miscTasks];
    newMiscTasks[index].description = value;
    setMiscTasks(newMiscTasks);
  };

  const addProject = useCallback(() => {
    setProjects(prev => [...prev, {
      id: generateId('project'),
      name: '',
      tasks: [{ id: generateId('task'), description: '' }]
    }]);
  }, []);

  const addProjectTask = useCallback((projectIndex: number) => {
    setProjects(prev => {
      const newProjects = [...prev];
      newProjects[projectIndex].tasks.push({ id: generateId('task'), description: '' });
      return newProjects;
    });
  }, []);

  const addMiscTask = useCallback(() => {
    setMiscTasks(prev => [...prev, { id: generateId('misc'), description: '' }]);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reportData: ReportData = {
      userName,
      date: new Date().toISOString(),
      projects,
      miscTasks,
      reportType: 'weekly'
    };
    onSubmit(reportData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">이름</label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
          placeholder="홍길동"
        />
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-500">
          주간 보고서 작성 가이드:
        </p>
        <ul className="text-xs text-gray-500 list-disc pl-5 space-y-1">
          <li>프로젝트명을 입력하세요 (예: 다독이 시스템 기획)</li>
          <li>업무에는 다음과 같은 형식으로 입력하면 그룹화됩니다: <br />
            <span className="font-mono">내 서재 - 다독이_도서 목록 시스템 기획</span>
          </li>
          <li>동일한 그룹의 업무는 자동으로 묶여서 표시됩니다</li>
        </ul>
      </div>

      {projects.map((project, projectIndex) => (
        <div key={project.id} className="border p-4 rounded-lg">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">프로젝트 이름</label>
            <input
              type="text"
              value={project.name}
              onChange={(e) => handleProjectNameChange(projectIndex, e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
              placeholder="예: 다독이 시스템 기획"
            />
          </div>

          {project.tasks.map((task, taskIndex) => (
            <div key={task.id} className="mb-2">
              <label className="block text-sm font-medium text-gray-700">업무 {taskIndex + 1}</label>
              <input
                type="text"
                value={task.description}
                onChange={(e) => handleProjectTaskChange(projectIndex, taskIndex, e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
                placeholder="예: 내 서재 - 다독이_도서 목록 시스템 기획"
              />
              <p className="text-xs text-gray-500 mt-1">그룹화를 위해 "그룹명 - 업무내용" 형식으로 입력하세요</p>
            </div>
          ))}

          <button
            type="button"
            onClick={() => addProjectTask(projectIndex)}
            className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            업무 추가
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addProject}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        프로젝트 추가
      </button>

      <div className="border p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">기타 업무</h3>
        {miscTasks.map((task, index) => (
          <div key={task.id} className="mb-2">
            <label className="block text-sm font-medium text-gray-700">업무 {index + 1}</label>
            <input
              type="text"
              value={task.description}
              onChange={(e) => handleMiscTaskChange(index, e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
              placeholder="예: 주간 회의 자료 준비"
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addMiscTask}
          className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          기타 업무 추가
        </button>
      </div>

      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        제출하기
      </button>
    </form>
  );
}; 