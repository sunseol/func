'use client';

import React, { useState, useRef, useCallback } from 'react';
import { 
  CloudArrowUpIcon, 
  PhotoIcon, 
  CameraIcon, 
  DocumentIcon,
  XMarkIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/responsive-utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  progress?: number;
  error?: string;
}

interface MobileFileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in bytes
  onFilesChange?: (files: UploadedFile[]) => void;
  onUpload?: (files: UploadedFile[]) => Promise<void>;
  disabled?: boolean;
  className?: string;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  allowCamera?: boolean;
  allowGallery?: boolean;
  showPreview?: boolean;
}

/**
 * Mobile-optimized file upload component with camera and gallery access
 */
export const MobileFileUpload: React.FC<MobileFileUploadProps> = ({
  accept = '*/*',
  multiple = false,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB default
  onFilesChange,
  onUpload,
  disabled = false,
  className = '',
  label,
  helperText,
  errorMessage,
  allowCamera = true,
  allowGallery = true,
  showPreview = true
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { isMobile } = useBreakpoint();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Generate unique ID for files
  const generateFileId = () => Math.random().toString(36).substr(2, 9);

  // Validate file size and type
  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `파일 크기가 너무 큽니다. 최대 ${formatFileSize(maxSize)}까지 업로드 가능합니다.`;
    }
    
    if (accept !== '*/*' && !accept.split(',').some(type => {
      const trimmedType = type.trim();
      if (trimmedType.startsWith('.')) {
        return file.name.toLowerCase().endsWith(trimmedType.toLowerCase());
      }
      return file.type.match(trimmedType.replace('*', '.*'));
    })) {
      return '지원하지 않는 파일 형식입니다.';
    }
    
    return null;
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Create preview for image files
  const createPreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  // Process selected files
  const processFiles = useCallback(async (fileList: FileList) => {
    const newFiles: UploadedFile[] = [];
    const currentFileCount = files.length;
    
    for (let i = 0; i < fileList.length; i++) {
      if (currentFileCount + newFiles.length >= maxFiles) {
        break;
      }
      
      const file = fileList[i];
      const error = validateFile(file);
      const preview = showPreview ? await createPreview(file) : undefined;
      
      newFiles.push({
        id: generateFileId(),
        file,
        preview,
        error: error || undefined
      });
    }
    
    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    
    if (onFilesChange) {
      onFilesChange(updatedFiles);
    }
  }, [files, maxFiles, maxSize, accept, showPreview, onFilesChange]);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      processFiles(fileList);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  // Handle drag and drop (desktop only)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isMobile) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled || isMobile) return;
    
    const fileList = e.dataTransfer.files;
    if (fileList) {
      processFiles(fileList);
    }
  };

  // Remove file
  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    setFiles(updatedFiles);
    
    if (onFilesChange) {
      onFilesChange(updatedFiles);
    }
  };

  // Trigger file input
  const triggerFileInput = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Trigger camera input (mobile only)
  const triggerCameraInput = () => {
    if (!disabled && isMobile && cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!onUpload || files.length === 0 || isUploading) return;
    
    setIsUploading(true);
    try {
      await onUpload(files);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const getUploadAreaStyles = () => {
    const baseStyles = cn(
      'border-2 border-dashed rounded-lg transition-colors',
      isMobile ? 'p-6' : 'p-8'
    );
    
    if (disabled) {
      return cn(baseStyles, 'border-gray-200 bg-gray-50 cursor-not-allowed');
    }
    
    if (isDragOver) {
      return cn(baseStyles, 'border-blue-400 bg-blue-50');
    }
    
    return cn(baseStyles, 'border-gray-300 hover:border-gray-400 cursor-pointer');
  };

  return (
    <div className={cn('space-y-4', className)}>
      {label && (
        <label className={cn(
          'block font-medium text-gray-700',
          isMobile ? 'text-base' : 'text-sm'
        )}>
          {label}
        </label>
      )}
      
      {/* Upload Area */}
      <div
        className={getUploadAreaStyles()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isMobile ? triggerFileInput : undefined}
      >
        <div className="text-center">
          <CloudArrowUpIcon className={cn(
            'mx-auto text-gray-400',
            isMobile ? 'w-12 h-12' : 'w-16 h-16'
          )} />
          
          <div className={cn('mt-4', isMobile ? 'space-y-3' : 'space-y-2')}>
            <p className={cn(
              'text-gray-600',
              isMobile ? 'text-base' : 'text-sm'
            )}>
              {isMobile ? '파일을 업로드하세요' : '파일을 드래그하거나 클릭하여 업로드'}
            </p>
            
            {/* Mobile-specific buttons */}
            {isMobile && (
              <div className="flex flex-col space-y-2">
                {allowGallery && (
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    disabled={disabled}
                    className="inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                  >
                    <PhotoIcon className="w-5 h-5 mr-2" />
                    갤러리에서 선택
                  </button>
                )}
                
                {allowCamera && accept.includes('image') && (
                  <button
                    type="button"
                    onClick={triggerCameraInput}
                    disabled={disabled}
                    className="inline-flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                  >
                    <CameraIcon className="w-5 h-5 mr-2" />
                    카메라로 촬영
                  </button>
                )}
              </div>
            )}
            
            {/* Desktop upload button */}
            {!isMobile && (
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={disabled}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                파일 선택
              </button>
            )}
          </div>
        </div>
      </div>

      {/* File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      
      {/* Camera Input (mobile only) */}
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

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className={cn(
            'font-medium text-gray-700',
            isMobile ? 'text-base' : 'text-sm'
          )}>
            선택된 파일 ({files.length}/{maxFiles})
          </h4>
          
          <div className="space-y-2">
            {files.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className={cn(
                  'flex items-center p-3 border rounded-lg',
                  uploadedFile.error ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                )}
              >
                {/* File Preview/Icon */}
                <div className="flex-shrink-0 mr-3">
                  {uploadedFile.preview ? (
                    <img
                      src={uploadedFile.preview}
                      alt={uploadedFile.file.name}
                      className={cn(
                        'rounded object-cover',
                        isMobile ? 'w-12 h-12' : 'w-10 h-10'
                      )}
                    />
                  ) : (
                    <DocumentIcon className={cn(
                      'text-gray-400',
                      isMobile ? 'w-12 h-12' : 'w-10 h-10'
                    )} />
                  )}
                </div>
                
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-medium text-gray-900 truncate',
                    isMobile ? 'text-base' : 'text-sm'
                  )}>
                    {uploadedFile.file.name}
                  </p>
                  <p className={cn(
                    'text-gray-500',
                    isMobile ? 'text-sm' : 'text-xs'
                  )}>
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                  
                  {uploadedFile.error && (
                    <p className={cn(
                      'text-red-600 flex items-center mt-1',
                      isMobile ? 'text-sm' : 'text-xs'
                    )}>
                      <ExclamationCircleIcon className="w-4 h-4 mr-1" />
                      {uploadedFile.error}
                    </p>
                  )}
                </div>
                
                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeFile(uploadedFile.id)}
                  className={cn(
                    'flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded',
                    isMobile ? 'ml-3' : 'ml-2'
                  )}
                >
                  <XMarkIcon className={cn(
                    isMobile ? 'w-6 h-6' : 'w-5 h-5'
                  )} />
                </button>
              </div>
            ))}
          </div>
          
          {/* Upload Button */}
          {onUpload && files.some(f => !f.error) && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || disabled}
              className={cn(
                'w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed',
                isMobile ? 'text-base min-h-[48px]' : 'text-sm'
              )}
            >
              {isUploading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  업로드 중...
                </div>
              ) : (
                `${files.filter(f => !f.error).length}개 파일 업로드`
              )}
            </button>
          )}
        </div>
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
      <div className={cn(
        'text-gray-500',
        isMobile ? 'text-sm' : 'text-xs'
      )}>
        <p>최대 {maxFiles}개 파일, 파일당 최대 {formatFileSize(maxSize)}</p>
        {accept !== '*/*' && (
          <p>지원 형식: {accept}</p>
        )}
      </div>
    </div>
  );
};