'use client';

import React, { forwardRef, useState, useEffect } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { securityValidation, sanitizeHtml } from '@/lib/security/validation';
import { cn, generateTouchButtonClasses, TOUCH_TARGET } from '@/lib/responsive-utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useKeyboardAvoidance } from '@/hooks/useKeyboardAvoidance';

// Form field validation types (reuse from FormComponents)
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
  email?: boolean;
  password?: boolean;
  sanitize?: boolean;
  detectThreats?: boolean;
  allowHtml?: boolean;
}

export interface FieldError {
  type: string;
  message: string;
}

// Mobile-optimized input component
interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: FieldError | null;
  success?: boolean;
  helperText?: string;
  validation?: ValidationRule;
  onValidationChange?: (isValid: boolean, error: FieldError | null) => void;
  containerClassName?: string;
  showValidation?: boolean;
  enableSecurityCheck?: boolean;
  onSecurityThreat?: (threats: string[]) => void;
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(({
  label,
  error,
  success,
  helperText,
  validation,
  onValidationChange,
  containerClassName = '',
  showValidation = true,
  className = '',
  type = 'text',
  value,
  onChange,
  onBlur,
  enableSecurityCheck = false,
  onSecurityThreat,
  ...props
}, ref) => {
  const [localError, setLocalError] = useState<FieldError | null>(null);
  const [touched, setTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [securityThreats, setSecurityThreats] = useState<string[]>([]);
  const { isMobile } = useBreakpoint();
  const { scrollToFocusedElement } = useKeyboardAvoidance({ enabled: isMobile });

  const currentError = error || localError;
  const hasError = showValidation && touched && currentError;
  const hasSuccess = showValidation && touched && !currentError && success !== false && value;

  // Validation function (same as original)
  const validateValue = (val: string): FieldError | null => {
    if (!validation) return null;

    if (validation.required && (!val || val.trim() === '')) {
      return { type: 'required', message: `${label || '이 필드'}는 필수입니다.` };
    }

    if (!val || val.trim() === '') return null;

    if (validation.minLength && val.length < validation.minLength) {
      return { 
        type: 'minLength', 
        message: `최소 ${validation.minLength}자 이상 입력해주세요.` 
      };
    }

    if (validation.maxLength && val.length > validation.maxLength) {
      return { 
        type: 'maxLength', 
        message: `최대 ${validation.maxLength}자까지 입력 가능합니다.` 
      };
    }

    if (validation.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        return { type: 'email', message: '올바른 이메일 주소를 입력해주세요.' };
      }
    }

    if (validation.password) {
      if (val.length < 8) {
        return { type: 'password', message: '비밀번호는 최소 8자 이상이어야 합니다.' };
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(val)) {
        return { 
          type: 'password', 
          message: '대문자, 소문자, 숫자를 포함해야 합니다.' 
        };
      }
    }

    if (validation.pattern && !validation.pattern.test(val)) {
      return { type: 'pattern', message: '올바른 형식으로 입력해주세요.' };
    }

    if (validation.custom) {
      const customError = validation.custom(val);
      if (customError) {
        return { type: 'custom', message: customError };
      }
    }

    if (enableSecurityCheck && validation?.detectThreats) {
      const securityResult = securityValidation(val);
      if (!securityResult.isSecure) {
        setSecurityThreats(securityResult.threats);
        if (onSecurityThreat) {
          onSecurityThreat(securityResult.threats);
        }
        return { 
          type: 'security', 
          message: '입력에서 보안 위험이 감지되었습니다.' 
        };
      } else {
        setSecurityThreats([]);
      }
    }

    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (onChange) {
      onChange(e);
    }

    if (touched) {
      const validationError = validateValue(newValue);
      setLocalError(validationError);
      
      if (onValidationChange) {
        onValidationChange(!validationError, validationError);
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Trigger keyboard avoidance after a short delay to allow keyboard to appear
    if (isMobile) {
      setTimeout(() => {
        scrollToFocusedElement();
      }, 300);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true);
    
    const validationError = validateValue(e.target.value);
    setLocalError(validationError);
    
    if (onValidationChange) {
      onValidationChange(!validationError, validationError);
    }

    if (onBlur) {
      onBlur(e);
    }
  };

  // Mobile-optimized input styles
  const getInputStyles = () => {
    const baseStyles = cn(
      'w-full px-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors',
      // Mobile-optimized height (minimum 48px for touch targets)
      isMobile ? 'py-3 text-base min-h-[48px]' : 'py-2 text-sm min-h-[40px]',
      // Prevent zoom on iOS
      isMobile && 'text-[16px]'
    );
    
    if (hasError) {
      return cn(baseStyles, 'border-red-300 focus:border-red-500 focus:ring-red-500');
    }
    
    if (hasSuccess) {
      return cn(baseStyles, 'border-green-300 focus:border-green-500 focus:ring-green-500');
    }
    
    return cn(baseStyles, 'border-gray-300 focus:border-blue-500 focus:ring-blue-500');
  };

  const isPasswordField = type === 'password' || (validation?.password && type !== 'text');
  const inputType = isPasswordField && showPassword ? 'text' : isPasswordField ? 'password' : type;

  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label && (
        <label className={cn(
          'block font-medium text-gray-700',
          isMobile ? 'text-base' : 'text-sm'
        )}>
          {label}
          {validation?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={ref}
          type={inputType}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            getInputStyles(),
            hasError ? 'pr-12' : '',
            isPasswordField ? 'pr-12' : '',
            className
          )}
          {...props}
        />
        
        {/* Validation icon */}
        {showValidation && touched && (
          <div className={cn(
            'absolute inset-y-0 right-0 flex items-center',
            isMobile ? 'pr-4' : 'pr-3'
          )}>
            {hasError ? (
              <ExclamationCircleIcon className={cn(
                'text-red-500',
                isMobile ? 'w-6 h-6' : 'w-5 h-5'
              )} />
            ) : securityThreats.length > 0 ? (
              <ExclamationTriangleIcon className={cn(
                'text-orange-500',
                isMobile ? 'w-6 h-6' : 'w-5 h-5'
              )} title="보안 위험 감지" />
            ) : hasSuccess ? (
              enableSecurityCheck ? (
                <ShieldCheckIcon className={cn(
                  'text-green-500',
                  isMobile ? 'w-6 h-6' : 'w-5 h-5'
                )} title="보안 검증 완료" />
              ) : (
                <CheckCircleIcon className={cn(
                  'text-green-500',
                  isMobile ? 'w-6 h-6' : 'w-5 h-5'
                )} />
              )
            ) : null}
          </div>
        )}
        
        {/* Password toggle */}
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={cn(
              'absolute inset-y-0 right-0 flex items-center',
              // Touch-friendly button size
              isMobile ? 'w-12 h-12' : 'w-10 h-10',
              hasError || hasSuccess ? (isMobile ? 'mr-8' : 'mr-6') : (isMobile ? 'mr-2' : 'mr-1')
            )}
          >
            {showPassword ? (
              <EyeSlashIcon className={cn(
                'text-gray-400 hover:text-gray-600 mx-auto',
                isMobile ? 'w-6 h-6' : 'w-5 h-5'
              )} />
            ) : (
              <EyeIcon className={cn(
                'text-gray-400 hover:text-gray-600 mx-auto',
                isMobile ? 'w-6 h-6' : 'w-5 h-5'
              )} />
            )}
          </button>
        )}
      </div>
      
      {/* Error message */}
      {hasError && (
        <p className={cn(
          'text-red-600 flex items-center gap-2',
          isMobile ? 'text-base' : 'text-sm'
        )}>
          <ExclamationCircleIcon className={cn(
            isMobile ? 'w-5 h-5' : 'w-4 h-4'
          )} />
          {currentError.message}
        </p>
      )}
      
      {/* Security threats warning */}
      {!hasError && securityThreats.length > 0 && (
        <div className={cn(
          'text-orange-600 flex items-center gap-2',
          isMobile ? 'text-base' : 'text-sm'
        )}>
          <ExclamationTriangleIcon className={cn(
            isMobile ? 'w-5 h-5' : 'w-4 h-4'
          )} />
          <span>보안 위험이 감지되었습니다:</span>
          <span className="font-medium">{securityThreats.join(', ')}</span>
        </div>
      )}
      
      {/* Helper text */}
      {helperText && !hasError && securityThreats.length === 0 && (
        <p className={cn(
          'text-gray-500',
          isMobile ? 'text-base' : 'text-sm'
        )}>{helperText}</p>
      )}
    </div>
  );
});

