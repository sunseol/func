'use client';

import { useState } from 'react';

export default function TestErrorPage() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('테스트 오류입니다!');
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">ErrorBoundary 테스트</h1>
      <p className="mb-4">아래 버튼을 클릭하면 오류가 발생하여 ErrorBoundary가 작동합니다.</p>
      <button
        onClick={() => setShouldError(true)}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        오류 발생시키기
      </button>
    </div>
  );
} 