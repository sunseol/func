'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useViewport } from '@/contexts/ViewportContext';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  initialHeight?: number; // Percentage of viewport height (0-100)
  minHeight?: number; // Minimum height percentage
  maxHeight?: number; // Maximum height percentage
  snapPoints?: number[]; // Array of snap points as percentages
  className?: string;
}

export default function MobileBottomSheet({
  isOpen,
  onClose,
  children,
  initialHeight = 60,
  minHeight = 30,
  maxHeight = 90,
  snapPoints = [30, 60, 90],
  className = ''
}: MobileBottomSheetProps) {
  const { height: viewportHeight, isMobile } = useViewport();
  const [currentHeight, setCurrentHeight] = useState(initialHeight);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState(initialHeight);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Convert percentage to pixels
  const heightInPixels = (viewportHeight * currentHeight) / 100;

  // Find closest snap point
  const findClosestSnapPoint = useCallback((height: number): number => {
    return snapPoints.reduce((closest, snapPoint) => {
      return Math.abs(height - snapPoint) < Math.abs(height - closest) ? snapPoint : closest;
    });
  }, [snapPoints]);

  // Handle drag start
  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    setDragStartY(clientY);
    setDragStartHeight(currentHeight);
  }, [currentHeight]);

  // Handle drag move
  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;

    const deltaY = dragStartY - clientY;
    const deltaPercentage = (deltaY / viewportHeight) * 100;
    const newHeight = Math.max(minHeight, Math.min(maxHeight, dragStartHeight + deltaPercentage));
    
    setCurrentHeight(newHeight);
  }, [isDragging, dragStartY, dragStartHeight, viewportHeight, minHeight, maxHeight]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    
    // If dragged below minimum threshold, close the sheet
    if (currentHeight < minHeight + 5) {
      onClose();
      return;
    }

    // Snap to closest snap point
    const closestSnapPoint = findClosestSnapPoint(currentHeight);
    setCurrentHeight(closestSnapPoint);
  }, [isDragging, currentHeight, minHeight, findClosestSnapPoint, onClose]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientY);
  }, [handleDragStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientY);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientY);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // 드래그 중일 때만 스크롤 방지
    if (isDragging) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    handleDragMove(touch.clientY);
  }, [handleDragMove, isDragging]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Add global event listeners for drag
  useEffect(() => {
    if (!isDragging) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Reset height when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentHeight(initialHeight);
    }
  }, [isOpen, initialHeight]);

  // Don't render on non-mobile devices
  if (!isMobile) return null;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 transition-opacity duration-300 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-xl z-50 flex flex-col transition-all duration-300 ease-out ${className}`}
        style={{
          height: `${currentHeight}%`,
          transform: isDragging ? 'none' : undefined,
        }}
      >
        {/* Drag Handle */}
        <div
          ref={dragHandleRef}
          className="flex-shrink-0 flex items-center justify-center py-3 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </>
  );
}