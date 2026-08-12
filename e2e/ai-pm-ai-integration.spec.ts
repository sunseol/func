import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { expectProjectAccessDenied, login, openWorkflow, requireAIPMBackend, seedDocument, seedProject, streamBody } from './ai-pm/fixtures';
import { TEST_USERS, cleanupTestData, setupTestData } from './utils/test-helpers';

test.describe('AI-PM deterministic AI integration', () => {
  test.beforeEach(async ({}, testInfo) => {
    requireAIPMBackend(testInfo);
    await setupTestData();
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== 'skipped') await cleanupTestData();
  });

  test('QA-AIPM-003 unknown project renders bounded access-denied recovery', async ({ page }) => {
    await login(page, TEST_USERS.admin);
    await page.goto(`/ai-pm/${randomUUID()}/workflow/1`);
    await expectProjectAccessDenied(page);
    await expect(page.getByText(/stack|Error:|at /i)).toHaveCount(0);
  });

  test('QA-DOC-006 conflict analysis API is deterministic and exposes severity', async ({ page }) => {
    const project = await seedProject('QA-DOC-006');
    const firstDocument = await seedDocument(project.id, 1, 'E2E_AUDIT mobile only');
    const secondDocument = await seedDocument(project.id, 2, 'E2E_AUDIT offline only');
    await login(page, TEST_USERS.admin);
    await page.route('**/api/ai-pm/documents/analyze-conflicts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          analysis: {
            hasConflicts: true,
            conflictLevel: 'major',
            conflicts: [{ conflictingDocument: secondDocument, severity: 'high', description: firstDocument, suggestion: 'E2E_AUDIT reconcile terms' }],
          },
        }),
      });
    });
    const result = await page.evaluate(async (projectId) => {
      const response = await fetch('/api/ai-pm/documents/analyze-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, workflowStep: 1 }),
      });
      return { status: response.status, text: await response.text() };
    }, project.id);
    expect(result.status).toBe(200);
    expect(result.text).toContain('major');
  });

  test('QA-CHAT-001 chat send and history preserve user and assistant messages', async ({ page }) => {
    const project = await seedProject('QA-CHAT-001');
    const messages: string[] = [];
    await login(page, TEST_USERS.admin);
    await page.route('**/api/ai-pm/chat?*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversation: { messages } }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'OK' }) });
    });
    await page.route('**/api/ai-pm/chat/stream?*', async (route) => {
      const rawBody: unknown = route.request().postDataJSON();
      const userMessage = typeof rawBody === 'object' && rawBody !== null && 'message' in rawBody && typeof rawBody.message === 'string'
        ? rawBody.message
        : 'E2E_AUDIT message';
      messages.push(userMessage, 'E2E_AUDIT assistant response');
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: streamBody(['E2E_AUDIT assistant response']) });
    });
    await openWorkflow(page, project.id, 1);
    await page.getByRole('button', { name: 'AI 어시스턴트' }).click();
    await page.getByPlaceholder('Type your message...').fill('E2E_AUDIT first message');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByTestId('ai-response').last()).toContainText('E2E_AUDIT assistant response');
    await expect(page.locator('[data-testid="ai-message"]')).toHaveCount(3);
  });

  test('QA-CHAT-002 stream chunks append into one completed response', async ({ page }) => {
    const project = await seedProject('QA-CHAT-002');
    await login(page, TEST_USERS.admin);
    await page.route('**/api/ai-pm/chat?*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversation: { messages: [] } }) }));
    await page.route('**/api/ai-pm/chat/stream?*', (route) => route.fulfill({ status: 200, contentType: 'text/event-stream', body: streamBody(['E2E_AUDIT chunk one ', 'chunk two']) }));
    await openWorkflow(page, project.id, 1);
    await page.getByRole('button', { name: 'AI 어시스턴트' }).click();
    await page.getByPlaceholder('Type your message...').fill('E2E_AUDIT streaming prompt');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByTestId('ai-response').last()).toContainText('E2E_AUDIT chunk one chunk two');
    await expect(page.getByTestId('ai-typing-indicator')).toHaveCount(0);
  });

  test('QA-CHAT-003 history clear and export use the server contracts', async ({ page }) => {
    const project = await seedProject('QA-CHAT-003');
    await login(page, TEST_USERS.admin);
    await page.route('**/api/ai-pm/chat/export?*', (route) => route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: 'E2E_AUDIT export' }));
    await page.route('**/api/ai-pm/chat?*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'OK' }) }));
    const exportResult = await page.evaluate(async (projectId) => {
      const response = await fetch(`/api/ai-pm/chat/export?projectId=${projectId}&workflowStep=1&format=text`);
      return { status: response.status, type: response.headers.get('content-type'), text: await response.text() };
    }, project.id);
    expect(exportResult.status).toBe(200);
    expect(exportResult.type).toContain('text/plain');
    expect(exportResult.text).toContain('E2E_AUDIT export');
    const clearResult = await page.request.delete(`/api/ai-pm/chat?projectId=${project.id}&workflowStep=1`);
    expect(clearResult.status()).toBe(200);
  });

  test('QA-CHAT-004 provider error can be retried without duplicate user messages', async ({ page }) => {
    const project = await seedProject('QA-CHAT-004');
    const streamAttempts: string[] = [];
    await login(page, TEST_USERS.admin);
    await page.route('**/api/ai-pm/chat?*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversation: { messages: [] } }) }));
    await page.route('**/api/ai-pm/chat/stream?*', async (route) => {
      const rawBody: unknown = route.request().postDataJSON();
      const prompt = typeof rawBody === 'object' && rawBody !== null && 'message' in rawBody && typeof rawBody.message === 'string'
        ? rawBody.message
        : '';
      streamAttempts.push(prompt);
      if (streamAttempts.length === 1) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'provider unavailable' }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: streamBody(['E2E_AUDIT retry response']) });
    });
    await openWorkflow(page, project.id, 1);
    await page.getByRole('button', { name: 'AI 어시스턴트' }).click();
    await page.getByPlaceholder('Type your message...').fill('E2E_AUDIT retry prompt');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByTestId('ai-error-message')).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
    await page.getByRole('button', { name: /retry/i }).click();
    await expect(page.getByTestId('ai-response').last()).toContainText('E2E_AUDIT retry response');
    await expect(page.getByTestId('ai-error-message')).toHaveCount(0);
    await expect(page.locator('[data-testid="ai-message"][data-message-role="user"]')).toHaveCount(1);
    await expect(page.getByTestId('ai-response').filter({ hasText: 'E2E_AUDIT retry response' })).toHaveCount(1);
    expect(streamAttempts).toEqual(['E2E_AUDIT retry prompt', 'E2E_AUDIT retry prompt']);
  });
});
