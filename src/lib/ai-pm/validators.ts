import { ApiError } from '@/lib/http';
import {
  AIpmErrorType,
  DocumentStatus,
  ProjectRole,
  WorkflowStep,
  isValidDocumentStatus,
  isValidProjectRole,
} from '@/types/ai-pm';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireUuid(value: string, field: string) {
  if (!UUID_REGEX.test(value)) {
    throw new ApiError(400, AIpmErrorType.VALIDATION_ERROR, `${field} must be a valid UUID`);
  }
  return value;
}

export function requireString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, AIpmErrorType.VALIDATION_ERROR, `${field} is required`);
  }
  return value.trim();
}

export function requireMaxLength(value: string, field: string, maxLength: number) {
  if (value.length > maxLength) {
    throw new ApiError(
      400,
      AIpmErrorType.VALIDATION_ERROR,
      `${field} must be ${maxLength} characters or fewer`,
    );
  }
  return value;
}

export function requireWorkflowStep(value: unknown, field = 'workflow_step') {
  if (!Number.isInteger(value)) {
    throw new ApiError(400, AIpmErrorType.VALIDATION_ERROR, `${field} must be an integer`);
  }
  const step = value as number;
  if (step < 1 || step > 9) {
    throw new ApiError(400, AIpmErrorType.VALIDATION_ERROR, `${field} must be between 1 and 9`);
  }
  return step as WorkflowStep;
}

export function requireProjectRole(value: unknown, field = 'role') {
  if (typeof value !== 'string' || !isValidProjectRole(value)) {
    throw new ApiError(400, AIpmErrorType.VALIDATION_ERROR, `${field} is invalid`);
  }
  return value as ProjectRole;
}

export function requireDocumentStatus(value: unknown, field = 'status') {
  if (typeof value !== 'string' || !isValidDocumentStatus(value)) {
    throw new ApiError(400, AIpmErrorType.VALIDATION_ERROR, `${field} is invalid`);
  }
  return value as DocumentStatus;
}

export function sanitizeText(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
}
