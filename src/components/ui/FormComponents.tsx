'use client';

import React, { forwardRef, useState, useEffect } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { securityValidation, sanitizeHtml } from '@/lib/security/validation';

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

  // Input styles based on state
  const getInputStyles = () => {
    const baseStyles = 'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors';
    
    if (hasError) {
      return `${baseStyles} border-red-300 focus:border-red-500 focus:ring-red-500`;
    }
    
    if (hasSuccess) {
      return `${baseStyles} border-green-300 focus:border-green-500 focus:ring-green-500`;
    }
    
    return `${baseStyles} border-gray-300 focus:border-blue-500 focus:ring-blue-500`;
  };

  const isPasswordField = type === 'password' || (validation?.password && type !== 'text');
  const inputType = isPasswordField && showPassword ? 'text' : isPasswordField ? 'password' : type;

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
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
          onBlur={handleBlur}
          className={`${getInputStyles()} ${hasError ? 'pr-10' : ''} ${isPasswordField ? 'pr-10' : ''} ${className}`}
          {...props}
        />
        
        {/* Validation icon */}
        {showValidation && touched && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {hasError ? (
              <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
            ) : securityThreats.length > 0 ? (
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" title="보안 위험 감지" />
            ) : hasSuccess ? (
              enableSecurityCheck ? (
                <ShieldCheckIcon className="w-5 h-5 text-green-500" title="보안 검증 완료" />
              ) : (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              )
            ) : null}
          </div>
        )}
        
        {/* Password toggle */}
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute inset-y-0 right-0 flex items-center ${hasError || hasSuccess ? 'pr-8' : 'pr-3'}`}
          >
            {showPassword ? (
              <EyeSlashIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            ) : (
              <EyeIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        )}
      </div>
      
      {/* Error message */}
      {hasError && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <ExclamationCircleIcon className="w-4 h-4" />
          {currentError.message}
        </p>
      )}
      
      {/* Security threats warning */}
      {!hasError && securityThreats.length > 0 && (
        <div className="text-sm text-orange-600 flex items-center gap-1">
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span>보안 위험이 감지되었습니다:</span>
          <span className="font-medium">{securityThreats.join(', ')}</span>
        </div>
      )}
      
      {/* Helper text */}
      {helperText && !hasError && securityThreats.length === 0 && (
        <p className="text-sm text-gray-500">{helperText}</p>
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
    const baseStyles = `w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors ${
      !resize ? 'resize-none' : ''
    }`;
    
    if (hasError) {
      return `${baseStyles} border-red-300 focus:border-red-500 focus:ring-red-500`;
    }
    
    if (hasSuccess) {
      return `${baseStyles} border-green-300 focus:border-green-500 focus:ring-green-500`;
    }
    
    return `${baseStyles} border-gray-300 focus:border-blue-500 focus:ring-blue-500`;
  };

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {validation?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`${getTextareaStyles()} ${className}`}
          {...props}
        />
        
        {showValidation && touched && (
          <div className="absolute top-2 right-2">
            {hasError ? (
              <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
            ) : hasSuccess ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            ) : null}
          </div>
        )}
      </div>
      
      {/* Character count */}
      {validation?.maxLength && (
        <p className="text-xs text-gray-500 text-right">
          {typeof value === 'string' ? value.length : 0} / {validation.maxLength}
        </p>
      )}
      
      {hasError && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <ExclamationCircleIcon className="w-4 h-4" />
          {currentError.message}
        </p>
      )}
      
      {helperText && !hasError && (
        <p className="text-sm text-gray-500">{helperText}</p>
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