import React, { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import type { Toast } from '@/contexts/ToastContext';

jest.mock('@/contexts/ViewportContext', () => ({
  useViewport: () => ({
    isMobile: false,
    height: 800,
    isTouch: false,
  }),
}));

jest.mock('@/components/ui/NotificationStack', () => ({
  NotificationStack: ({ notifications }: { notifications: Toast[] }) => (
    <div>
      {notifications.map((notification) => (
        <span key={notification.id}>{notification.title}</span>
      ))}
    </div>
  ),
}));

function TimedToastHarness() {
  const { success } = useToast();

  useEffect(() => {
    success('first', undefined, { duration: 50 });
    success('second', undefined, { duration: 100 });
    success('third', undefined, { duration: 150 });
    success('fourth', undefined, { duration: 400 });
  }, [success]);

  return null;
}

describe('NotificationManager', () => {
  it('reconciles provider auto-dismissal so queued timed toasts continue displaying', () => {
    jest.useFakeTimers();

    render(
      <ToastProvider maxToasts={5}>
        <TimedToastHarness />
      </ToastProvider>,
    );

    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
    expect(screen.getByText('third')).toBeInTheDocument();
    expect(screen.getByText('fourth')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(320);
    });

    expect(screen.queryByText('first')).not.toBeInTheDocument();
    expect(screen.queryByText('second')).not.toBeInTheDocument();
    expect(screen.queryByText('third')).not.toBeInTheDocument();
    expect(screen.getByText('fourth')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.queryByText('fourth')).not.toBeInTheDocument();
    jest.useRealTimers();
  });
});
