import React from 'react';
import { render, screen } from '@testing-library/react';
import { ViewportProvider } from '@/contexts/ViewportContext';
import MobileWorkflowProgress from '../MobileWorkflowProgress';

// Mock the useViewport hook
jest.mock('@/contexts/ViewportContext', () => ({
  ViewportProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useViewport: () => ({
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    height: 800,
    width: 375,
    current: 'xs',
    deviceType: 'mobile',
    isTouch: true,
    hasHover: false,
    orientation: 'portrait',
    isOnline: true
  })
}));

describe('MobileWorkflowProgress', () => {
  const defaultProps = {
    currentStep: 3 as const,
    completedSteps: [1, 2] as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders compact variant by default', () => {
    render(<MobileWorkflowProgress {...defaultProps} />);
    
    expect(screen.getByText('워크플로우 진행률')).toBeInTheDocument();
    expect(screen.getByText('3. 설계')).toBeInTheDocument(); // Mobile shows short labels
  });

  it('shows correct completion percentage', () => {
    render(<MobileWorkflowProgress {...defaultProps} showPercentage={true} />);
    
    // 2 completed out of 9 total = 22%
    expect(screen.getByText('22%')).toBeInTheDocument();
    expect(screen.getByText('2/9 단계 완료')).toBeInTheDocument();
  });

  it('renders detailed variant', () => {
    render(<MobileWorkflowProgress {...defaultProps} variant="detailed" />);
    
    expect(screen.getByText('워크플로우 단계')).toBeInTheDocument();
    expect(screen.getByText('진행 중')).toBeInTheDocument();
  });

  it('renders circular variant', () => {
    render(<MobileWorkflowProgress {...defaultProps} variant="circular" />);
    
    expect(screen.getByText('22%')).toBeInTheDocument();
    expect(screen.getByText('완료된 단계')).toBeInTheDocument();
    expect(screen.getByText('2개')).toBeInTheDocument();
  });

  it('uses short labels on mobile', () => {
    render(<MobileWorkflowProgress {...defaultProps} variant="compact" />);
    
    // Should show short label "설계" instead of full "기술 설계"
    expect(screen.getByText('3. 설계')).toBeInTheDocument();
  });
});