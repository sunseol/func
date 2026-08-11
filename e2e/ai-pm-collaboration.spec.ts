import { expect, test } from '@playwright/test';
import { login, openWorkflow, requireAIPMBackend, seedDocument, seedProject } from './ai-pm/fixtures';
import { TEST_USERS, cleanupTestData, setupTestData } from './utils/test-helpers';

test.describe('AI-PM collaboration and lifecycle', () => {
  test.beforeEach(async ({}, testInfo) => {
    requireAIPMBackend(testInfo);
    await setupTestData();
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== 'skipped') await cleanupTestData();
  });

  test('QA-AIPM-004 collaboration tab renders activity and progress surfaces', async ({ page }) => {
    const project = await seedProject('QA-AIPM-004', { planner1: 'content_planning', planner2: 'service_planning' });
    await login(page, TEST_USERS.admin);
    await page.goto(`/ai-pm/${project.id}`);
    await page.getByRole('button', { name: '협업 현황' }).click();
    await expect(page.getByTestId('project-collaboration-dashboard')).toBeVisible();
    await expect(page.getByTestId('activity-feed')).toBeVisible();
  });

  test('QA-DOC-002 deleting a selected private document removes it from the API', async ({ page }) => {
    const project = await seedProject('QA-DOC-002');
    const documentId = await seedDocument(project.id, 1, 'E2E_AUDIT delete me');
    await login(page, TEST_USERS.admin);
    await openWorkflow(page, project.id, 1);
    const deleteResponse = await page.request.delete(`/api/ai-pm/documents/${documentId}?projectId=${project.id}`);
    expect(deleteResponse.status()).toBe(200);
    const listResponse = await page.request.get(`/api/ai-pm/documents?projectId=${project.id}&workflowStep=1`);
    expect(listResponse.status()).toBe(200);
    const listBody: unknown = await listResponse.json();
    const text = JSON.stringify(listBody);
    expect(text).not.toContain(documentId);
  });

  test('QA-DOC-007 concurrent saves require a conflict response instead of silent overwrite', async ({ page }) => {
    const project = await seedProject('QA-DOC-007');
    const documentId = await seedDocument(project.id, 1, 'E2E_AUDIT concurrent baseline');
    await login(page, TEST_USERS.admin);
    const baselineResponse = await page.request.get(`/api/ai-pm/documents/${documentId}`);
    expect(baselineResponse.status()).toBe(200);
    const baselineBody: unknown = await baselineResponse.json();
    const baselineVersion = (baselineBody as { document: { version: number } }).document.version;
    const responses = await Promise.all([
      page.request.put(`/api/ai-pm/documents/${documentId}?projectId=${project.id}`, { data: { content: 'E2E_AUDIT writer one', version: baselineVersion } }),
      page.request.put(`/api/ai-pm/documents/${documentId}?projectId=${project.id}`, { data: { content: 'E2E_AUDIT writer two', version: baselineVersion } }),
    ]);
    const statuses = responses.map((response) => response.status());
    expect(statuses.filter((status) => status === 200)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(1);
    const persisted = await page.request.get(`/api/ai-pm/documents/${documentId}`);
    expect(persisted.status()).toBe(200);
    const persistedBody: unknown = await persisted.json();
    expect((persistedBody as { document: { version: number } }).document.version).toBe(baselineVersion + 1);
    const persistedContent = (persistedBody as { document: { content: string } }).document.content;
    expect(['E2E_AUDIT writer one', 'E2E_AUDIT writer two']).toContain(persistedContent);
    const versionsResponse = await page.request.get(`/api/ai-pm/documents/${documentId}/versions`);
    expect(versionsResponse.status()).toBe(200);
    const versionsBody: unknown = await versionsResponse.json();
    expect((versionsBody as { versions: Array<{ version: number; content: string }> }).versions).toContainEqual(
      expect.objectContaining({ version: baselineVersion + 1, content: persistedContent }),
    );
  });
});
