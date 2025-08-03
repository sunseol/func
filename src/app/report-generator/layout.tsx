
import MainHeader from '@/components/layout/MainHeader';
import React from 'react';

export default function ReportGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <MainHeader />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
