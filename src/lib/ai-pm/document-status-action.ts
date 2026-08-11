import type { DocumentStatus } from '@/types/ai-pm';

export type DocumentStatusAction = 'request-approval' | 'approve' | 'withdraw-approval' | 'update';

export function getDocumentStatusAction(
  currentStatus: DocumentStatus,
  newStatus: DocumentStatus,
): DocumentStatusAction | null {
  if (currentStatus === 'private' && newStatus === 'pending_approval') {
    return 'request-approval';
  }

  if (currentStatus === 'pending_approval' && newStatus === 'official') {
    return 'approve';
  }

  if (currentStatus === 'pending_approval' && newStatus === 'private') {
    return 'withdraw-approval';
  }

  if (currentStatus === 'official' && newStatus === 'private') {
    return 'update';
  }

  return null;
}
