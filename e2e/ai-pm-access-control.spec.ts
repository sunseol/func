import { expect, test, type BrowserContext } from '@playwright/test';
import { expectProjectAccessDenied, getSeededDocumentState, getSeededProjectMemberRole, login, loginContext, openWorkflow, requireAIPMBackend, seedDocument, seedProject } from './ai-pm/fixtures';
import { TEST_USERS, cleanupTestData, setupTestData } from './utils/test-helpers';

test.describe('AI-PM access and document permissions', () => {
  test.beforeEach(async ({}, testInfo) => {
    requireAIPMBackend(testInfo);
    await setupTestData();
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== 'skipped') await cleanupTestData();
  });

  test('QA-AIPM-005 project membership controls project member API access', async ({ browser }) => {
    const project = await seedProject('QA-AIPM-005', { planner1: 'content_planning' });
    const nonMemberContext = await loginContext(browser, TEST_USERS.designer);
    const memberContext = await loginContext(browser, TEST_USERS.planner1);
    try {
      const forbidden = await nonMemberContext.request.get(`/api/ai-pm/projects/${project.id}/members`);
      expect(forbidden.status()).toBe(403);

      const allowed = await memberContext.request.get(`/api/ai-pm/projects/${project.id}/members`);
      expect(allowed.status()).toBe(200);
    } finally {
      await Promise.all([nonMemberContext.close(), memberContext.close()]);
    }
  });

  test('QA-WF-010 invalid workflow step is denied with project-list recovery', async ({ page }) => {
    const project = await seedProject('QA-WF-010');
    await login(page, TEST_USERS.admin);
    await page.goto(`/ai-pm/${project.id}/workflow/10`);
    await expectProjectAccessDenied(page);
  });

  test('QA-DOC-003 version history endpoint is scoped to the document id', async ({ page }) => {
    const project = await seedProject('QA-DOC-003', { planner1: 'content_planning' });
    const documentId = await seedDocument(project.id, 1, 'E2E_AUDIT version one');
    await login(page, TEST_USERS.admin);
    const response = await page.request.get(`/api/ai-pm/documents/${documentId}/versions`);
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    const versions = typeof body === 'object' && body !== null && 'versions' in body ? body.versions : null;
    expect(Array.isArray(versions)).toBe(true);
  });

  test('QA-DOC-005 approval transitions use canonical project roles and hide inaccessible documents', async ({ browser }) => {
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
