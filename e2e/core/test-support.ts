import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, type Page } from '@playwright/test';
import { guardedSupabaseFetch, isLocalSupabaseMutationEnvironment, requireLocalSupabaseMutation } from '../setup/test-setup';

export type SeededReport = Readonly<{
  id: string;
  reportDate: string;
  reportType: 'morning' | 'evening' | 'weekly';
  content: string;
}>;

export type SeededUser = Readonly<{
  id: string;
  email: string;
  password: string;
  reports: readonly SeededReport[];
}>;

export function hasLocalBackendCapability(): boolean {
  return Boolean(
    isLocalSupabaseMutationEnvironment() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function scenarioNamespace(scenarioId: string): string {
  const runId = process.env.E2E_RUN_ID ?? `${process.pid}-${Date.now().toString(36)}`;
  return `E2E_${runId}_${scenarioId}`;
}

function serviceClient(): SupabaseClient {
  requireLocalSupabaseMutation();
  if (!hasLocalBackendCapability()) {
    throw new Error('Supabase E2E capability is unavailable');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase E2E capability is unavailable');
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: guardedSupabaseFetch },
  });
}

function requireId(value: unknown, label: string): string {
  if (typeof value !== 'object' || value === null || !('id' in value)) {
    throw new Error(`${label} response did not contain an id`);
  }
  const id = value.id;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error(`${label} response contained an invalid id`);
  }
  return id;
}

export async function seedUserWithReports(
  scenarioId: string,
  reportTypes: readonly ('morning' | 'evening' | 'weekly')[] = ['morning'],
): Promise<SeededUser> {
  const client = serviceClient();
  const namespace = scenarioNamespace(scenarioId);
  const email = `${namespace.toLowerCase().replaceAll('_', '-')}@example.test`;
  const password = `${namespace.replaceAll('_', '-')}-P@ss9!`;
  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: namespace },
  });
  if (authError) throw new Error(`Unable to seed E2E user: ${authError.message}`);
  const userId = requireId(authData.user, 'auth user');

  const { error: profileError } = await client.from('user_profiles').upsert({
    id: userId,
    email,
    full_name: namespace,
    role: 'user',
  });
  if (profileError) throw new Error(`Unable to seed E2E profile: ${profileError.message}`);

  const reports: SeededReport[] = [];
  for (const [index, reportType] of reportTypes.entries()) {
    const reportDate = `2026-08-${String(11 - index).padStart(2, '0')}`;
    const content = `${namespace} report ${index + 1}`;
    const { data: reportData, error: reportError } = await client
      .from('daily_reports')
      .insert({
        user_id: userId,
        report_date: reportDate,
        report_type: reportType,
        user_name_snapshot: namespace,
        report_content: content,
        projects_data: [{ name: `${namespace} project`, tasks: [{ description: content }] }],
        misc_tasks_data: [{ description: `${content} misc` }],
      })
      .select('id')
      .single();
    if (reportError) throw new Error(`Unable to seed E2E report: ${reportError.message}`);
    reports.push({ id: requireId(reportData, 'report'), reportDate, reportType, content });
  }

  return { id: userId, email, password, reports };
}

export async function cleanupSeededUser(user: SeededUser): Promise<void> {
  const client = serviceClient();
  const { error: reportsError } = await client.from('daily_reports').delete().eq('user_id', user.id);
  if (reportsError) throw new Error(`Unable to clean E2E reports: ${reportsError.message}`);
  const { error: profileError } = await client.from('user_profiles').delete().eq('id', user.id);
  if (profileError) throw new Error(`Unable to clean E2E profile: ${profileError.message}`);
  const { error: authError } = await client.auth.admin.deleteUser(user.id);
  if (authError) throw new Error(`Unable to clean E2E user: ${authError.message}`);
}

export async function readSeededReportIds(user: SeededUser): Promise<readonly string[]> {
  const client = serviceClient();
  const { data, error } = await client.from('daily_reports').select('id').eq('user_id', user.id);
  if (error) throw new Error(`Unable to read E2E reports: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('E2E report query did not return a list');
  return data.flatMap((row: unknown) => {
    if (typeof row !== 'object' || row === null || !('id' in row) || typeof row.id !== 'string') return [];
    return [row.id];
  });
}

export async function loginSeededUser(page: Page, user: SeededUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('이메일').fill(user.email);
  await page.getByLabel('비밀번호').fill(user.password);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/');
  await expect(page).toHaveURL(/\/$/);
}
