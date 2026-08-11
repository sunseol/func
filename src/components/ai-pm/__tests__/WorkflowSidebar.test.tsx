import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { AnchorHTMLAttributes } from 'react';
import WorkflowSidebar from '../WorkflowSidebar';

type MockLinkProps = Pick<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href' | 'children' | 'onClick' | 'className'
>;

jest.mock('next/link', () => {
  return ({ href, children, onClick, className }: MockLinkProps) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
});

jest.mock('next/navigation', () => ({
  usePathname: () => '/ai-pm/p1/workflow/3',
}));

jest.mock('@/contexts/ViewportContext', () => ({
  useViewport: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    height: 800,
    width: 1280,
    current: 'lg',
    deviceType: 'desktop',
    isTouch: false,
    hasHover: true,
    orientation: 'landscape',
    isOnline: true,
  }),
}));

describe('WorkflowSidebar', () => {
  it('renders step links and highlights current step', () => {
    render(
      <WorkflowSidebar
        displayMode="desktop"
        projectId="p1"
        projectName="My Project"
        currentStep={3}
        completedSteps={[1, 2]}
        memberCount={4}
        documentCount={7}
      />,
    );

    expect(screen.getByText('My Project')).toBeInTheDocument();
    expect(screen.getByText('멤버 4명')).toBeInTheDocument();
    expect(screen.getByText('문서 7개')).toBeInTheDocument();

    for (let step = 1; step <= 9; step++) {
      expect(screen.getByText(new RegExp(`^${step}\\. `))).toBeInTheDocument();
    }

    const current = screen.getByText('3. 기술 설계').closest('a');
    expect(current).toHaveClass('bg-blue-100');

    expect(screen.getByText('2/9')).toBeInTheDocument();
    expect(screen.getByText('22% 완료')).toBeInTheDocument();
  });

  it('calls onStepClick on step navigation', async () => {
    const user = userEvent.setup();
    const onStepClick = jest.fn();
    const onClose = jest.fn();

    render(
      <WorkflowSidebar
        displayMode="desktop"
        projectId="p1"
        projectName="My Project"
        currentStep={3}
        completedSteps={[1, 2]}
        memberCount={4}
        documentCount={7}
        onStepClick={onStepClick}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByText('4. 개발 계획'));
    expect(onStepClick).toHaveBeenCalledWith(4);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not expose tool links for routes that do not exist', () => {
    render(
      <WorkflowSidebar
        displayMode="desktop"
        projectId="p1"
        projectName="My Project"
        currentStep={3}
        completedSteps={[1, 2]}
        memberCount={4}
        documentCount={7}
      />,
    );

    expect(screen.queryByText('AI 어시스턴트')).not.toBeInTheDocument();
    expect(screen.queryByText('문서 관리')).not.toBeInTheDocument();
    expect(screen.queryByText('멤버 관리')).not.toBeInTheDocument();
    expect(screen.queryByText('프로젝트 설정')).not.toBeInTheDocument();
  });
});
