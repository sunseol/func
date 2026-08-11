import { isValidWorkflowStep, type WorkflowStep } from '@/types/ai-pm';

export function parseWorkflowStepParam(value: unknown): WorkflowStep | null {
  const rawValue = Array.isArray(value) ? (value.length === 1 ? value[0] : undefined) : value;
  if (typeof rawValue !== 'string' || !/^\d+$/.test(rawValue)) {
    return null;
  }

  const step = Number(rawValue);
  return isValidWorkflowStep(step) ? step : null;
}
