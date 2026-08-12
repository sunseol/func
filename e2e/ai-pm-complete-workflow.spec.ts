import { expect, test } from '@playwright/test';
import { getSeededApprovalHistory, getSeededDocumentState, login, openWorkflow, requireAIPMBackend, seedDocument, seedProject } from './ai-pm/fixtures';
import { TEST_USERS, cleanupTestData, setupTestData } from './utils/test-helpers';

test.describe('AI-PM workflow contract', () => {
  test.beforeEach(async ({}, testInfo) => {
    requireAIPMBackend(testInfo);
    await setupTestData();
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== 'skipped') await cleanupTestData();
  });

  test('QA-AIPM-001 dashboard cards and stats are scoped to seeded projects', async ({ page }) => {
    const project = await seedProject('QA-AIPM-001');
    await login(page, TEST_USERS.admin);
    await page.goto('/ai-pm');
    await expect(page.getByText(project.name, { exact: true })).toBeVisible();
    await expect(page.getByText('전체 프로젝트')).toBeVisible();
    await expect(page.getByText('내 프로젝트')).toBeVisible();
  });

  test('QA-AIPM-002 create and delete use the project API lifecycle', async ({ page }) => {
    await login(page, TEST_USERS.admin);
    await page.goto('/ai-pm');
    await page.getByRole('button', { name: '새 프로젝트' }).first().click();
    const name = `E2E_AUDIT_QA-AIPM-002_${Date.now().toString(36)}`;
    await page.getByLabel('프로젝트 이름').fill(name);
    const createResponsePromise = page.waitForResponse((response) => (
      response.url().endsWith('/api/ai-pm/projects') && response.request().method() === 'POST'
    ));
    await page.getByRole('button', { name: '프로젝트 생성' }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    const createPayload: { readonly project?: { readonly id?: unknown } } = await createResponse.json();
    expect(typeof createPayload.project?.id).toBe('string');
    await page.waitForURL(/\/ai-pm\/[^/]+$/);
    const projectId = new URL(page.url()).pathname.split('/').at(-1);
    expect(projectId).toBeTruthy();
    expect(projectId).toBe(createPayload.project?.id);
    const response = await page.request.delete(`/api/ai-pm/projects/${projectId}`);
    expect(response.status()).toBe(200);
  });

  test('QA-WF-001 discovery renders guide and current progress', async ({ page }) => {
    const project = await seedProject('QA-WF-001');
    await login(page, TEST_USERS.admin);
    await openWorkflow(page, project.id, 1);
    await expect(page.getByTestId('workflow-step-1')).toBeVisible();
    await page.getByRole('button', { name: '워크플로우 가이드' }).click();
    await expect(page.getByText('1단계: 컨셉 정의 및 기획')).toBeVisible();
  });

  test('QA-WF-002 research is reachable only through the workflow sidebar', async ({ page }) => {
    const project = await seedProject('QA-WF-002');
    await login(page, TEST_USERS.admin);
    await openWorkflow(page, project.id, 2);
    await expect(page).toHaveURL(new RegExp(`/workflow/2$`));
    await expect(page.getByTestId('workflow-step-2')).toBeVisible();
  });

  test('QA-WF-003 requirements guide is rendered for step 3', async ({ page }) => {
    const project = await seedProject('QA-WF-003');
    await login(page, TEST_USERS.admin);
    await openWorkflow(page, project.id, 3);
    await page.getByRole('button', { name: '워크플로우 가이드' }).click();
    await expect(page.getByText('3단계: 파트별 문서 제작')).toBeVisible();
  });

  test('QA-WF-004 information architecture keeps the role-aware workspace reachable', async ({ page }) => {
    const project = await seedProject('QA-WF-004', { planner2: 'service_planning', planner1: 'ux_planning' });
    await login(page, TEST_USERS.admin);
    await openWorkflow(page, project.id, 4);
    await expect(page.getByTestId('workflow-step-4')).toBeVisible();
    await expect(page.getByRole('button', { name: '문서 편집기' })).toBeVisible();
  });

  test('QA-WF-005 interaction design workspace is reachable at step 5', async ({ page }) => {
    const project = await seedProject('QA-WF-005', { planner2: 'service_planning', designer: 'developer' });
    await login(page, TEST_USERS.admin);
    await openWorkflow(page, project.id, 5);
    await expect(page.getByRole('button', { name: 'AI 어시스턴트' })).toBeVisible();
  });

  test('QA-WF-006 visual design remains usable at a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const project = await seedProject('QA-WF-006');
    await login(page, TEST_USERS.admin);
    await openWorkflow(page, project.id, 6);
    await expect(page.getByTestId('workflow-step-6')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test('QA-WF-007 implementation plan exposes its document workspace', async ({ page }) => {
    const project = await seedProject('QA-WF-007');
    await login(page, TEST_USERS.admin);
    await openWorkflow(page, project.id, 7);
    await expect(page.getByRole('button', { name: '문서 편집기' })).toBeVisible();
    await expect(page.getByText('문서를 선택해주세요')).toBeVisible();
  });

  test('QA-WF-008 review loads without granting an unauthorized mutation control', async ({ page }) => {
    const project = await seedProject('QA-WF-008', { planner1: 'content_planning' });
    await login(page, TEST_USERS.planner1);
    await openWorkflow(page, project.id, 8);
    await expect(page.getByTestId('workflow-step-8')).toBeVisible();
    await expect(page.getByRole('button', { name: '승인' })).toHaveCount(0);
  });

  test('QA-WF-009 delivery is the terminal step with no step 10 link', async ({ page }) => {
    const project = await seedProject('QA-WF-009');
    await login(page, TEST_USERS.admin);
    await openWorkflow(page, project.id, 9);
    await expect(page.getByTestId('workflow-step-9')).toBeVisible();
    await expect(page.getByTestId('workflow-step-10')).toHaveCount(0);
  });

  test('QA-DOC-001 select, edit, save and version the seeded document', async ({ page }) => {
    const project = await seedProject('QA-DOC-001');
    await seedDocument(project.id, 1, 'E2E_AUDIT original content');
    await login(page, TEST_USERS.admin);
    await openWorkflow(page, project.id, 1);
    await page.getByText('E2E_AUDIT document 1', { exact: true }).click();
    await expect(page.getByTestId('document-editor')).toBeVisible();
    await page.getByRole('button', { name: '문서 편집', exact: true }).click();
    await page.getByLabel('문서 내용').fill('E2E_AUDIT edited content');
    const saveResponsePromise = page.waitForResponse((response) => (
      response.url().includes('/api/ai-pm/documents/') && response.request().method() === 'PUT'
    ));
    await page.getByRole('button', { name: '완료' }).click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.status()).toBe(200);
    const savePayload: { readonly document?: { readonly version?: unknown } } = await saveResponse.json();
    expect(typeof savePayload.document?.version).toBe('number');
    expect(savePayload.document?.version).toBeGreaterThan(1);
    await expect(page.getByText('문서 저장 완료', { exact: true })).toHaveCount(1);
  });

  test('QA-DOC-004 private documents request approval through the endpoint and record the transition', async ({ page }) => {
    const project = await seedProject('QA-DOC-004');
    const documentId = await seedDocument(project.id, 1, 'E2E_AUDIT approval content');
    await login(page, TEST_USERS.admin);
    const response = await page.request.post(`/api/ai-pm/documents/${documentId}/request-approval`);
    expect(response.status()).toBe(200);
    const payload: { readonly document?: { readonly id?: unknown; readonly status?: unknown } } = await response.json();
    expect(payload.document?.id).toBe(documentId);
    expect(payload.document?.status).toBe('pending_approval');

    const documentState = await getSeededDocumentState(documentId);
    expect(documentState.status).toBe('pending_approval');
    const approvalHistory = await getSeededApprovalHistory(documentId);
    expect(approvalHistory).toContainEqual({ action: 'requested', previousStatus: 'private', newStatus: 'pending_approval' });
  });

  test('QA-AIPM-006 settings reports that project mutation controls are not implemented', async ({ page }) => {
    const project = await seedProject('QA-AIPM-006');
    await login(page, TEST_USERS.admin);
    await page.goto(`/ai-pm/${project.id}`);
    await page.getByRole('button', { name: '설정' }).click();
    await expect(page.getByText('프로젝트 설정 기능은 향후 구현 예정입니다.')).toBeVisible();
  });
});
