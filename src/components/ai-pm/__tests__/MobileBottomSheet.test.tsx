import React from 'react';
import { render, screen } from '@testing-library/react';
import { ViewportProvider } from '@/contexts/ViewportContext';
import MobileBottomSheet from '../MobileBottomSheet';

// Mock the useViewport hook to simulate mobile environment
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

describe('MobileBottomSheet', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    children: <div>Test Content</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open on mobile', () => {
    render(<MobileBottomSheet {...defaultProps} />);
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<MobileBottomSheet {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  it('renders drag handle', () => {
    render(<MobileBottomSheet {...defaultProps} />);
    
    // The drag handle should be present (it's a div with specific styling)
    const dragHandle = document.querySelector('.w-12.h-1.bg-gray-300.rounded-full');
    expect(dragHandle).toBeInTheDocument();
  });

  it('renders backdrop', () => {
    render(<MobileBottomSheet {...defaultProps} />);
    
    // The backdrop should be present
    const backdrop = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
    expect(backdrop).toBeInTheDocument();
  });
});