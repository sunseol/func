'use client';

import React, { forwardRef, useState, useEffect } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { securityValidation, sanitizeHtml } from '@/lib/security/validation';
import { cn } from '@/lib/responsive-utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useKeyboardAvoidance } from '@/hooks/useKeyboardAvoidance';

// Form field validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
  email?: boolean;
  password?: boolean;
  // 보안 검증 옵션
  sanitize?: boolean;
  detectThreats?: boolean;
  allowHtml?: boolean;
}

export interface FieldError {
  type: string;
  message: string;
}

// Base input component with validation
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: FieldError | null;
  success?: boolean;
  helperText?: string;
  validation?: ValidationRule;
  onValidationChange?: (isValid: boolean, error: FieldError | null) => void;
  containerClassName?: string;
  showValidation?: boolean;
  // 보안 관련 props
  enableSecurityCheck?: boolean;
  onSecurityThreat?: (threats: string[]) => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
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

  // Validation function
  const validateValue = (val: string): FieldError | null => {
    if (!validation) return null;

    // Required validation
    if (validation.required && (!val || val.trim() === '')) {
      return { type: 'required', message: `${label || '이 필드'}는 필수입니다.` };
    }

    // Skip other validations if empty and not required
    if (!val || val.trim() === '') return null;

    // Length validations
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

    // Email validation
    if (validation.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        return { type: 'email', message: '올바른 이메일 주소를 입력해주세요.' };
      }
    }

    // Password validation
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

    // Pattern validation
    if (validation.pattern && !validation.pattern.test(val)) {
      return { type: 'pattern', message: '올바른 형식으로 입력해주세요.' };
    }

    // Custom validation
    if (validation.custom) {
      const customError = validation.custom(val);
      if (customError) {
        return { type: 'custom', message: customError };
      }
    }

    // 보안 검증 (활성화된 경우에만)
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

  // Handle value change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (onChange) {
      onChange(e);
    }

    // Validate in real-time if touched
    if (touched) {
      const validationError = validateValue(newValue);
      setLocalError(validationError);
      
      if (onValidationChange) {
        onValidationChange(!validationError, validationError);
      }
    }
  };

  // Handle focus
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Trigger keyboard avoidance after a short delay to allow keyboard to appear
    if (isMobile) {
      setTimeout(() => {
        scrollToFocusedElement();
      }, 300);
    }
  };

  // Handle blur
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

  // Input styles based on state - mobile optimized
  const getInputStyles = () => {
    const baseStyles = cn(
      'w-full border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors',
      // Mobile-optimized sizing: minimum 48px height, larger padding, 16px font size to prevent zoom
      isMobile ? 'px-4 py-3 text-base min-h-[48px] text-[16px]' : 'px-3 py-2 text-sm min-h-[40px]'
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
            hasError ? (isMobile ? 'pr-12' : 'pr-10') : '',
            isPasswordField ? (isMobile ? 'pr-12' : 'pr-10') : '',
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
              // Touch-friendly button size on mobile
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

Input.displayName = 'Input';

// Textarea component with validation
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
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

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
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
  ...props
}, ref) => {
  const [localError, setLocalError] = useState<FieldError | null>(null);
  const [touched, setTouched] = useState(false);
  const { isMobile } = useBreakpoint();
  const { scrollToFocusedElement } = useKeyboardAvoidance({ enabled: isMobile });

  const currentError = error || localError;
  const hasError = showValidation && touched && currentError;
  const hasSuccess = showValidation && touched && !currentError && success !== false && value;

  // Validation (reuse from Input)
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
      'w-full border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors',
      // Mobile-optimized sizing and text size to prevent zoom
      isMobile ? 'px-4 py-3 text-base text-[16px]' : 'px-3 py-2 text-sm',
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
          className={cn(getTextareaStyles(), className)}
          {...props}
        />
        
        {showValidation && touched && (
          <div className="absolute top-3 right-3">
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

Textarea.displayName = 'Textarea';

// Form validation hook
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validationRules: Record<keyof T, ValidationRule>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, FieldError | null>>({} as Record<keyof T, FieldError | null>);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  const validateField = (field: keyof T, value: unknown): FieldError | null => {
    const rule = validationRules[field];
    if (!rule) return null;

    const stringValue = String(value || '');
    
    if (rule.required && (!value || stringValue.trim() === '')) {
      return { type: 'required', message: `${String(field)}는 필수입니다.` };
    }

    if (!value || stringValue.trim() === '') return null;

    if (rule.minLength && stringValue.length < rule.minLength) {
      return { type: 'minLength', message: `최소 ${rule.minLength}자 이상 입력해주세요.` };
    }

    if (rule.maxLength && stringValue.length > rule.maxLength) {
      return { type: 'maxLength', message: `최대 ${rule.maxLength}자까지 입력 가능합니다.` };
    }

    if (rule.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stringValue)) {
        return { type: 'email', message: '올바른 이메일 주소를 입력해주세요.' };
      }
    }

    if (rule.pattern && !rule.pattern.test(stringValue)) {
      return { type: 'pattern', message: '올바른 형식으로 입력해주세요.' };
    }

    if (rule.custom) {
      const customError = rule.custom(stringValue);
      if (customError) {
        return { type: 'custom', message: customError };
      }
    }

    return null;
  };

  const setValue = (field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const setFieldTouched = (field: keyof T, isTouched = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
    
    if (isTouched) {
      const error = validateField(field, values[field]);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const validateAll = (): boolean => {
    const newErrors: Record<keyof T, FieldError | null> = {} as Record<keyof T, FieldError | null>;
    const newTouched: Record<keyof T, boolean> = {} as Record<keyof T, boolean>;
    
    let isValid = true;
    
    for (const field in validationRules) {
      newTouched[field] = true;
      const error = validateField(field, values[field]);
      newErrors[field] = error;
      
      if (error) {
        isValid = false;
      }
    }
    
    setTouched(newTouched);
    setErrors(newErrors);
    
    return isValid;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({} as Record<keyof T, FieldError | null>);
    setTouched({} as Record<keyof T, boolean>);
  };

  const isValid = Object.values(errors).every(error => !error);
  const hasErrors = Object.values(errors).some(error => !!error);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateAll,
    reset,
    isValid,
    hasErrors
  };
} 