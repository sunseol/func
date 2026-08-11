import type { FullConfig } from '@playwright/test';
import { isLoopbackSupabaseUrl, isLocalSupabaseMutationEnvironment } from './test-setup';

export { isLoopbackSupabaseUrl } from './test-setup';

export function shouldSeedAuditUsers(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.E2E_LOCAL_SUPABASE !== '1') return false;
  if (!isLocalSupabaseMutationEnvironment(env)) {
    throw new Error('E2E_LOCAL_SUPABASE=1 requires loopback Supabase service credentials on the dedicated local API port');
  }
  return true;
}

function ensureRunId(env: NodeJS.ProcessEnv): void {
  env.E2E_RUN_ID ??= `${process.pid}_${Date.now().toString(36)}`;
}

export function exposeAuditCredentials(env: NodeJS.ProcessEnv, users: typeof import('./test-setup').TEST_USERS_DATA): void {
  env.E2E_ADMIN_EMAIL = users.admin.email;
  env.E2E_ADMIN_PASSWORD = users.admin.password;
  env.E2E_USER_EMAIL = users.planner1.email;
  env.E2E_USER_PASSWORD = users.planner1.password;
  if (!env.E2E_AUTH_EMAIL && !env.E2E_AUTH_PASSWORD) {
    env.E2E_AUTH_EMAIL = users.planner1.email;
    env.E2E_AUTH_PASSWORD = users.planner1.password;
  }
  env.E2E_AUTH_ROLE ??= 'user';
  env.E2E_RESET_EMAIL ??= users.planner2.email;
}

export default async function globalSetup(_config: FullConfig): Promise<(() => Promise<void>) | undefined> {
  if (!shouldSeedAuditUsers()) return undefined;

  ensureRunId(process.env);
  const { cleanupTestData, setupTestUsers, TEST_USERS_DATA } = await import('./test-setup');
  await setupTestUsers();
  exposeAuditCredentials(process.env, TEST_USERS_DATA);

  return async () => {
    await cleanupTestData();
  };
}
