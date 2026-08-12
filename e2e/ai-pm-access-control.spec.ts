import { expect, test, type BrowserContext } from '@playwright/test';
import { expectProjectAccessDenied, getSeededApprovalHistory, getSeededDocumentState, getSeededProjectMemberRole, login, loginContext, openWorkflow, requireAIPMBackend, seedDocument, seedProject } from './ai-pm/fixtures';
import { TEST_USERS, cleanupTestData, setupTestData } from './utils/test-helpers';

test.describe('AI-PM access and document permissions', () => {
  test.beforeEach(async ({}, testInfo) => {
    requireAIPMBackend(testInfo);
    await setupTestData();
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== 'skipped') await cleanupTestData();
  });

  test('QA-AIPM-005 project member search and CRUD enforce project management access', async ({ browser }) => {
    const project = await seedProject('QA-AIPM-005', { planner1: 'content_planning' });
    const adminContext = await loginContext(browser, TEST_USERS.admin);
    const nonManagerContext = await loginContext(browser, TEST_USERS.planner1);
    const nonMemberContext = await loginContext(browser, TEST_USERS.designer);
    try {
      const forbidden = await nonMemberContext.request.get(`/api/ai-pm/projects/${project.id}/members`);
      expect(forbidden.status()).toBe(403);

      const allowed = await nonManagerContext.request.get(`/api/ai-pm/projects/${project.id}/members`);
      expect(allowed.status()).toBe(200);

      const search = await adminContext.request.get('/api/ai-pm/users/search?email=designer%40test.com');
      expect(search.status()).toBe(200);
      const searchPayload: { readonly users?: ReadonlyArray<{ readonly id: string; readonly email: string }> } = await search.json();
      const designer = searchPayload.users?.find((user) => user.email === TEST_USERS.designer.email);
      expect(designer).toBeDefined();

      const added = await adminContext.request.post(`/api/ai-pm/projects/${project.id}/members`, {
        data: { user_id: designer?.id, role: 'ux_planning' },
      });
      expect(added.status()).toBe(201);
      const addedPayload: { readonly member: { readonly id: string; readonly user_id: string; readonly role: string } } = await added.json();
      expect(addedPayload.member).toMatchObject({ user_id: designer?.id, role: 'ux_planning' });

      const updated = await adminContext.request.put(`/api/ai-pm/projects/${project.id}/members`, {
        data: { memberId: addedPayload.member.id, role: 'developer' },
      });
      expect(updated.status()).toBe(200);
      const updatedPayload: { readonly member: { readonly id: string; readonly role: string } } = await updated.json();
      expect(updatedPayload.member).toMatchObject({ id: addedPayload.member.id, role: 'developer' });

      const nonManagerUpdate = await nonManagerContext.request.put(`/api/ai-pm/projects/${project.id}/members`, {
        data: { memberId: addedPayload.member.id, role: 'content_planning' },
      });
      expect(nonManagerUpdate.status()).toBe(403);

      const removed = await adminContext.request.delete(`/api/ai-pm/projects/${project.id}/members?memberId=${addedPayload.member.id}`);
      expect(removed.status()).toBe(200);

      const nonManagerAdd = await nonManagerContext.request.post(`/api/ai-pm/projects/${project.id}/members`, {
        data: { user_id: designer?.id, role: 'ux_planning' },
      });
      expect(nonManagerAdd.status()).toBe(403);
    } finally {
      await Promise.all([adminContext.close(), nonManagerContext.close(), nonMemberContext.close()]);
    }
  });

  test('QA-WF-010 invalid workflow step is denied with project-list recovery', async ({ page }) => {
    const project = await seedProject('QA-WF-010');
    await login(page, TEST_USERS.admin);
    await page.goto(`/ai-pm/${project.id}/workflow/10`);
    await expectProjectAccessDenied(page);
  });

  test('QA-DOC-003 version history returns exact edited content and denies outsiders', async ({ browser }) => {
    const project = await seedProject('QA-DOC-003', { planner1: 'content_planning' });
    const documentId = await seedDocument(project.id, 1, 'E2E_AUDIT version one');
    const adminContext = await loginContext(browser, TEST_USERS.admin);
    const outsiderContext = await loginContext(browser, TEST_USERS.designer);
    try {
      const firstEdit = await adminContext.request.put(`/api/ai-pm/documents/${documentId}`, {
        data: { version: 1, content: 'E2E_AUDIT version two' },
      });
      expect(firstEdit.status()).toBe(200);
      const secondEdit = await adminContext.request.put(`/api/ai-pm/documents/${documentId}`, {
        data: { version: 2, content: 'E2E_AUDIT version three' },
      });
      expect(secondEdit.status()).toBe(200);

      const response = await adminContext.request.get(`/api/ai-pm/documents/${documentId}/versions`);
      expect(response.status()).toBe(200);
      const body: { readonly versions?: ReadonlyArray<{ readonly version: number; readonly content: string; readonly document_id: string }> } = await response.json();
      expect(body.versions).toEqual([
        expect.objectContaining({ version: 1, content: 'E2E_AUDIT version one', document_id: documentId }),
        expect.objectContaining({ version: 2, content: 'E2E_AUDIT version two', document_id: documentId }),
        expect.objectContaining({ version: 3, content: 'E2E_AUDIT version three', document_id: documentId }),
      ]);

      const outsider = await outsiderContext.request.get(`/api/ai-pm/documents/${documentId}/versions`);
      expect(outsider.status()).toBe(404);
      expect(await outsider.json()).toMatchObject({ error: 'DOCUMENT_NOT_FOUND' });
    } finally {
      await Promise.all([adminContext.close(), outsiderContext.close()]);
    }
  });

  test('QA-DOC-005 implemented approval transitions enforce roles and status', async ({ browser }) => {
    const project = await seedProject('QA-DOC-005', { planner1: 'content_planning', planner2: 'service_planning' });
    const documentId = await seedDocument(project.id, 1, 'E2E_AUDIT approval matrix');
    const adminContext = await loginContext(browser, TEST_USERS.admin);
    const unauthorizedContext = await loginContext(browser, TEST_USERS.planner1);
    const authorizedContext = await loginContext(browser, TEST_USERS.planner2);
    try {
      const request = await adminContext.request.post(`/api/ai-pm/documents/${documentId}/request-approval`);
      expect(request.status()).toBe(200);

      expect(await getSeededProjectMemberRole(project.id, TEST_USERS.planner1)).toBe('content_planning');
      expect(await getSeededProjectMemberRole(project.id, TEST_USERS.planner2)).toBe('service_planning');
      await expectContextProjectRole(unauthorizedContext, project.id, 'content_planning');
      await expectContextProjectRole(authorizedContext, project.id, 'service_planning');
      await expectSeededPendingDocument(documentId);

      const unauthorized = await unauthorizedContext.request.post(`/api/ai-pm/documents/${documentId}/approve`);
      expect(unauthorized.status()).toBe(404);
      expect(await unauthorized.json()).toMatchObject({ error: 'DOCUMENT_NOT_FOUND' });

      const authorized = await authorizedContext.request.post(`/api/ai-pm/documents/${documentId}/approve`);
      expect(authorized.status()).toBe(200);
      expect(await authorized.json()).toMatchObject({ document: { status: 'official' } });
      expect(await getSeededDocumentState(documentId)).toEqual({ workflowStep: 1, status: 'official' });
      expect(await getSeededApprovalHistory(documentId)).toEqual([
        expect.objectContaining({ action: 'requested', previousStatus: 'private', newStatus: 'pending_approval' }),
        expect.objectContaining({ action: 'approved', previousStatus: 'pending_approval', newStatus: 'official' }),
      ]);

      const invalidStatus = await authorizedContext.request.post(`/api/ai-pm/documents/${documentId}/approve`);
      expect(invalidStatus.status()).toBe(400);
      expect(await invalidStatus.json()).toMatchObject({ error: 'VALIDATION_ERROR' });

      const withdrawDocumentId = await seedDocument(project.id, 2, 'E2E_AUDIT withdraw matrix');
      const withdrawRequest = await adminContext.request.post(`/api/ai-pm/documents/${withdrawDocumentId}/request-approval`);
      expect(withdrawRequest.status()).toBe(200);
      const withdraw = await adminContext.request.post(`/api/ai-pm/documents/${withdrawDocumentId}/withdraw-approval`);
      expect(withdraw.status()).toBe(200);
      expect(await withdraw.json()).toMatchObject({ document: { status: 'private' } });
      expect(await getSeededDocumentState(withdrawDocumentId)).toEqual({ workflowStep: 2, status: 'private' });

      const invalidWithdraw = await adminContext.request.post(`/api/ai-pm/documents/${withdrawDocumentId}/withdraw-approval`);
      expect(invalidWithdraw.status()).toBe(400);
      expect(await invalidWithdraw.json()).toMatchObject({ error: 'APPROVAL_REQUIRED' });
    } finally {
      await Promise.all([adminContext.close(), unauthorizedContext.close(), authorizedContext.close()]);
    }
  });
});

async function expectContextProjectRole(context: BrowserContext, projectId: string, role: string): Promise<void> {
  const response = await context.request.get('/api/ai-pm/projects');
  expect(response.status()).toBe(200);
  const body: unknown = await response.json();
  expect(body).toMatchObject({
    projects: expect.arrayContaining([expect.objectContaining({ id: projectId, user_role: role })]),
  });
}

async function expectSeededPendingDocument(documentId: string): Promise<void> {
  expect(await getSeededDocumentState(documentId)).toEqual({ workflowStep: 1, status: 'pending_approval' });
}
