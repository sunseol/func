import { createClient, type User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://example.invalid';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'missing-test-service-role-key';

export const E2E_SUPABASE_API_PORT = 55421;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

export const guardedSupabaseFetch: typeof fetch = (input, init) => {
  requireLocalSupabaseMutation();
  return fetch(input, init);
};

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: { fetch: guardedSupabaseFetch }
});

export interface TestUserData {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  name: string;
}

export const TEST_USERS_DATA: Record<string, TestUserData> = {
  admin: {
    id: '',
    email: 'admin@test.com',
    password: 'testpassword123',
    role: 'admin',
    name: 'Test Admin'
  },
  planner1: {
    id: '',
    email: 'planner1@test.com',
    password: 'testpassword123',
    role: 'user',
    name: 'Content Planner'
  },
  planner2: {
    id: '',
    email: 'planner2@test.com',
    password: 'testpassword123',
    role: 'user',
    name: 'Service Planner'
  },
  designer: {
    id: '',
    email: 'designer@test.com',
    password: 'testpassword123',
    role: 'user',
    name: 'UI/UX Designer'
  }
};

export const E2E_PROJECT_PREFIX = `E2E_AUDIT_${process.env.E2E_RUN_ID ?? `${process.pid}_${Date.now().toString(36)}`}_`;

const AUTH_USERS_PAGE_SIZE = 1000;
const authUserSeedPromises = new Map<string, Promise<string>>();

export function scopeE2EProjectName(name: string): string {
  return name.startsWith(E2E_PROJECT_PREFIX)
    ? name
    : `${E2E_PROJECT_PREFIX}${name.replace(/^E2E_/, '')}`;
}

export function isLoopbackSupabaseUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl) return false;

  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return (url.protocol === 'http:' || url.protocol === 'https:') &&
      LOOPBACK_HOSTS.has(hostname) &&
      url.port === String(E2E_SUPABASE_API_PORT);
  } catch {
    return false;
  }
}

export function isLocalSupabaseMutationEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.E2E_LOCAL_SUPABASE === '1' &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY) &&
    isLoopbackSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
}

export function requireLocalSupabaseMutation(env: NodeJS.ProcessEnv = process.env): void {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('E2E requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  if (env.E2E_LOCAL_SUPABASE !== '1') {
    throw new Error('E2E service-role mutations require E2E_LOCAL_SUPABASE=1');
  }
  if (!isLoopbackSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL)) {
    throw new Error(`E2E service-role mutations require a loopback Supabase URL on port ${E2E_SUPABASE_API_PORT}`);
  }
}

async function findAuthUserByEmail(email: string): Promise<User | undefined> {
  const normalizedEmail = email.trim().toLowerCase();
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PAGE_SIZE
    });
    if (error) {
      throw new Error(`Failed to find existing test user ${email}: ${error.message}`);
    }

    const user = data.users.find((candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail);
    if (user) return user;
    if (data.users.length < AUTH_USERS_PAGE_SIZE) return undefined;
  }
}

async function configureAuthUser(userId: string, userData: TestUserData): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: userData.password,
    email_confirm: true,
    user_metadata: { full_name: userData.name }
  });
  if (error) {
    throw new Error(`Failed to configure test user ${userData.email}: ${error.message}`);
  }
  if (!data.user?.id) {
    throw new Error(`Test user ${userData.email} has no auth id after configuration`);
  }
  return data.user.id;
}

async function ensureAuthUser(userData: TestUserData): Promise<string> {
  const existingUser = await findAuthUserByEmail(userData.email);
  if (existingUser) return configureAuthUser(existingUser.id, userData);

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
    user_metadata: { full_name: userData.name }
  });
  if (!createError && created.user?.id) return created.user.id;

  const racedUser = await findAuthUserByEmail(userData.email);
  if (racedUser) return configureAuthUser(racedUser.id, userData);

  if (createError) {
    throw new Error(`Failed to create test user ${userData.email}: ${createError.message}`);
  }
  throw new Error(`Test user ${userData.email} was created without an auth id`);
}

function ensureAuthUserOnce(userData: TestUserData): Promise<string> {
  const key = userData.email.trim().toLowerCase();
  const pending = authUserSeedPromises.get(key);
  if (pending) return pending;

  const promise = ensureAuthUser(userData).finally(() => {
    authUserSeedPromises.delete(key);
  });
  authUserSeedPromises.set(key, promise);
  return promise;
}

export async function setupTestUsers() {
  requireLocalSupabaseMutation();
  console.log('Setting up test users...');
  
  for (const userData of Object.values(TEST_USERS_DATA)) {
    const userId = await ensureAuthUserOnce(userData);

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: userId,
        email: userData.email,
        full_name: userData.name,
        role: userData.role,
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      throw new Error(`Failed to seed profile ${userData.email}: ${profileError.message}`);
    }
  }
  
  console.log('Test users setup completed');
}

export async function cleanupTestData() {
  requireLocalSupabaseMutation();
  console.log('Cleaning up test data...');

  const testEmails = Object.values(TEST_USERS_DATA).map(({ email }) => email);
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('id,email')
    .in('email', testEmails);
  if (profileError) {
    throw new Error(`Failed to identify E2E users for cleanup: ${profileError.message}`);
  }

  const userIds = (profiles ?? []).map(({ id }) => id);
  if (userIds.length === 0) {
    console.log('No known E2E users found; cleanup skipped');
    return;
  }

  const { data: projects, error: projectLookupError } = await supabaseAdmin
    .from('projects')
    .select('id')
    .in('created_by', userIds)
    .like('name', `${E2E_PROJECT_PREFIX}%`);
  if (projectLookupError) {
    throw new Error(`Failed to identify E2E projects for cleanup: ${projectLookupError.message}`);
  }

  const projectIds = (projects ?? []).map(({ id }) => id);
  if (projectIds.length === 0) {
    console.log('No E2E projects found; cleanup completed');
    return;
  }

  for (const table of ['ai_conversations', 'project_activities', 'project_members'] as const) {
    const { error } = await supabaseAdmin.from(table).delete().in('project_id', projectIds);
    if (error) {
      throw new Error(`Failed to clean ${table}: ${error.message}`);
    }
  }

  const { data: documents, error: documentLookupError } = await supabaseAdmin
    .from('planning_documents')
    .select('id')
    .in('project_id', projectIds);
  if (documentLookupError) {
    throw new Error(`Failed to identify E2E documents for cleanup: ${documentLookupError.message}`);
  }

  const documentIds = (documents ?? []).map(({ id }) => id);
  if (documentIds.length > 0) {
    const { error: versionsError } = await supabaseAdmin.from('document_versions').delete().in('document_id', documentIds);
    if (versionsError) {
      throw new Error(`Failed to clean document_versions: ${versionsError.message}`);
    }
    const { error: documentsError } = await supabaseAdmin.from('planning_documents').delete().in('id', documentIds);
    if (documentsError) {
      throw new Error(`Failed to clean planning_documents: ${documentsError.message}`);
    }
  }

  const { error: projectsError } = await supabaseAdmin.from('projects').delete().in('id', projectIds);
  if (projectsError) {
    throw new Error(`Failed to clean E2E projects: ${projectsError.message}`);
  }

  console.log(`Test data cleanup completed for ${projectIds.length} known E2E projects`);
}
