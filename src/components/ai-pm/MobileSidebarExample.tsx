'use client';

import React, { useState } from 'react';
import { useViewport } from '@/contexts/ViewportContext';
import WorkflowSidebar from './WorkflowSidebar';
import { WorkflowStep } from '@/types/ai-pm';
import { Bars3Icon } from '@heroicons/react/24/outline';

/**
 * Example component showing how to integrate the mobile-optimized WorkflowSidebar
 * This demonstrates the different display modes and responsive behavior
 */
export default function MobileSidebarExample() {
  const { isMobile, isTablet, isDesktop } = useViewport();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<'auto' | 'mobile-bottom-sheet' | 'mobile-fullscreen' | 'tablet-overlay'>('auto');

  // Example data
  const projectId = 'example-project';
  const projectName = '모바일 최적화 프로젝트';
  const currentStep: WorkflowStep = 3;
  const completedSteps: WorkflowStep[] = [1, 2];
  const memberCount = 5;
  const documentCount = 12;

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const handleStepClick = (step: WorkflowStep) => {
    console.log(`Navigating to step ${step}`);
    // In a real app, this would navigate to the step
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with mobile menu button */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">
            Mobile Sidebar Example
          </h1>
          
          {/* Mobile menu button - only show on mobile/tablet */}
          {!isDesktop && (
            <button
              onClick={handleToggleSidebar}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="메뉴 열기"
            >
              <Bars3Icon className="w-6 h-6 text-gray-600" />
            </button>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar - always visible */}
        {isDesktop && (
          <WorkflowSidebar
            projectId={projectId}
            projectName={projectName}
            currentStep={currentStep}
            completedSteps={completedSteps}
            memberCount={memberCount}
            documentCount={documentCount}
            onStepClick={handleStepClick}
            isOpen={true}
            displayMode="desktop"
          />
        )}

        {/* Mobile/Tablet sidebar - modal/overlay */}
        {!isDesktop && (
          <WorkflowSidebar
            projectId={projectId}
            projectName={projectName}
            currentStep={currentStep}
            completedSteps={completedSteps}
            memberCount={memberCount}
            documentCount={documentCount}
            onStepClick={handleStepClick}
            isOpen={sidebarOpen}
            onClose={handleCloseSidebar}
            displayMode={displayMode === 'auto' ? undefined : displayMode}
          />
        )}

        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Mobile Sidebar Integration Example
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Current Device Type:</h3>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Sidebar Status:</h3>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    sidebarOpen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {sidebarOpen ? 'Open' : 'Closed'}
                  </div>
                </div>

                {!isDesktop && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Display Mode Override:</h3>
                    <select
                      value={displayMode}
                      onChange={(e) => setDisplayMode(e.target.value as any)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="auto">Auto (based on device)</option>
                      <option value="mobile-bottom-sheet">Mobile Bottom Sheet</option>
                      <option value="mobile-fullscreen">Mobile Fullscreen</option>
                      <option value="tablet-overlay">Tablet Overlay</option>
                    </select>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Features Implemented:</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>✅ Responsive display mode detection</li>
                    <li>✅ Mobile bottom sheet with drag gestures</li>
                    <li>✅ Mobile fullscreen modal with swipe navigation</li>
                    <li>✅ Tablet overlay sidebar</li>
                    <li>✅ Mobile-optimized progress indicators</li>
                    <li>✅ Touch-friendly button sizes (44px minimum)</li>
                    <li>✅ Automatic sidebar closing on navigation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}