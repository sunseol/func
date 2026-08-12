import { expect, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { addTestProjectMember, createTestDocument, createTestProject, getUserByEmail } from '../setup/audit-seed';
import { isLocalSupabaseMutationEnvironment, requireLocalSupabaseMutation, supabaseAdmin, TEST_USERS_DATA } from '../setup/test-setup';
import { TEST_USERS, type TestUser } from '../utils/test-helpers';

export type AuditProject = Readonly<{
  id: string;
  name: string;
  ownerId: string;
}>;

export function requireAIPMBackend(testInfo: TestInfo): void {
  const ready = Boolean(
    isLocalSupabaseMutationEnvironment() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  testInfo.skip(!ready, 'blocked-env: local Supabase E2E credentials are unavailable');
}

export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('이메일').fill(user.email);
  await page.getByLabel('비밀번호').fill(user.password);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 });
}

export async function loginContext(browser: Browser, user: TestUser): Promise<BrowserContext> {
  const context = await browser.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
  });
  const page = await context.newPage();
  try {
    await login(page, user);
  } catch (error) {
    await context.close();
    throw error;
  }
  await page.close();
  return context;
}

export async function seedProject(scenarioId: string, memberRoles: Readonly<Record<string, string>> = {}): Promise<AuditProject> {
  const owner = await getUserByEmail(TEST_USERS.admin.email);
  const name = `E2E_AUDIT_${scenarioId}_${Date.now().toString(36)}`;
  const project = await createTestProject(owner.id, name, `Disposable ${scenarioId}`);
  for (const [userKey, role] of Object.entries(memberRoles)) {
    const user = TEST_USERS_DATA[userKey];
    if (!user) throw new Error(`Unknown E2E user: ${userKey}`);
    const profile = await getUserByEmail(user.email);
    await addTestProjectMember(project.id, profile.id, role, owner.id);
  }
  return { id: project.id, name: project.name, ownerId: owner.id };
}

export async function seedDocument(projectId: string, workflowStep: number, content: string, createdByEmail = TEST_USERS.admin.email): Promise<string> {
  const creator = await getUserByEmail(createdByEmail);
  const document = await createTestDocument(projectId, workflowStep, `E2E_AUDIT document ${workflowStep}`, content, creator.id);
  return document.id;
}

export async function getSeededProjectMemberRole(projectId: string, user: TestUser): Promise<string> {
  requireLocalSupabaseMutation();
  const profile = await getUserByEmail(user.email);
  const { data, error } = await supabaseAdmin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', profile.id)
    .single();
  if (error || !data) throw new Error(`Failed to verify seeded membership for ${user.email}: ${error?.message ?? 'row missing'}`);
  return data.role;
}

export async function getSeededDocumentState(documentId: string): Promise<Readonly<{ workflowStep: number; status: string }>> {
  requireLocalSupabaseMutation();
  const { data, error } = await supabaseAdmin
    .from('planning_documents')
    .select('workflow_step, status')
    .eq('id', documentId)
    .single();
  if (error || !data) throw new Error(`Failed to verify seeded document ${documentId}: ${error?.message ?? 'row missing'}`);
  return { workflowStep: data.workflow_step, status: data.status };
}

export async function getSeededApprovalHistory(documentId: string): Promise<ReadonlyArray<{ action: string; previousStatus: string; newStatus: string }>> {
  requireLocalSupabaseMutation();
  const { data, error } = await supabaseAdmin
    .from('document_approval_history')
    .select('action, previous_status, new_status')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to verify approval history for ${documentId}: ${error.message}`);
  return (data ?? []).map((entry) => ({
    action: entry.action,
    previousStatus: entry.previous_status,
    newStatus: entry.new_status,
  }));
}

export async function openWorkflow(page: Page, projectId: string, step: number): Promise<void> {
  await page.goto(`/ai-pm/${projectId}/workflow/${step}`);
  await page.waitForURL(new RegExp(`/ai-pm/${projectId}/workflow/${step}$`));
}

export async function expectProjectAccessDenied(page: Page): Promise<void> {
  await expect(page.getByTestId('access-denied')).toBeVisible();
  await expect(page.getByRole('link', { name: /프로젝트 목록으로/ })).toHaveAttribute('href', '/ai-pm');
}

export function streamBody(chunks: readonly string[]): string {
  return `${chunks.map((content) => `data: ${JSON.stringify({ content })}\n\n`).join('')}data: [DONE]\n\n`;
}
