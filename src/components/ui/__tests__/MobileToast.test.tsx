import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileToast } from '../MobileToast';
import { ViewportProvider } from '@/contexts/ViewportContext';
import { Toast } from '@/contexts/ToastContext';

// Mock the viewport context
const mockViewport = {
  isMobile: true,
  isTouch: true,
  width: 375,
  height: 667,
  breakpoint: 'mobile' as const,
  isTablet: false,
  isDesktop: false,
  orientation: 'portrait' as const,
  isOnline: true,
  hasHover: false
};

jest.mock('@/contexts/ViewportContext', () => ({
  useViewport: () => mockViewport,
  ViewportProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const mockToast: Toast = {
  id: 'test-toast',
  type: 'info',
  title: 'Test Notification',
  message: 'This is a test message',
  duration: 5000,
  allowSwipeDismiss: true,
  hapticFeedback: true
};

describe('MobileToast', () => {
  const mockOnRemove = jest.fn();
  const mockOnSwipeStart = jest.fn();
  const mockOnSwipeEnd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders toast with title and message', () => {
    render(
      <ViewportProvider>
        <MobileToast
          toast={mockToast}
          onRemove={mockOnRemove}
          onSwipeStart={mockOnSwipeStart}
          onSwipeEnd={mockOnSwipeEnd}
        />
      </ViewportProvider>
    );

    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(screen.getByText('This is a test message')).toBeInTheDocument();
  });

  it('calls onRemove when close button is clicked', () => {
    render(
      <ViewportProvider>
        <MobileToast
          toast={mockToast}
          onRemove={mockOnRemove}
          onSwipeStart={mockOnSwipeStart}
          onSwipeEnd={mockOnSwipeEnd}
        />
      </ViewportProvider>
    );

    const closeButton = screen.getByLabelText('알림 닫기');
    fireEvent.click(closeButton);

    expect(mockOnRemove).toHaveBeenCalledWith('test-toast');
  });

  it('renders action button when action is provided', () => {
    const toastWithAction: Toast = {
      ...mockToast,
      action: {
        label: 'View Details',
        onClick: jest.fn()
      }
    };

    render(
      <ViewportProvider>
        <MobileToast
          toast={toastWithAction}
          onRemove={mockOnRemove}
          onSwipeStart={mockOnSwipeStart}
          onSwipeEnd={mockOnSwipeEnd}
        />
      </ViewportProvider>
    );

    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  it('applies mobile-specific styles when on mobile', () => {
    render(
      <ViewportProvider>
        <MobileToast
          toast={mockToast}
          onRemove={mockOnRemove}
          onSwipeStart={mockOnSwipeStart}
          onSwipeEnd={mockOnSwipeEnd}
        />
      </ViewportProvider>
    );

    const toastElement = screen.getByRole('alert');
    expect(toastElement).toHaveClass('mx-4'); // Mobile margin
  });

  it('shows progress bar for timed toasts', () => {
    render(
      <ViewportProvider>
        <MobileToast
          toast={mockToast}
          onRemove={mockOnRemove}
          onSwipeStart={mockOnSwipeStart}
          onSwipeEnd={mockOnSwipeEnd}
        />
      </ViewportProvider>
    );

    // Progress bar should be present for timed toasts
    const progressBar = screen.getByRole('alert').querySelector('[style*="animation"]');
    expect(progressBar).toBeInTheDocument();
  });
});