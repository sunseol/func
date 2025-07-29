'use client';

import { useEffect } from 'react';
import { HomeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-red-600">!</span>
        </div>
        <h1 className="text-2xl font-bold text-red-900 mb-2">예상치 못한 오류</h1>
        <p className="text-red-700 mb-6">
          페이지를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            다시 시도
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <HomeIcon className="w-4 h-4" />
            홈으로 가기
          </button>
          {error.digest && (
            <p className="text-sm text-red-600">오류 ID: {error.digest}</p>
          )}
        </div>
      </div>
    </div>
  );
} 