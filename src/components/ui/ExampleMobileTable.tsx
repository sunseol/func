'use client';

import React, { useState } from 'react';
import ResponsiveTable, { TableColumn } from './ResponsiveTable';
import MobileTableControls, { SortOption, FilterOption } from './MobileTableControls';
import { createTableActionColumn, COMMON_ACTIONS, ACTION_PRESETS } from './TableActionButtons';
import { applyColumnPriorities, COMMON_COLUMN_PRIORITIES } from '@/lib/table-utils';
import { useToast } from '@/contexts/ToastContext';

// Example data types
interface ExampleUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  lastActivity: string;
  joinDate: string;
  department: string;
}

interface ExampleDocument {
  id: string;
  title: string;
  author: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  createdAt: string;
  updatedAt: string;
  type: string;
  size: string;
  tags: string[];
}

// Sample data
const sampleUsers: ExampleUser[] = [
  {
    id: '1',
    name: '김철수',
    email: 'kim@example.com',
    role: '서비스기획',
    status: 'active',
    lastActivity: '2024-01-15T10:30:00Z',
    joinDate: '2023-06-01T00:00:00Z',
    department: '기획팀'
  },
  {
    id: '2',
    name: '이영희',
    email: 'lee@example.com',
    role: '개발자',
    status: 'active',
    lastActivity: '2024-01-14T16:45:00Z',
    joinDate: '2023-08-15T00:00:00Z',
    department: '개발팀'
  },
  {
    id: '3',
    name: '박민수',
    email: 'park@example.com',
    role: 'UIUX기획',
    status: 'inactive',
    lastActivity: '2024-01-10T09:15:00Z',
    joinDate: '2023-09-01T00:00:00Z',
    department: '디자인팀'
  }
];

const sampleDocuments: ExampleDocument[] = [
  {
    id: '1',
    title: '프로젝트 기획서',
    author: '김철수',
    status: 'approved',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    type: '기획서',
    size: '2.5MB',
    tags: ['기획', '프로젝트']
  },
  {
    id: '2',
    title: 'UI 디자인 가이드',
    author: '박민수',
    status: 'review',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-14T16:45:00Z',
    type: '가이드',
    size: '5.1MB',
    tags: ['디자인', 'UI']
  }
];

