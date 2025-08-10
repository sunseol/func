'use client';

import React, { useState, useRef } from 'react';
import { CameraIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/responsive-utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface MobileImageUploadProps {
  value?: string; // Current image URL or base64
  onChange?: (file: File | null, preview: string | null) => void;
  onUpload?: (file: File) => Promise<string>; // Returns uploaded image URL
  disabled?: boolean;
  className?: string;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  maxSize?: number; // in bytes
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'free';
  size?: 'sm' | 'md' | 'lg';
  allowCamera?: boolean;
  allowGallery?: boolean;
  placeholder?: string;
}

/**
 * Simple image upload component optimized for mobile with camera access
 */
export const MobileImageUpload: React.FC<MobileImageUploadProps> = ({
  value,
  onChange,
  onUpload,
  disabled = false,
  className = '',
  label,
  helperText,
  errorMessage,
  maxSize = 5 * 1024 * 1024, // 5MB default
  aspectRatio = 'square',
  size = 'md',
  allowCamera = true,
  allowGallery = true,
  placeholder = '이미지를 선택하세요'
}) => {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isUploading, setIsUploading] = useState(false);
  const { isMobile } = useBreakpoint();
  
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Validate image file
  const validateImage = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return '이미지 파일만 업로드 가능합니다.';
    }
    
    if (file.size > maxSize) {
      return `파일 크기가 너무 큽니다. 최대 ${formatFileSize(maxSize)}까지 업로드 가능합니다.`;
    }
    
    return null;
  };

  // Process selected image
  const processImage = async (file: File) => {
    const error = validateImage(file);
    if (error) {
      if (onChange) {
        onChange(null, null);
      }
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const previewUrl = e.target?.result as string;
      setPreview(previewUrl);
      
      if (onChange) {
        onChange(file, previewUrl);
      }

      // Auto-upload if onUpload is provided
      if (onUpload) {
        setIsUploading(true);
        try {
          const uploadedUrl = await onUpload(file);
          setPreview(uploadedUrl);
          if (onChange) {
            onChange(file, uploadedUrl);
          }
        } catch (error) {
          console.error('Upload failed:', error);
          // Revert to local preview on upload failure
        } finally {
          setIsUploading(false);
        }
      }
    };
    
    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
    // Reset input value
    e.target.value = '';
  };

  // Trigger gallery input
  const triggerGalleryInput = () => {
    if (!disabled && galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  };

  // Trigger camera input
  const triggerCameraInput = () => {
    if (!disabled && cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // Remove image
  const removeImage = () => {
    setPreview(null);
    if (onChange) {
      onChange(null, null);
    }
  };

  // Get container styles based on size and aspect ratio
  const getContainerStyles = () => {
    const sizeClasses = {
      sm: isMobile ? 'w-24 h-24' : 'w-20 h-20',
      md: isMobile ? 'w-32 h-32' : 'w-28 h-28',
      lg: isMobile ? 'w-40 h-40' : 'w-36 h-36'
    };

    const aspectClasses = {
      square: sizeClasses[size],
      portrait: isMobile ? 'w-32 h-40' : 'w-28 h-36',
      landscape: isMobile ? 'w-40 h-32' : 'w-36 h-28',
      free: 'w-full min-h-[120px]'
    };

    return cn(
      'relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden',
      'hover:border-gray-400 transition-colors',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      aspectClasses[aspectRatio]
    );
  };

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <label className={cn(
          'block font-medium text-gray-700',
          isMobile ? 'text-base' : 'text-sm'
        )}>
          {label}
        </label>
      )}
      
      {/* Image Container */}
      <div className={getContainerStyles()}>
        {preview ? (
          <>
            {/* Image Preview */}
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            
            {/* Remove Button */}
            {!disabled && (
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
            
            {/* Upload Overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </>
        ) : (
          /* Upload Placeholder */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            <PhotoIcon className={cn(
              'text-gray-400 mb-2',
              isMobile ? 'w-8 h-8' : 'w-6 h-6'
            )} />
            <p className={cn(
              'text-gray-500',
              isMobile ? 'text-sm' : 'text-xs'
            )}>
              {placeholder}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!disabled && (
        <div className={cn(
          'flex gap-2',
          isMobile ? 'flex-col' : 'flex-row'
        )}>
          {allowGallery && (
            <button
              type="button"
              onClick={triggerGalleryInput}
              className={cn(
                'flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors',
                isMobile ? 'min-h-[44px] text-base' : 'text-sm'
              )}
            >
              <PhotoIcon className={cn(
                'mr-2',
                isMobile ? 'w-5 h-5' : 'w-4 h-4'
              )} />
              갤러리
            </button>
          )}
          
          {allowCamera && isMobile && (
            <button
              type="button"
              onClick={triggerCameraInput}
              className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors min-h-[44px] text-base"
            >
              <CameraIcon className="w-5 h-5 mr-2" />
              카메라
            </button>
          )}
        </div>
      )}

      {/* File Inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      
      {isMobile && allowCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
      )}

      {/* Helper Text */}
      {helperText && !errorMessage && (
        <p className={cn(
          'text-gray-500',
          isMobile ? 'text-base' : 'text-sm'
        )}>
          {helperText}
        </p>
      )}

      {/* Error Message */}
      {errorMessage && (
        <p className={cn(
          'text-red-600',
          isMobile ? 'text-base' : 'text-sm'
        )}>
          {errorMessage}
        </p>
      )}

      {/* Upload Constraints */}
      <p className={cn(
        'text-gray-500',
        isMobile ? 'text-sm' : 'text-xs'
      )}>
        최대 파일 크기: {formatFileSize(maxSize)}
      </p>
    </div>
  );
};