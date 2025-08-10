import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileActionMenu, { ActionMenuItem } from '../MobileActionMenu';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';

// Mock the useBreakpoint hook
jest.mock('@/hooks/useBreakpoint');
const mockUseBreakpoint = useBreakpoint as jest.MockedFunction<typeof useBreakpoint>;

const mockActions: ActionMenuItem[] = [
  {
    key: 'view',
    label: '보기',
    icon: EyeIcon,
    onClick: jest.fn()
  },
  {
    key: 'edit',
    label: '수정',
    icon: PencilIcon,
    onClick: jest.fn()
  },
  {
    key: 'delete',
    label: '삭제',
    icon: TrashIcon,
    onClick: jest.fn(),
    danger: true
  }
];

describe('MobileActionMenu', () => {
  beforeEach(() => {
    // Clear all mocks
    mockActions.forEach(action => {
      (action.onClick as jest.Mock).mockClear();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Desktop View', () => {
    beforeEach(() => {
      mockUseBreakpoint.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        current: 'desktop',
        width: 1200,
        height: 800
      });
    });

    it('renders trigger button', () => {
      render(<MobileActionMenu items={mockActions} />);
      
      const triggerButton = screen.getByLabelText('액션 메뉴');
      expect(triggerButton).toBeInTheDocument();
      expect(triggerButton).toHaveAttribute('aria-expanded', 'false');
      expect(triggerButton).toHaveAttribute('aria-haspopup', 'true');
    });

    it('opens dropdown menu on click', async () => {
      render(<MobileActionMenu items={mockActions} />);
      
      const triggerButton = screen.getByLabelText('액션 메뉴');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('보기')).toBeInTheDocument();
        expect(screen.getByText('수정')).toBeInTheDocument();
        expect(screen.getByText('삭제')).toBeInTheDocument();
      });

      expect(triggerButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('executes action on menu item click', async () => {
      render(<MobileActionMenu items={mockActions} />);
      
      // Open menu
      fireEvent.click(screen.getByLabelText('액션 메뉴'));

      await waitFor(() => {
        expect(screen.getByText('보기')).toBeInTheDocument();
      });

      // Click action
      fireEvent.click(screen.getByText('보기'));

      expect(mockActions[0].onClick).toHaveBeenCalled();
    });

    it('closes menu after action click', async () => {
      render(<MobileActionMenu items={mockActions} />);
      
      // Open menu
      fireEvent.click(screen.getByLabelText('액션 메뉴'));

      await waitFor(() => {
        expect(screen.getByText('보기')).toBeInTheDocument();
      });

      // Click action
      fireEvent.click(screen.getByText('보기'));

      // Menu should close
      await waitFor(() => {
        expect(screen.queryByText('보기')).not.toBeInTheDocument();
      });
    });

    it('applies danger styling to danger actions', async () => {
      render(<MobileActionMenu items={mockActions} />);
      
      fireEvent.click(screen.getByLabelText('액션 메뉴'));

      await waitFor(() => {
        const deleteButton = screen.getByText('삭제').closest('button');
        expect(deleteButton).toHaveClass('text-red-600');
      });
    });

    it('closes menu on outside click', async () => {
      render(
        <div>
          <MobileActionMenu items={mockActions} />
          <div data-testid="outside">Outside element</div>
        </div>
      );
      
      // Open menu
      fireEvent.click(screen.getByLabelText('액션 메뉴'));

      await waitFor(() => {
        expect(screen.getByText('보기')).toBeInTheDocument();
      });

      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByText('보기')).not.toBeInTheDocument();
      });
    });

    it('closes menu on escape key', async () => {
      render(<MobileActionMenu items={mockActions} />);
      
      // Open menu
      fireEvent.click(screen.getByLabelText('액션 메뉴'));

      await waitFor(() => {
        expect(screen.getByText('보기')).toBeInTheDocument();
      });

      // Press escape
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('보기')).not.toBeInTheDocument();
      });
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

    it('opens modal instead of dropdown on mobile', async () => {
      render(<MobileActionMenu items={mockActions} />);
      
      const triggerButton = screen.getByLabelText('액션 메뉴');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('액션 선택')).toBeInTheDocument();
        expect(screen.getByText('보기')).toBeInTheDocument();
        expect(screen.getByText('취소')).toBeInTheDocument();
      });
    });

    it('has larger touch targets on mobile', async () => {
      render(<MobileActionMenu items={mockActions} />);
      
      const triggerButton = screen.getByLabelText('액션 메뉴');
      expect(triggerButton).toHaveClass('min-w-[44px]', 'min-h-[44px]');

      fireEvent.click(triggerButton);

      await waitFor(() => {
        const actionButton = screen.getByText('보기').closest('button');
        expect(actionButton).toHaveClass('min-h-[56px]');
      });
    });

    it('closes modal on cancel button click', async () => {
      render(<MobileActionMenu items={mockActions} />);
      
      // Open modal
      fireEvent.click(screen.getByLabelText('액션 메뉴'));

      await waitFor(() => {
        expect(screen.getByText('액션 선택')).toBeInTheDocument();
      });

      // Click cancel
      fireEvent.click(screen.getByText('취소'));

      await waitFor(() => {
        expect(screen.queryByText('액션 선택')).not.toBeInTheDocument();
      });
    });

    it('closes modal on close button click', async () => {
      render(<MobileActionMenu items={mockActions} />);
      
      // Open modal
      fireEvent.click(screen.getByLabelText('액션 메뉴'));

      await waitFor(() => {
        expect(screen.getByText('액션 선택')).toBeInTheDocument();
      });

      // Click close button
      fireEvent.click(screen.getByLabelText('닫기'));

      await waitFor(() => {
        expect(screen.queryByText('액션 선택')).not.toBeInTheDocument();
      });
    });
  });

  describe('Disabled State', () => {
    it('does not render when disabled', () => {
      render(<MobileActionMenu items={mockActions} disabled />);
      
      const triggerButton = screen.getByLabelText('액션 메뉴');
      expect(triggerButton).toBeDisabled();
    });

    it('filters out disabled actions', () => {
      const actionsWithDisabled = [
        ...mockActions,
        {
          key: 'disabled',
          label: '비활성화됨',
          onClick: jest.fn(),
          disabled: true
        }
      ];

      render(<MobileActionMenu items={actionsWithDisabled} />);
      
      fireEvent.click(screen.getByLabelText('액션 메뉴'));

      // Should not show disabled action
      expect(screen.queryByText('비활성화됨')).not.toBeInTheDocument();
    });

    it('does not render when all actions are disabled', () => {
      const disabledActions = mockActions.map(action => ({
        ...action,
        disabled: true
      }));

      const { container } = render(<MobileActionMenu items={disabledActions} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Placement', () => {
    beforeEach(() => {
      mockUseBreakpoint.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        current: 'desktop',
        width: 1200,
        height: 800
      });
    });

    it('applies correct placement classes', async () => {
      render(<MobileActionMenu items={mockActions} placement="bottom-left" />);
      
      fireEvent.click(screen.getByLabelText('액션 메뉴'));

      await waitFor(() => {
        const menu = screen.getByRole('menu');
        expect(menu).toHaveClass('top-full', 'left-0', 'mt-1');
      });
    });

    it('applies bottom-right placement', async () => {
      render(<MobileActionMenu items={mockActions} placement="bottom-right" />);
      
      fireEvent.click(screen.getByLabelText('액션 메뉴'));

      await waitFor(() => {
        const menu = screen.getByRole('menu');
        expect(menu).toHaveClass('top-full', 'right-0', 'mt-1');
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseBreakpoint.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        current: 'desktop',
        width: 1200,
        height: 800
      });
    });

    it('has proper ARIA attributes', () => {
      render(<MobileActionMenu items={mockActions} />);
      
      const triggerButton = screen.getByLabelText('액션 메뉴');
      expect(triggerButton).toHaveAttribute('aria-expanded', 'false');
      expect(triggerButton).toHaveAttribute('aria-haspopup', 'true');
    });

    it('updates aria-expanded when menu opens', async () => {
      render(<MobileActionMenu items={mockActions} />);
      
      const triggerButton = screen.getByLabelText('액션 메뉴');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(triggerButton).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('has proper menu role and menuitem roles', async () => {
      render(<MobileActionMenu items={mockActions} />);
      
      fireEvent.click(screen.getByLabelText('액션 메뉴'));

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(screen.getAllByRole('menuitem')).toHaveLength(3);
      });
    });
  });
});