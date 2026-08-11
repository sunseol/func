import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';
import { guardedSupabaseFetch, isLocalSupabaseMutationEnvironment, requireLocalSupabaseMutation, TEST_USERS_DATA } from '../setup/test-setup';

export interface AccountCredentials {
  email: string;
  password: string;
}

export interface AuthTestCredentials extends AccountCredentials {
  role: 'admin' | 'user';
  name: string;
}

export interface SeededNotification {
  id: string;
  userId: string;
}

export interface SeededReport {
  id: string;
  userId: string;
  content: string;
}

export interface AccountSeed {
  client: SupabaseClient;
  userId: string;
}

export const RUN_ID = process.env.E2E_RUN_ID ?? `${process.pid}-${Date.now().toString(36)}`;

function localSupabaseRun(env: NodeJS.ProcessEnv): boolean {
  return isLocalSupabaseMutationEnvironment(env);
}

export function credentialsFor(kind: 'admin' | 'user'): AccountCredentials | null {
  const prefix = kind === 'admin' ? 'E2E_ADMIN' : 'E2E_USER';
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (email && password) return { email, password };
  if (!localSupabaseRun(process.env)) return null;

  const user = kind === 'admin' ? TEST_USERS_DATA.admin : TEST_USERS_DATA.planner1;
  return { email: user.email, password: user.password };
}

export function authCredentialsFor(env: NodeJS.ProcessEnv = process.env): AuthTestCredentials | null {
  const email = env.E2E_AUTH_EMAIL;
  const password = env.E2E_AUTH_PASSWORD;
  const role = env.E2E_AUTH_ROLE === 'admin' ? 'admin' : 'user';
  if (email && password) return { email, password, role, name: 'E2E auth user' };
  if (!localSupabaseRun(env)) return null;

  const user = role === 'admin' ? TEST_USERS_DATA.admin : TEST_USERS_DATA.planner1;
  return { email: user.email, password: user.password, role: user.role, name: user.name };
}

export function resetEmailFor(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.E2E_RESET_EMAIL) return env.E2E_RESET_EMAIL;
  return localSupabaseRun(env) ? TEST_USERS_DATA.planner2.email : null;
}

export function serviceEnvironmentReady(): boolean {
  return isLocalSupabaseMutationEnvironment();
}

export function createServiceClient(): SupabaseClient {
  requireLocalSupabaseMutation();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Blocked environment: Supabase service credentials are not configured.');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: guardedSupabaseFetch },
  });
}

export async function login(page: Page, credentials: AccountCredentials, requestedPath = '/'): Promise<void> {
  await page.goto(`/login?redirect=${encodeURIComponent(requestedPath)}`);
  await page.getByLabel('이메일').fill(credentials.email);
  await page.getByLabel('비밀번호').fill(credentials.password);
  const tokenResponse = page.waitForResponse((response) => (
    response.url().includes('/auth/v1/token') &&
    response.request().method() === 'POST' &&
    response.status() === 200
  ));
  await page.getByRole('button', { name: '로그인' }).click();
  await tokenResponse;
  await page.waitForURL((url) => url.pathname === requestedPath, { timeout: 15_000 });
  await page.waitForLoadState('domcontentloaded');
}

export async function logout(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: '로그아웃' });
  const signOutResponse = page.waitForResponse((response) => (
    response.url().includes('/auth/v1/logout') &&
    response.request().method() === 'POST' &&
    response.status() >= 200 &&
    response.status() < 300
  ));
  await button.click();
  await signOutResponse;
  await page.waitForURL((url) => url.pathname === '/landing', { timeout: 15_000 });
}

export async function switchAccount(page: Page, credentials: AccountCredentials, requestedPath = '/'): Promise<void> {
  await logout(page);
  await login(page, credentials, requestedPath);
}

export async function findUserId(client: SupabaseClient, email: string): Promise<string> {
  requireLocalSupabaseMutation();
  const response = await client.auth.admin.listUsers({ perPage: 1000 });
  if (response.error) throw new Error(`Unable to find auth user: ${response.error.message}`);
  const user = response.data.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error(`Auth user not found for ${email}`);
  return user.id;
}

export async function beginAccountSeed(credentials: AccountCredentials): Promise<AccountSeed> {
  const client = createServiceClient();
  return { client, userId: await findUserId(client, credentials.email) };
}

export async function seedNotification(seed: AccountSeed, unread: boolean): Promise<SeededNotification> {
  const title = `QA-${RUN_ID}-notification`;
  const { data, error } = await seed.client
    .from('notification_history')
    .insert({
      user_id: seed.userId,
      notification_type: 'e2e',
      title,
      message: `Disposable notification ${RUN_ID}`,
      is_read: !unread,
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`Unable to seed notification: ${error?.message ?? 'no row returned'}`);
  return { id: String(data.id), userId: seed.userId };
}

export async function seedReport(seed: AccountSeed): Promise<SeededReport> {
  const content = `QA-${RUN_ID}-admin-report`;
  const { data, error } = await seed.client
    .from('daily_reports')
    .insert({
      user_id: seed.userId,
      report_date: new Date().toISOString().slice(0, 10),
      report_type: 'evening',
      user_name_snapshot: `QA ${RUN_ID}`,
      report_content: content,
      projects_data: [],
      misc_tasks_data: [],
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`Unable to seed report: ${error?.message ?? 'no row returned'}`);
  return { id: String(data.id), userId: seed.userId, content };
}

export async function cleanupRows(seed: AccountSeed, rows: { notificationIds?: string[]; reportIds?: string[] }): Promise<void> {
  requireLocalSupabaseMutation();
  const notificationIds = rows.notificationIds ?? [];
  const reportIds = rows.reportIds ?? [];
  if (notificationIds.length > 0) {
    const { error } = await seed.client.from('notification_history').delete().in('id', notificationIds).eq('user_id', seed.userId);
    if (error) throw new Error(`Unable to clean notifications: ${error.message}`);
  }
  if (reportIds.length > 0) {
    const { error } = await seed.client.from('daily_reports').delete().in('id', reportIds).eq('user_id', seed.userId);
    if (error) throw new Error(`Unable to clean reports: ${error.message}`);
  }
}

export async function cleanupAuthUser(email: string): Promise<void> {
  const client = createServiceClient();
  const id = await findUserId(client, email).catch(() => null);
  if (!id) return;
  const { error } = await client.auth.admin.deleteUser(id);
  if (error) throw new Error(`Unable to clean auth user: ${error.message}`);
}

export async function readProfileName(seed: AccountSeed): Promise<string> {
  const { data, error } = await seed.client.from('user_profiles').select('full_name').eq('id', seed.userId).single();
  if (error) throw new Error(`Unable to read profile: ${error.message}`);
  return String(data.full_name ?? '');
}

export async function restoreProfileName(seed: AccountSeed, fullName: string): Promise<void> {
  requireLocalSupabaseMutation();
  const { error } = await seed.client.from('user_profiles').update({ full_name: fullName }).eq('id', seed.userId);
  if (error) throw new Error(`Unable to restore profile: ${error.message}`);
}
