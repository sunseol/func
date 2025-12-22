import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PerformanceDashboard from '../PerformanceDashboard';

jest.mock('@/hooks/useBreakpoint', () => ({
  useBreakpoint: () => ({ isMobile: true }),
}));

jest.mock('@/hooks/useMobilePerformanceMonitor', () => ({
  useMobilePerformanceMonitor: () => ({
    metrics: {
      fps: 58,
      memoryUsage: 45,
      cpuUsage: 65,
      renderTime: 12,
      touchResponseTime: 25,
      networkLatency: 150,
      domNodes: 1200,
      eventListeners: 45,
      imageLoadTime: 2500,
      bundleSize: 1.8,
      cacheHitRate: 85,
      longTasks: 2,
      inputDelay: 15,
      visualStability: 0.05,
      scrollPerformance: 8,
      paintTime: 5,
      layoutTime: 3,
    },
    alerts: [
      {
        type: 'warning',
        metric: 'fps',
        value: 58,
        threshold: 60,
        timestamp: Date.now(),
        message: 'Low FPS detected',
      },
    ],
    isMonitoring: true,
    clearAlerts: jest.fn(),
    generateReport: jest.fn(() => ({
      timestamp: new Date().toISOString(),
      metrics: {},
      thresholds: {},
      alerts: 1,
      recommendations: ['Optimize animations'],
    })),
    thresholds: {
      minFps: 60,
      maxMemoryUsage: 50,
      maxCpuUsage: 70,
      maxRenderTime: 16,
      maxTouchDelay: 100,
      maxNetworkLatency: 200,
      maxDomNodes: 1500,
      maxEventListeners: 100,
      maxImageLoadTime: 3000,
      maxBundleSize: 2,
      minCacheHitRate: 80,
      maxLongTasks: 5,
      maxInputDelay: 50,
      minVisualStability: 0.1,
      maxPaintTime: 10,
      maxLayoutTime: 5,
    },
  }),
}));

jest.mock('@/hooks/usePerformanceOptimizer', () => ({
  usePerformanceOptimizer: () => ({
    state: {
      isActive: false,
      appliedOptimizations: [],
      lastOptimizationTime: 0,
      performanceGain: 0,
    },
    isSupported: true,
    applyOptimizations: jest.fn(),
    removeOptimizations: jest.fn(),
    toggleOptimizations: jest.fn(),
    generateReport: jest.fn(() => ({
      timestamp: new Date().toISOString(),
      optimizationState: {},
      recommendations: [],
      summary: {},
    })),
  }),
}));

jest.mock('@/hooks/useBatteryOptimization', () => ({
  useBatteryOptimization: () => ({
    batteryInfo: {
      level: 0.75,
      charging: false,
      chargingTime: Infinity,
      dischargingTime: 3600,
    },
    optimizationState: {
      isLowBattery: false,
      isCriticalBattery: false,
      isOptimized: false,
      optimizationsApplied: [],
    },
    isSupported: true,
    toggleOptimization: jest.fn(),
  }),
}));

describe('PerformanceDashboard', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('renders in development on mobile', () => {
    render(<PerformanceDashboard />);

    expect(screen.getByText('성능 대시보드')).toBeInTheDocument();
    expect(screen.getByText('58')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText('1개의 성능 이슈')).toBeInTheDocument();
    expect(screen.getByText('없음')).toBeInTheDocument();
  });

  it('uses warning color when below min threshold', () => {
    render(<PerformanceDashboard />);
    const fps = screen.getByText('58');
    expect(fps).toHaveClass('text-yellow-600');
  });

  it('expands and shows battery tab', async () => {
    render(<PerformanceDashboard />);

    const buttons = screen.getAllByRole('button');
    const expandButton = buttons.find((button) => !button.getAttribute('title'));
    fireEvent.click(expandButton!);

    await waitFor(() => {
      expect(screen.getByText('배터리')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('배터리'));

    await waitFor(() => {
      expect(screen.getByText('배터리 최적화')).toBeInTheDocument();
      expect(screen.getByText('배터리 레벨:')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('방전 중')).toBeInTheDocument();
    });
  });

  it('downloads report', () => {
    process.env.NODE_ENV = 'development';
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();

    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();
    const mockClick = jest.fn();

    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
    };

    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    jest.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

    render(<PerformanceDashboard />);

    fireEvent.click(screen.getByTitle('리포트 다운로드'));

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor);
    expect(mockClick).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchor);
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('does not render in production', () => {
    process.env.NODE_ENV = 'production';
    const { container } = render(<PerformanceDashboard />);
    expect(container.firstChild).toBeNull();
  });
});

