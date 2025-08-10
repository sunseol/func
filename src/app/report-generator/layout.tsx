
// 전역 레이아웃에서 헤더를 포함하므로 개별 레이아웃에서는 중복 렌더 방지
import React from 'react';

export default function ReportGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