MobileInput.displayName = 'MobileInput';

// Mobile-optimized textarea component
interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: FieldError | null;
  success?: boolean;
  helperText?: string;
  validation?: ValidationRule;
  onValidationChange?: (isValid: boolean, error: FieldError | null) => void;
  containerClassName?: string;
  showValidation?: boolean;
  resize?: boolean;
}

export const MobileTextarea = forwardRef<HTMLTextAreaElement, MobileTextareaProps>(({
  label,
  error,
  success,
  helperText,
  validation,
  onValidationChange,
  containerClassName = '',
  showValidation = true,
  resize = true,
  className = '',
  value,
  onChange,
  onBlur,
  rows = 4,
  ...props
}, ref) => {
  const [localError, setLocalError] = useState<FieldError | null>(null);
  const [touched, setTouched] = useState(false);
  const { isMobile } = useBreakpoint();
  const { scrollToFocusedElement } = useKeyboardAvoidance({ enabled: isMobile });

  const currentError = error || localError;
  const hasError = showValidation && touched && currentError;
  const hasSuccess = showValidation && touched && !currentError && success !== false && value;

  const validateValue = (val: string): FieldError | null => {
    if (!validation) return null;

    if (validation.required && (!val || val.trim() === '')) {
      return { type: 'required', message: `${label || '이 필드'}는 필수입니다.` };
    }

    if (!val || val.trim() === '') return null;

    if (validation.minLength && val.length < validation.minLength) {
      return { 
        type: 'minLength', 
        message: `최소 ${validation.minLength}자 이상 입력해주세요.` 
      };
    }

    if (validation.maxLength && val.length > validation.maxLength) {
      return { 
        type: 'maxLength', 
        message: `최대 ${validation.maxLength}자까지 입력 가능합니다.` 
      };
    }

    if (validation.custom) {
      const customError = validation.custom(val);
      if (customError) {
        return { type: 'custom', message: customError };
      }
    }

    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e);
    }

    if (touched) {
      const validationError = validateValue(e.target.value);
      setLocalError(validationError);
      
      if (onValidationChange) {
        onValidationChange(!validationError, validationError);
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Trigger keyboard avoidance after a short delay to allow keyboard to appear
    if (isMobile) {
      setTimeout(() => {
        scrollToFocusedElement();
      }, 300);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setTouched(true);
    
    const validationError = validateValue(e.target.value);
    setLocalError(validationError);
    
    if (onValidationChange) {
      onValidationChange(!validationError, validationError);
    }

    if (onBlur) {
      onBlur(e);
    }
  };

  const getTextareaStyles = () => {
    const baseStyles = cn(
      'w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors',
      // Mobile-optimized text size to prevent zoom
      isMobile ? 'text-base text-[16px]' : 'text-sm',
      !resize ? 'resize-none' : ''
    );
    
    if (hasError) {
      return cn(baseStyles, 'border-red-300 focus:border-red-500 focus:ring-red-500');
    }
    
    if (hasSuccess) {
      return cn(baseStyles, 'border-green-300 focus:border-green-500 focus:ring-green-500');
    }
    
    return cn(baseStyles, 'border-gray-300 focus:border-blue-500 focus:ring-blue-500');
  };

  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label && (
        <label className={cn(
          'block font-medium text-gray-700',
          isMobile ? 'text-base' : 'text-sm'
        )}>
          {label}
          {validation?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          rows={isMobile ? Math.max(rows, 3) : rows} // Minimum 3 rows on mobile
          className={cn(getTextareaStyles(), className)}
          {...props}
        />
        
        {showValidation && touched && (
          <div className={cn(
            'absolute top-3 right-3'
          )}>
            {hasError ? (
              <ExclamationCircleIcon className={cn(
                'text-red-500',
                isMobile ? 'w-6 h-6' : 'w-5 h-5'
              )} />
            ) : hasSuccess ? (
              <CheckCircleIcon className={cn(
                'text-green-500',
                isMobile ? 'w-6 h-6' : 'w-5 h-5'
              )} />
            ) : null}
          </div>
        )}
      </div>
      
      {/* Character count */}
      {validation?.maxLength && (
        <p className={cn(
          'text-gray-500 text-right',
          isMobile ? 'text-sm' : 'text-xs'
        )}>
          {typeof value === 'string' ? value.length : 0} / {validation.maxLength}
        </p>
      )}
      
      {hasError && (
        <p className={cn(
          'text-red-600 flex items-center gap-2',
          isMobile ? 'text-base' : 'text-sm'
        )}>
          <ExclamationCircleIcon className={cn(
            isMobile ? 'w-5 h-5' : 'w-4 h-4'
          )} />
          {currentError.message}
        </p>
      )}
      
      {helperText && !hasError && (
        <p className={cn(
          'text-gray-500',
          isMobile ? 'text-base' : 'text-sm'
        )}>{helperText}</p>
      )}
    </div>
  );
});

MobileTextarea.displayName = 'MobileTextarea';

// Mobile-optimized button component
interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  const { isMobile } = useBreakpoint();

  const getButtonStyles = () => {
    // Base styles with touch-friendly sizing
    const baseStyles = cn(
      'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:pointer-events-none',
      fullWidth ? 'w-full' : ''
    );

    // Size styles - mobile optimized
    const sizeStyles = {
      sm: cn(
        isMobile ? 'min-h-[44px] px-4 py-2 text-sm' : 'min-h-[36px] px-3 py-1.5 text-sm'
      ),
      md: cn(
        isMobile ? 'min-h-[48px] px-6 py-3 text-base' : 'min-h-[40px] px-4 py-2 text-sm'
      ),
      lg: cn(
        isMobile ? 'min-h-[52px] px-8 py-4 text-lg' : 'min-h-[44px] px-6 py-3 text-base'
      ),
    };

    // Variant styles
    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400 focus:ring-gray-500',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500',
    };

    return cn(baseStyles, sizeStyles[size], variantStyles[variant]);
  };

  return (
    <button
      ref={ref}
      className={cn(getButtonStyles(), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className={cn(
          'animate-spin rounded-full border-2 border-current border-t-transparent mr-2',
          isMobile ? 'w-5 h-5' : 'w-4 h-4'
        )} />
      )}
      {icon && !loading && (
        <span className={cn(children ? 'mr-2' : '')}>
          {icon}
        </span>
      )}
      {children}
    </button>
  );
});

MobileButton.displayName = 'MobileButton';