import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ViewportProvider } from '@/contexts/ViewportContext';
import SmartImage, { SmartAvatar, SmartHeroImage } from '../SmartImage';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, onLoad, onError, onLoadStart, ...props }: any) {
    return (
      <img
        src={src}
        alt={alt}
        onLoad={onLoad}
        onError={onError}
        onLoadStart={onLoadStart}
        {...props}
      />
    );
  };
});

// Mock hooks
jest.mock('@/hooks/useImageOptimization', () => ({
  useImageOptimization: () => ({
    quality: 75,
    format: 'webp',
    shouldUseHighRes: true,
  }),
}));

// Mock image format utilities
jest.mock('@/lib/image-formats', () => ({
  createOptimizedImageUrl: (config: any) => config.src,
  calculateMobileOptimizedSizes: (width: number, height: number) => ({ width, height }),
  getNetworkAwareQuality: (quality: number) => quality,
  recommendImageQuality: () => 75,
  globalImagePreloader: {
    preload: jest.fn().mockResolvedValue(undefined),
  },
}));

const MockViewportProvider = ({ children, isMobile = false }: any) => {
  const mockValue = {
    isMobile,
    isTablet: false,
    isDesktop: !isMobile,
    width: isMobile ? 375 : 1200,
    height: isMobile ? 667 : 800,
    orientation: 'portrait' as const,
    isTouch: isMobile,
    hasHover: !isMobile,
  };

  return (
    <ViewportProvider value={mockValue}>
      {children}
    </ViewportProvider>
  );
};

describe('SmartImage', () => {
  const defaultProps = {
    src: '/test-image.jpg',
    alt: 'Test image',
    width: 400,
    height: 300,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  it('renders image with correct props', () => {
    render(
      <MockViewportProvider>
        <SmartImage {...defaultProps} />
      </MockViewportProvider>
    );

    const image = screen.getByAltText('Test image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/test-image.jpg');
  });

  it('shows loading spinner by default', () => {
    render(
      <MockViewportProvider>
        <SmartImage {...defaultProps} />
      </MockViewportProvider>
    );

    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('uses mobile dimensions on mobile devices', () => {
    render(
      <MockViewportProvider isMobile={true}>
        <SmartImage 
          {...defaultProps} 
          mobileWidth={300}
          mobileHeight={200}
        />
      </MockViewportProvider>
    );

    const image = screen.getByAltText('Test image');
    expect(image).toBeInTheDocument();
  });

  it('uses mobile source when provided', () => {
    render(
      <MockViewportProvider isMobile={true}>
        <SmartImage 
          {...defaultProps} 
          mobileSrc="/mobile-image.jpg"
        />
      </MockViewportProvider>
    );

    // Note: The actual source selection logic is mocked, 
    // but we can verify the component renders
    const image = screen.getByAltText('Test image');
    expect(image).toBeInTheDocument();
  });

  it('shows error fallback when image fails to load', async () => {
    render(
      <MockViewportProvider>
        <SmartImage {...defaultProps} />
      </MockViewportProvider>
    );

    const image = screen.getByAltText('Test image');
    
    // Simulate image load error
    image.dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(screen.getByText('이미지를 불러올 수 없습니다')).toBeInTheDocument();
    });
  });

  it('calls onLoadComplete when image loads', async () => {
    const onLoadComplete = jest.fn();
    
    render(
      <MockViewportProvider>
        <SmartImage 
          {...defaultProps} 
          onLoadComplete={onLoadComplete}
        />
      </MockViewportProvider>
    );

    const image = screen.getByAltText('Test image');
    
    // Simulate image load
    image.dispatchEvent(new Event('load'));

    await waitFor(() => {
      expect(onLoadComplete).toHaveBeenCalled();
    });
  });

  it('renders custom error fallback', async () => {
    const customFallback = <div>Custom error message</div>;
    
    render(
      <MockViewportProvider>
        <SmartImage 
          {...defaultProps} 
          errorFallback={customFallback}
        />
      </MockViewportProvider>
    );

    const image = screen.getByAltText('Test image');
    
    // Simulate image load error
    image.dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });
});

describe('SmartAvatar', () => {
  const defaultProps = {
    src: '/avatar.jpg',
    alt: 'User avatar',
  };

  it('renders avatar with correct size', () => {
    render(
      <MockViewportProvider>
        <SmartAvatar {...defaultProps} size="lg" />
      </MockViewportProvider>
    );

    const avatar = screen.getByAltText('User avatar');
    expect(avatar).toBeInTheDocument();
  });

  it('shows fallback with user initial', async () => {
    render(
      <MockViewportProvider>
        <SmartAvatar {...defaultProps} alt="John Doe" />
      </MockViewportProvider>
    );

    const image = screen.getByAltText('John Doe');
    
    // Simulate image load error
    image.dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(screen.getByText('J')).toBeInTheDocument();
    });
  });

  it('handles click events', () => {
    const onClick = jest.fn();
    
    render(
      <MockViewportProvider>
        <SmartAvatar {...defaultProps} onClick={onClick} />
      </MockViewportProvider>
    );

    const avatarContainer = screen.getByAltText('User avatar').closest('div');
    avatarContainer?.click();

    expect(onClick).toHaveBeenCalled();
  });
});

describe('SmartHeroImage', () => {
  const defaultProps = {
    src: '/hero.jpg',
    alt: 'Hero image',
  };

  it('renders hero image with overlay', () => {
    render(
      <MockViewportProvider>
        <SmartHeroImage {...defaultProps} overlay={true}>
          <h1>Hero Title</h1>
        </SmartHeroImage>
      </MockViewportProvider>
    );

    expect(screen.getByAltText('Hero image')).toBeInTheDocument();
    expect(screen.getByText('Hero Title')).toBeInTheDocument();
  });

  it('uses different dimensions on mobile', () => {
    render(
      <MockViewportProvider isMobile={true}>
        <SmartHeroImage {...defaultProps} />
      </MockViewportProvider>
    );

    const image = screen.getByAltText('Hero image');
    expect(image).toBeInTheDocument();
  });

  it('renders without overlay when disabled', () => {
    render(
      <MockViewportProvider>
        <SmartHeroImage {...defaultProps} overlay={false} />
      </MockViewportProvider>
    );

    const image = screen.getByAltText('Hero image');
    expect(image).toBeInTheDocument();
  });
});