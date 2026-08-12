import { parseWorkflowStepParam } from '@/lib/ai-pm/workflow-step';

describe('parseWorkflowStepParam', () => {
  it.each([
    ['1', 1],
    ['9', 9],
    ['01', 1],
  ])('accepts workflow step %s', (rawValue, expectedStep) => {
    expect(parseWorkflowStepParam(rawValue)).toBe(expectedStep);
  });

  it.each(['0', '10', 'step-1', '10x', '', ' '])('rejects invalid workflow step %s', (rawValue) => {
    expect(parseWorkflowStepParam(rawValue)).toBeNull();
  });
});
