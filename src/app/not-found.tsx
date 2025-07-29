'use client';

import Link from 'next/link';
import { HomeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-gray-600">404</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">페이지를 찾을 수 없습니다</h1>
        <p className="text-gray-600 mb-6">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <div className="space-y-3">
          <Link
            href="/"
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <HomeIcon className="w-4 h-4" />
            홈으로 가기
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            이전 페이지로
          </button>
        </div>
      </div>
    </div>
  );
} 