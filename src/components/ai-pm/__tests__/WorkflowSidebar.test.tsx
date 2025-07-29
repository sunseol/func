import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import WorkflowSidebar from '../WorkflowSidebar';
import { WORKFLOW_STEPS } from '@/types/ai-pm';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => ({
    projectId: 'test-project',
    step: '1'
  }),
  usePathname: () => '/ai-pm/test-project/workflow/1',
}));

describe('WorkflowSidebar', () => {
  const defaultProps = {
    projectId: 'test-project',
    currentStep: 1 as const,
    progress: [
      { workflow_step: 1, step_name: '서비스 개요 및 목표 설정', has_official_document: true, document_count: 1, last_updated: '2024-01-01' },
      { workflow_step: 2, step_name: '타겟 사용자 분석', has_official_document: false, document_count: 0, last_updated: null },
      { workflow_step: 3, step_name: '핵심 기능 정의', has_official_document: false, document_count: 0, last_updated: null },
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all workflow steps', () => {
    render(<WorkflowSidebar {...defaultProps} />);

    Object.entries(WORKFLOW_STEPS).forEach(([step, name]) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('highlights current step', () => {
    render(<WorkflowSidebar {...defaultProps} />);

    const currentStepElement = screen.getByText('서비스 개요 및 목표 설정').closest('li');
    expect(currentStepElement).toHaveClass('bg-blue-50', 'border-blue-200');
  });

  it('shows completion status for steps', () => {
    render(<WorkflowSidebar {...defaultProps} />);

    // Step 1 should show as completed
    const step1 = screen.getByText('서비스 개요 및 목표 설정').closest('li');
    expect(step1?.querySelector('.text-green-600')).toBeInTheDocument();

    // Step 2 should show as not completed
    const step2 = screen.getByText('타겟 사용자 분석').closest('li');
    expect(step2?.querySelector('.text-gray-400')).toBeInTheDocument();
  });

  it('navigates to step when clicked', async () => {
    const user = userEvent.setup();
    render(<WorkflowSidebar {...defaultProps} />);

    const step2 = screen.getByText('타겟 사용자 분석');
    await user.click(step2);

    expect(mockPush).toHaveBeenCalledWith('/ai-pm/test-project/workflow/2');
  });

  it('shows step numbers', () => {
    render(<WorkflowSidebar {...defaultProps} />);

    for (let i = 1; i <= 9; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument();
    }
  });

  it('displays document count for each step', () => {
    render(<WorkflowSidebar {...defaultProps} />);

    // Step 1 has 1 document
    const step1 = screen.getByText('서비스 개요 및 목표 설정').closest('li');
    expect(step1).toHaveTextContent('1개 문서');

    // Step 2 has 0 documents
    const step2 = screen.getByText('타겟 사용자 분석').closest('li');
    expect(step2).toHaveTextContent('0개 문서');
  });

  it('shows last updated time for completed steps', () => {
    render(<WorkflowSidebar {...defaultProps} />);

    const step1 = screen.getByText('서비스 개요 및 목표 설정').closest('li');
    expect(step1).toHaveTextContent('2024-01-01');
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<WorkflowSidebar {...defaultProps} />);

    const step2 = screen.getByText('타겟 사용자 분석');
    await user.tab();
    await user.keyboard('{Enter}');

    expect(mockPush).toHaveBeenCalledWith('/ai-pm/test-project/workflow/2');
  });

  it('shows progress indicator', () => {
    render(<WorkflowSidebar {...defaultProps} />);

    // Should show 1 out of 9 steps completed
    expect(screen.getByText('1/9 단계 완료')).toBeInTheDocument();
  });

  it('applies correct styling for different step states', () => {
    render(<WorkflowSidebar {...defaultProps} />);

    // Current step styling
    const currentStep = screen.getByText('서비스 개요 및 목표 설정').closest('li');
    expect(currentStep).toHaveClass('bg-blue-50');

    // Completed step styling
    expect(currentStep?.querySelector('.bg-green-100')).toBeInTheDocument();

    // Incomplete step styling
    const incompleteStep = screen.getByText('타겟 사용자 분석').closest('li');
    expect(incompleteStep?.querySelector('.bg-gray-100')).toBeInTheDocument();
  });

  it('shows workflow completion percentage', () => {
    render(<WorkflowSidebar {...defaultProps} />);

    // 1 out of 9 steps = ~11%
    expect(screen.getByText('11%')).toBeInTheDocument();
  });

  it('handles empty progress data', () => {
    render(<WorkflowSidebar {...defaultProps} progress={[]} />);

    // Should still render all steps
    Object.entries(WORKFLOW_STEPS).forEach(([step, name]) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });

    // Should show 0% completion
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows step descriptions on hover', async () => {
    const user = userEvent.setup();
    render(<WorkflowSidebar {...defaultProps} />);

    const step1 = screen.getByText('서비스 개요 및 목표 설정');
    await user.hover(step1);

    // Should show tooltip with step description
    expect(screen.getByText(/플랫폼의 전체적인 개요와 목표를 설정/)).toBeInTheDocument();
  });

  it('disables navigation for future steps when sequential mode is enabled', () => {
    render(<WorkflowSidebar {...defaultProps} sequentialMode={true} />);

    // Step 3 and beyond should be disabled since step 2 is not completed
    const step3 = screen.getByText('핵심 기능 정의').closest('li');
    expect(step3).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('shows warning for steps with conflicts', () => {
    const progressWithConflicts = [
      ...defaultProps.progress,
      { workflow_step: 4, step_name: '사용자 경험 설계', has_official_document: true, document_count: 1, last_updated: '2024-01-01', has_conflicts: true }
    ];

    render(<WorkflowSidebar {...defaultProps} progress={progressWithConflicts} />);

    const step4 = screen.getByText('사용자 경험 설계').closest('li');
    expect(step4?.querySelector('.text-yellow-600')).toBeInTheDocument();
  });
});