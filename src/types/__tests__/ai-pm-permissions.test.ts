import { canProjectRoleApprove } from '../ai-pm';

describe('AI-PM approval role contract', () => {
  it('allows the workflow approver role to approve its own pending document', () => {
    expect(canProjectRoleApprove('service_planning', 1)).toBe(true);
  });

  it('does not grant approval to a non-approver role for that workflow step', () => {
    expect(canProjectRoleApprove('content_planning', 1)).toBe(false);
  });
});
