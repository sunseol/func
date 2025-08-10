'use client';

import React, { useState, useEffect } from 'react';
import { 
  HandRaisedIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useViewport } from '@/contexts/ViewportContext';

interface GestureTutorialProps {
  show: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

/**
 * Interactive tutorial component for notification gestures
 * Shows users how to interact with notifications using touch gestures
 */
export const GestureTutorial: React.FC<GestureTutorialProps> = ({
  show,
  onClose,
  onComplete
}) => {
  const { isMobile, isTouch } = useViewport();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [show]);

  const tutorialSteps = [
    {
      title: '알림 제스처 가이드',
      description: '터치 제스처로 알림을 쉽게 관리하세요',
      icon: HandRaisedIcon,
      gesture: null,
      content: '알림을 효율적으로 관리할 수 있는 제스처들을 알아보세요.'
    },
    {
      title: '좌우 스와이프로 닫기',
      description: '알림을 좌우로 스와이프하여 닫을 수 있습니다',
      icon: ArrowLeftIcon,
      gesture: 'swipe-horizontal',
      content: '일반 알림은 좌우로 스와이프하면 바로 닫힙니다.'
    },
    {
      title: '아래로 스와이프로 스누즈',
      description: '중요한 알림을 아래로 스와이프하여 나중에 다시 보기',
      icon: ArrowDownIcon,
      gesture: 'swipe-down',
      content: '중요한 알림을 잠시 숨기고 나중에 다시 표시할 수 있습니다.'
    },
    {
      title: '탭하여 액션 실행',
      description: '알림을 탭하면 관련 액션이 실행됩니다',
      icon: HandRaisedIcon,
      gesture: 'tap',
      content: '알림을 탭하면 설정된 액션이 바로 실행됩니다.'
    },
    {
      title: '길게 눌러서 옵션 보기',
      description: '알림을 길게 누르면 추가 옵션을 볼 수 있습니다',
      icon: HandRaisedIcon,
      gesture: 'long-press',
      content: '길게 누르면 더 많은 옵션과 설정을 확인할 수 있습니다.'
    }
  ];

  const currentStepData = tutorialSteps[currentStep];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete?.();
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  if (!show || !isTouch) return null;

  return (
    <div className={`
      fixed inset-0 z-[10001] bg-black/50 backdrop-blur-sm
      flex items-center justify-center p-4
      transition-all duration-300
      ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
    `}>
      <div className={`
        bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
        max-w-sm w-full mx-4 overflow-hidden
        transform transition-all duration-300
        ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
      `}>
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="튜토리얼 건너뛰기"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <currentStepData.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentStepData.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentStepData.description}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-4">
          {/* Gesture demonstration */}
          {currentStepData.gesture && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <GestureDemo gesture={currentStepData.gesture} />
            </div>
          )}
          
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {currentStepData.content}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="px-6 pb-4">
          <div className="flex gap-2">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`
                  h-2 rounded-full flex-1 transition-colors duration-200
                  ${index <= currentStep 
                    ? 'bg-blue-500' 
                    : 'bg-gray-200 dark:bg-gray-700'
                  }
                `}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          {currentStep > 0 && (
            <button
              onClick={handlePrevious}
              className="flex-1 py-3 px-4 text-gray-600 dark:text-gray-400 
                       hover:text-gray-800 dark:hover:text-gray-200 
                       transition-colors font-medium"
            >
              이전
            </button>
          )}
          
          <button
            onClick={handleNext}
            className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 
                     text-white rounded-lg font-medium transition-colors"
          >
            {currentStep === tutorialSteps.length - 1 ? '완료' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Gesture demonstration component
interface GestureDemoProps {
  gesture: string;
}

const GestureDemo: React.FC<GestureDemoProps> = ({ gesture }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const renderGestureDemo = () => {
    switch (gesture) {
      case 'swipe-horizontal':
        return (
          <div className="flex items-center justify-center h-16 relative">
            <div className="w-16 h-10 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <ArrowRightIcon 
              className={`
                w-6 h-6 text-blue-500 ml-2 transition-transform duration-1000
                ${isAnimating ? 'translate-x-4 opacity-50' : 'translate-x-0 opacity-100'}
              `} 
            />
          </div>
        );
      
      case 'swipe-down':
        return (
          <div className="flex flex-col items-center justify-center h-16 relative">
            <div className="w-16 h-8 bg-yellow-200 dark:bg-yellow-800 rounded-lg flex items-center justify-center">
              <InformationCircleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <ArrowDownIcon 
              className={`
                w-6 h-6 text-yellow-500 mt-1 transition-transform duration-1000
                ${isAnimating ? 'translate-y-2 opacity-50' : 'translate-y-0 opacity-100'}
              `} 
            />
          </div>
        );
      
      case 'tap':
        return (
          <div className="flex items-center justify-center h-16 relative">
            <div 
              className={`
                w-16 h-10 bg-green-200 dark:bg-green-800 rounded-lg 
                flex items-center justify-center transition-transform duration-200
                ${isAnimating ? 'scale-95' : 'scale-100'}
              `}
            >
              <InformationCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            {isAnimating && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-12 border-2 border-green-400 rounded-lg animate-ping" />
              </div>
            )}
          </div>
        );
      
      case 'long-press':
        return (
          <div className="flex items-center justify-center h-16 relative">
            <div 
              className={`
                w-16 h-10 bg-purple-200 dark:bg-purple-800 rounded-lg 
                flex items-center justify-center transition-all duration-1000
                ${isAnimating ? 'scale-110 shadow-lg' : 'scale-100'}
              `}
            >
              <InformationCircleIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            {isAnimating && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-12 border-2 border-purple-400 rounded-lg animate-pulse" />
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="text-center">
      {renderGestureDemo()}
    </div>
  );
};

export default GestureTutorial;