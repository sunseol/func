'use client';

import React from 'react';
import NotificationSettings from '@/app/components/NotificationSettings';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <NotificationSettings />
      </main>
    </div>
  );
}