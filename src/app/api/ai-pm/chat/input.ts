import { requireMaxLength, requireString, requireWorkflowStep } from '@/lib/ai-pm/validators';
import { ApiError } from '@/lib/http';
import { AIpmErrorType } from '@/types/ai-pm';
import type { SendMessageRequest } from '@/types/ai-pm';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseSendMessageRequest(value: unknown): SendMessageRequest {
  if (!isRecord(value)) {
    throw new ApiError(400, AIpmErrorType.VALIDATION_ERROR, 'Request body must be an object');
  }
  return {
    message: requireMaxLength(requireString(value.message, 'message'), 'message', 5000),
    workflow_step: requireWorkflowStep(value.workflow_step, 'workflow_step'),
  };
}
