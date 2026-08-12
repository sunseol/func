import { requireMaxLength, requireString, requireUuid, requireWorkflowStep } from '@/lib/ai-pm/validators';
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
  const optionalUuid = (field: string): string | undefined => {
    if (value[field] === undefined) return undefined;
    return requireUuid(requireString(value[field], field), field);
  };
  const idempotencyKey = optionalUuid('idempotency_key');
  const userMessageId = optionalUuid('user_message_id');
  const assistantMessageId = optionalUuid('assistant_message_id');
  const suppliedIds = [idempotencyKey, userMessageId, assistantMessageId].filter(
    (id): id is string => id !== undefined,
  );
  if (suppliedIds.length !== 0 && suppliedIds.length !== 3) {
    throw new ApiError(
      400,
      AIpmErrorType.VALIDATION_ERROR,
      'idempotency_key, user_message_id, and assistant_message_id must be supplied together',
    );
  }
  return {
    message: requireMaxLength(requireString(value.message, 'message'), 'message', 5000),
    workflow_step: requireWorkflowStep(value.workflow_step, 'workflow_step'),
    ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
    ...(userMessageId ? { user_message_id: userMessageId } : {}),
    ...(assistantMessageId ? { assistant_message_id: assistantMessageId } : {}),
  };
}
