'use client';

import React, { useRef } from 'react';
import { useFormKeyboardAvoidance, KeyboardAvoidanceWrapper } from '@/hooks/useKeyboardAvoidance';
import { cn } from '@/lib/responsive-utils';

interface KeyboardAwareFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  enableKeyboardAvoidance?: boolean;
  wrapperClassName?: string;
}

/**
 * Form component that automatically handles keyboard avoidance on mobile devices
 */
export const KeyboardAwareForm: React.FC<KeyboardAwareFormProps> = ({
  children,
  enableKeyboardAvoidance = true,
  wrapperClassName = '',
  className = '',
  ...props
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const keyboardAvoidance = useFormKeyboardAvoidance(formRef);

  return (
    <KeyboardAvoidanceWrapper 
      enabled={enableKeyboardAvoidance}
      className={wrapperClassName}
    >
      <form
        ref={formRef}
        className={cn(
          // Add bottom padding when keyboard is visible to prevent content from being hidden
          keyboardAvoidance.isKeyboardVisible ? 'pb-4' : '',
          className
        )}
        {...props}
      >
        {children}
      </form>
    </KeyboardAvoidanceWrapper>
  );
};

/**
 * Container component for form sections that need keyboard avoidance
 */
interface KeyboardAwareContainerProps {
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
}

export const KeyboardAwareContainer: React.FC<KeyboardAwareContainerProps> = ({
  children,
  className = '',
  enabled = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const keyboardAvoidance = useFormKeyboardAvoidance(containerRef);

  return (
    <div
      ref={containerRef}
      className={cn(
        // Add transition for smooth keyboard appearance/disappearance
        'transition-all duration-300 ease-in-out',
        // Add bottom margin when keyboard is visible
        keyboardAvoidance.isKeyboardVisible ? 'mb-4' : '',
        className
      )}
      style={keyboardAvoidance.getSafeAreaStyles()}
    >
      {children}
    </div>
  );
};