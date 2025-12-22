import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectCard from '../ProjectCard';

jest.mock('next/link', () => {
  return ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock('@/hooks/useBreakpoint', () => ({
  useBreakpoint: () => ({
    current: 'lg',
    width: 1024,
    height: 768,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    deviceType: 'desktop',
  }),
}));

describe('ProjectCard', () => {
  const project = {
    id: 'p1',
    name: 'Test Project',
    description: 'A test project description',
    created_by: 'u1',
    creator_id: 'u1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    official_documents_count: 3,
    member_count: 5,
    last_activity_at: null,
    creator: {
      id: 'u1',
      email: 'user@test.com',
      full_name: 'Test User',
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  } as any;

  it('renders project name/description and links to project', () => {
    render(<ProjectCard project={project} isAdmin={false} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('A test project description')).toBeInTheDocument();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/ai-pm/p1');
  });

  it('shows member/document counts', () => {
    render(<ProjectCard project={project} isAdmin={false} />);
    expect(screen.getByText('5명')).toBeInTheDocument();
    expect(screen.getByText('문서 3')).toBeInTheDocument();
  });

  it('shows admin badge when admin', () => {
    render(<ProjectCard project={project} isAdmin />);
    expect(screen.getByText('관리자 권한')).toBeInTheDocument();
  });

  it('shows fallback description when missing', () => {
    render(<ProjectCard project={{ ...project, description: null }} isAdmin={false} />);
    expect(screen.getByText('프로젝트 설명이 없습니다.')).toBeInTheDocument();
  });
});

