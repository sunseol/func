import { useState, useEffect, useRef, useCallback } from 'react';
import MobilePerformanceOptimizer, { OptimizationConfig, OptimizationState } from '@/lib/mobile-performance-optimizer';

interface UsePerformanceOptimizerOptions extends Partial<OptimizationConfig> {
  enabled?: boolean;
  autoStart?: boolean;
}

export const usePerformanceOptimizer = (options: UsePerformanceOptimizerOptions = {}) => {
  const {
    enabled = true,
    autoStart = true,
    ...optimizerConfig
  } = options;

  const [state, setState] = useState<OptimizationState>({
    isActive: false,
    appliedOptimizations: [],
    lastOptimizationTime: 0,
    performanceGain: 0
  });

  const [isSupported, setIsSupported] = useState(false);
  const optimizerRef = useRef<MobilePerformanceOptimizer | null>(null);

  // 옵티마이저 초기화
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    try {
      optimizerRef.current = new MobilePerformanceOptimizer({
        enableAutoOptimization: autoStart,
        ...optimizerConfig
      });
      
      setIsSupported(true);

      // 상태 업데이트를 위한 폴링
      const updateState = () => {
        if (optimizerRef.current) {
          setState(optimizerRef.current.getState());
        }
      };

      const interval = setInterval(updateState, 1000);

      return () => {
        clearInterval(interval);
        if (optimizerRef.current) {
          optimizerRef.current.destroy();
        }
      };
    } catch (error) {
      console.error('Performance optimizer initialization failed:', error);
      setIsSupported(false);
    }
  }, [enabled, autoStart, optimizerConfig]);

  // 수동 최적화 적용
  const applyOptimizations = useCallback(() => {
    if (optimizerRef.current) {
      optimizerRef.current.forceOptimization();
      setState(optimizerRef.current.getState());
    }
  }, []);

  // 최적화 해제
  const removeOptimizations = useCallback(() => {
    if (optimizerRef.current) {
      optimizerRef.current.forceRestore();
      setState(optimizerRef.current.getState());
    }
  }, []);

  // 최적화 토글
  const toggleOptimizations = useCallback(() => {
    if (state.isActive) {
      removeOptimizations();
    } else {
      applyOptimizations();
    }
  }, [state.isActive, applyOptimizations, removeOptimizations]);

  // 설정 업데이트
  const updateConfig = useCallback((newConfig: Partial<OptimizationConfig>) => {
    if (optimizerRef.current) {
      optimizerRef.current.updateConfig(newConfig);
    }
  }, []);

  // 성능 리포트 생성
  const generateReport = useCallback(() => {
    if (!optimizerRef.current) return null;

    const currentState = optimizerRef.current.getState();
    
    return {
      timestamp: new Date().toISOString(),
      optimizationState: currentState,
      recommendations: generateRecommendations(currentState),
      summary: {
        isOptimized: currentState.isActive,
        optimizationCount: currentState.appliedOptimizations.length,
        performanceGain: currentState.performanceGain,
        lastOptimized: new Date(currentState.lastOptimizationTime).toLocaleString()
      }
    };
  }, []);

  return {
    // 상태
    state,
    isSupported,
    isActive: state.isActive,
    appliedOptimizations: state.appliedOptimizations,
    performanceGain: state.performanceGain,
    
    // 액션
    applyOptimizations,
    removeOptimizations,
    toggleOptimizations,
    updateConfig,
    generateReport
  };
};

// 권장사항 생성 함수
function generateRecommendations(state: OptimizationState): string[] {
  const recommendations: string[] = [];

  if (!state.isActive) {
    recommendations.push('성능 최적화가 비활성화되어 있습니다. 배터리 절약을 위해 활성화를 고려해보세요.');
  }

  if (state.performanceGain < 5) {
    recommendations.push('성능 향상이 미미합니다. 더 적극적인 최적화 모드를 사용해보세요.');
  }

  if (state.appliedOptimizations.length < 3) {
    recommendations.push('더 많은 최적화 옵션을 활성화할 수 있습니다.');
  }

  if (state.appliedOptimizations.includes('animations')) {
    recommendations.push('애니메이션이 최적화되었습니다. 일부 시각적 효과가 제한될 수 있습니다.');
  }

  if (state.appliedOptimizations.includes('images')) {
    recommendations.push('이미지 품질이 최적화되었습니다. 더 나은 화질을 원한다면 최적화를 해제하세요.');
  }

  if (Date.now() - state.lastOptimizationTime > 300000) { // 5분
    recommendations.push('최적화가 오래전에 적용되었습니다. 현재 성능 상태를 다시 확인해보세요.');
  }

  return recommendations;
}

export default usePerformanceOptimizer;