// User table example
export function ExampleUserTable() {
  const { success, error } = useToast();
  const [users, setUsers] = useState(sampleUsers);
  const [searchValue, setSearchValue] = useState('');
  const [currentSort, setCurrentSort] = useState<{ key: string; direction: 'asc' | 'desc' }>();
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({});

  // Define columns
  const baseColumns: TableColumn<ExampleUser>[] = [
    {
      key: 'name',
      title: '이름',
      dataIndex: 'name',
      sortable: true,
      render: (name, record) => (
        <div>
          <div className="font-medium text-gray-900">{name}</div>
          <div className="text-sm text-gray-500">{record.email}</div>
        </div>
      )
    },
    {
      key: 'role',
      title: '역할',
      dataIndex: 'role',
      render: (role) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {role}
        </span>
      )
    },
    {
      key: 'status',
      title: '상태',
      dataIndex: 'status',
      render: (status: ExampleUser['status']) => {
        const colors: Record<ExampleUser['status'], string> = {
          active: 'bg-green-100 text-green-800',
          inactive: 'bg-gray-100 text-gray-800',
          pending: 'bg-yellow-100 text-yellow-800'
        };
        const labels: Record<ExampleUser['status'], string> = {
          active: '활성',
          inactive: '비활성',
          pending: '대기'
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
            {labels[status]}
          </span>
        );
      }
    },
    {
      key: 'department',
      title: '부서',
      dataIndex: 'department'
    },
    {
      key: 'lastActivity',
      title: '마지막 활동',
      dataIndex: 'lastActivity',
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR')
    },
    {
      key: 'joinDate',
      title: '가입일',
      dataIndex: 'joinDate',
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR')
    }
  ];

  // Apply column priorities
  const columns = applyColumnPriorities(baseColumns, COMMON_COLUMN_PRIORITIES.userTable);

  // Add action column
  const columnsWithActions = [
    ...columns,
    createTableActionColumn<ExampleUser>(
      ACTION_PRESETS.user(
        (user) => success('보기', `${user.name} 사용자 정보를 확인합니다.`),
        (user) => success('수정', `${user.name} 사용자 정보를 수정합니다.`),
        (user) => {
          if (confirm(`${user.name} 사용자를 정말 보관하시겠습니까?`)) {
            success('보관', `${user.name} 사용자가 보관되었습니다.`);
          }
        }
      ),
      { variant: 'auto', maxVisibleButtons: 2 }
    )
  ];

  // Sort options
  const sortOptions: SortOption[] = [
    { key: 'name', label: '이름' },
    { key: 'role', label: '역할' },
    { key: 'status', label: '상태' },
    { key: 'lastActivity', label: '마지막 활동' },
    { key: 'joinDate', label: '가입일' }
  ];

  // Filter options
  const filterOptions: FilterOption[] = [
    {
      key: 'role',
      label: '역할',
      type: 'select',
      options: [
        { value: '서비스기획', label: '서비스기획' },
        { value: '개발자', label: '개발자' },
        { value: 'UIUX기획', label: 'UIUX기획' },
        { value: '콘텐츠기획', label: '콘텐츠기획' }
      ]
    },
    {
      key: 'status',
      label: '상태',
      type: 'multiselect',
      options: [
        { value: 'active', label: '활성' },
        { value: 'inactive', label: '비활성' },
        { value: 'pending', label: '대기' }
      ]
    },
    {
      key: 'department',
      label: '부서',
      type: 'select',
      options: [
        { value: '기획팀', label: '기획팀' },
        { value: '개발팀', label: '개발팀' },
        { value: '디자인팀', label: '디자인팀' }
      ]
    }
  ];

  // Filter and sort data
  const filteredAndSortedUsers = React.useMemo(() => {
    let result = [...users];

    // Apply search
    if (searchValue) {
      result = result.filter(user => 
        user.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        user.email.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    // Apply filters
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          result = result.filter(user => value.includes((user as any)[key]));
        } else {
          result = result.filter(user => (user as any)[key] === value);
        }
      }
    });

    // Apply sorting
    if (currentSort) {
      result.sort((a, b) => {
        const aValue = (a as any)[currentSort.key];
        const bValue = (b as any)[currentSort.key];
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return currentSort.direction === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [users, searchValue, currentFilters, currentSort]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">사용자 관리</h2>
      </div>

      <MobileTableControls
        searchable
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="이름 또는 이메일로 검색..."
        sortOptions={sortOptions}
        currentSort={currentSort}
        onSortChange={setCurrentSort}
        filterOptions={filterOptions}
        currentFilters={currentFilters}
        onFiltersChange={setCurrentFilters}
        showResultCount
        resultCount={filteredAndSortedUsers.length}
      />

      <ResponsiveTable
        columns={columnsWithActions}
        dataSource={filteredAndSortedUsers}
        rowKey="id"
        mobileCardMode
        expandableRows
        showColumnToggle
        horizontalScroll
      />
    </div>
  );
}

// Document table example
export function ExampleDocumentTable() {
  const { success, error } = useToast();
  const [documents, setDocuments] = useState(sampleDocuments);

  // Define columns
  const baseColumns: TableColumn<ExampleDocument>[] = [
    {
      key: 'title',
      title: '제목',
      dataIndex: 'title',
      render: (title, record) => (
        <div>
          <div className="font-medium text-gray-900">{title}</div>
          <div className="text-sm text-gray-500">{record.type} • {record.size}</div>
        </div>
      )
    },
    {
      key: 'author',
      title: '작성자',
      dataIndex: 'author'
    },
    {
      key: 'status',
      title: '상태',
      dataIndex: 'status',
      render: (status: ExampleDocument['status']) => {
        const colors: Record<ExampleDocument['status'], string> = {
          draft: 'bg-gray-100 text-gray-800',
          review: 'bg-yellow-100 text-yellow-800',
          approved: 'bg-green-100 text-green-800',
          published: 'bg-blue-100 text-blue-800'
        };
        const labels: Record<ExampleDocument['status'], string> = {
          draft: '초안',
          review: '검토중',
          approved: '승인됨',
          published: '게시됨'
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
            {labels[status]}
          </span>
        );
      }
    },
    {
      key: 'updatedAt',
      title: '수정일',
      dataIndex: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR')
    },
    {
      key: 'createdAt',
      title: '생성일',
      dataIndex: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR')
    },
    {
      key: 'tags',
      title: '태그',
      dataIndex: 'tags',
      render: (tags: string[]) => (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag: string, index: number) => (
            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              {tag}
            </span>
          ))}
        </div>
      )
    }
  ];

  // Apply column priorities
  const columns = applyColumnPriorities(baseColumns, COMMON_COLUMN_PRIORITIES.documentTable);

  // Add action column
  const columnsWithActions = [
    ...columns,
    createTableActionColumn<ExampleDocument>(
      ACTION_PRESETS.document(
        (doc) => success('보기', `${doc.title} 문서를 확인합니다.`),
        (doc) => success('수정', `${doc.title} 문서를 수정합니다.`),
        (doc) => success('공유', `${doc.title} 문서를 공유합니다.`),
        (doc) => success('다운로드', `${doc.title} 문서를 다운로드합니다.`),
        (doc) => {
          if (confirm(`${doc.title} 문서를 정말 삭제하시겠습니까?`)) {
            success('삭제', `${doc.title} 문서가 삭제되었습니다.`);
          }
        }
      ),
      { variant: 'auto', maxVisibleButtons: 3 }
    )
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">문서 관리</h2>
      </div>

      <ResponsiveTable
        columns={columnsWithActions}
        dataSource={documents}
        rowKey="id"
        mobileCardMode
        expandableRows
        showColumnToggle
        horizontalScroll
      />
    </div>
  );
}
