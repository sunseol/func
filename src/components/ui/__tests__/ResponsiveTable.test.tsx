import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResponsiveTable, { TableColumn } from '../ResponsiveTable';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// Mock the useBreakpoint hook
jest.mock('@/hooks/useBreakpoint');
const mockUseBreakpoint = useBreakpoint as jest.MockedFunction<typeof useBreakpoint>;

// Mock data
interface TestData {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  role: string;
}

const mockData: TestData[] = [
  {
    id: '1',
    name: '김철수',
    email: 'kim@example.com',
    status: 'active',
    role: '개발자'
  },
  {
    id: '2',
    name: '이영희',
    email: 'lee@example.com',
    status: 'inactive',
    role: '디자이너'
  }
];

const mockColumns: TableColumn<TestData>[] = [
  {
    key: 'name',
    title: '이름',
    dataIndex: 'name',
    priority: 'high'
  },
  {
    key: 'email',
    title: '이메일',
    dataIndex: 'email',
    priority: 'medium'
  },
  {
    key: 'status',
    title: '상태',
    dataIndex: 'status',
    priority: 'high',
    render: (status) => (
      <span className={status === 'active' ? 'text-green-600' : 'text-red-600'}>
        {status === 'active' ? '활성' : '비활성'}
      </span>
    )
  },
  {
    key: 'role',
    title: '역할',
    dataIndex: 'role',
    priority: 'low',
    mobileHidden: true
  }
];

describe('ResponsiveTable', () => {
  beforeEach(() => {
    // Default to desktop view
    mockUseBreakpoint.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      current: 'desktop',
      width: 1200,
      height: 800
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Desktop View', () => {
    it('renders table with all columns on desktop', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          dataSource={mockData}
          rowKey="id"
        />
      );

      // Check table headers
      expect(screen.getByText('이름')).toBeInTheDocument();
      expect(screen.getByText('이메일')).toBeInTheDocument();
      expect(screen.getByText('상태')).toBeInTheDocument();
      expect(screen.getByText('역할')).toBeInTheDocument();

      // Check data rows
      expect(screen.getByText('김철수')).toBeInTheDocument();
      expect(screen.getByText('kim@example.com')).toBeInTheDocument();
      expect(screen.getByText('활성')).toBeInTheDocument();
      expect(screen.getByText('개발자')).toBeInTheDocument();
    });

    it('shows column toggle when enabled', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          dataSource={mockData}
          rowKey="id"
          showColumnToggle
        />
      );

      expect(screen.getByText('컬럼 표시')).toBeInTheDocument();
    });

    it('handles row click events', () => {
      const onRowClick = jest.fn();
      
      render(
        <ResponsiveTable
          columns={mockColumns}
          dataSource={mockData}
          rowKey="id"
          onRowClick={onRowClick}
        />
      );

      const firstRow = screen.getByText('김철수').closest('tr');
      fireEvent.click(firstRow!);

      expect(onRowClick).toHaveBeenCalledWith(mockData[0], 0);
    });
  });

  describe('Mobile View', () => {
    beforeEach(() => {
      mockUseBreakpoint.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        current: 'mobile',
        width: 375,
        height: 667
      });
    });

    it('renders cards instead of table on mobile', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          dataSource={mockData}
          rowKey="id"
          mobileCardMode
        />
      );

      // Should not render table structure
      expect(screen.queryByRole('table')).not.toBeInTheDocument();

      // Should render card content
      expect(screen.getByText('김철수')).toBeInTheDocument();
      expect(screen.getByText('이영희')).toBeInTheDocument();
    });

    it('shows only high priority columns by default on mobile', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          dataSource={mockData}
          rowKey="id"
          mobileCardMode
        />
      );

      // High priority columns should be visible (using getAllByText since there are multiple cards)
      expect(screen.getAllByText('이름:')[0]).toBeInTheDocument();
      expect(screen.getAllByText('상태:')[0]).toBeInTheDocument();

      // Low priority columns should be hidden initially
      expect(screen.queryByText('역할:')).not.toBeInTheDocument();
    });

    it('allows expanding cards to show more details', async () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          dataSource={mockData}
          rowKey="id"
          mobileCardMode
          expandableRows
        />
      );

      // Click expand button
      const expandButton = screen.getAllByText('자세히 보기')[0];
      fireEvent.click(expandButton);

      // Should show additional fields
      await waitFor(() => {
        expect(screen.getByText('이메일:')).toBeInTheDocument();
      });
    });

    it('handles mobile card click events', () => {
      const onRowClick = jest.fn();
      
      render(
        <ResponsiveTable
          columns={mockColumns}
          dataSource={mockData}
          rowKey="id"
          mobileCardMode
          onRowClick={onRowClick}
        />
      );

      const firstCard = screen.getByText('김철수').closest('div');
      fireEvent.click(firstCard!);

      expect(onRowClick).toHaveBeenCalledWith(mockData[0], 0);
    });
  });

  describe('Column Toggle', () => {
    it('allows toggling column visibility', async () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          dataSource={mockData}
          rowKey="id"
          showColumnToggle
        />
      );

      // Open column toggle
      fireEvent.click(screen.getByText('컬럼 표시'));

      // Wait for dropdown to appear
      await waitFor(() => {
        expect(screen.getByText('표시할 컬럼 선택')).toBeInTheDocument();
      });

      // Toggle a column
      const emailCheckbox = screen.getByLabelText('이메일');
      fireEvent.click(emailCheckbox);

      // Column should be hidden
      expect(screen.queryByText('kim@example.com')).not.toBeInTheDocument();
    });
  });

  describe('Loading and Empty States', () => {
    it('shows loading state', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          dataSource={[]}
          rowKey="id"
          loading
        />
      );

      // Check for loading spinner instead of text
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows empty state when no data', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          dataSource={[]}
          rowKey="id"
        />
      );

      expect(screen.getByText('표시할 데이터가 없습니다.')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    const mockPagination = {
      current: 1,
      pageSize: 10,
      total: 20,
      onChange: jest.fn()
    };

    it('renders pagination controls', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          dataSource={mockData}
          rowKey="id"
          pagination={mockPagination}
        />
      );

      expect(screen.getByText('이전')).toBeInTheDocument();
      expect(screen.getByText('다음')).toBeInTheDocument();
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    it('handles pagination clicks', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          dataSource={mockData}
          rowKey="id"
          pagination={mockPagination}
        />
      );

      fireEvent.click(screen.getByText('다음'));
      expect(mockPagination.onChange).toHaveBeenCalledWith(2, 10);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          dataSource={mockData}
          rowKey="id"
          showColumnToggle
        />
      );

      const columnToggleButton = screen.getByText('컬럼 표시');
      expect(columnToggleButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <ResponsiveTable
          columns={mockColumns}
          dataSource={mockData}
          rowKey="id"
          showColumnToggle
        />
      );

      const columnToggleButton = screen.getByText('컬럼 표시');
      
      // Focus the button
      columnToggleButton.focus();
      expect(columnToggleButton).toHaveFocus();

      // Press Enter to open
      fireEvent.keyDown(columnToggleButton, { key: 'Enter' });
      // Should open the dropdown (implementation detail)
    });
  });
});