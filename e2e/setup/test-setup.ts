import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://example.invalid';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'missing-test-service-role-key';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
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
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@test.com',
    password: 'testpassword123',
    role: 'admin',
    name: 'Test Admin'
  },
  planner1: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'planner1@test.com',
    password: 'testpassword123',
    role: 'user',
    name: 'Content Planner'
  },
  planner2: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'planner2@test.com',
    password: 'testpassword123',
    role: 'user',
    name: 'Service Planner'
  },
  designer: {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'designer@test.com',
    password: 'testpassword123',
    role: 'user',
    name: 'UI/UX Designer'
  }
};

export const E2E_PROJECT_PREFIX = `E2E_${process.env.E2E_RUN_ID ?? `${process.pid}_${Date.now().toString(36)}`}_`;

export function scopeE2EProjectName(name: string): string {
  return name.startsWith(E2E_PROJECT_PREFIX)
    ? name
    : `${E2E_PROJECT_PREFIX}${name.replace(/^E2E_/, '')}`;
}

function requireSupabaseEnvironment(): void {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('E2E requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
}

export async function setupTestUsers() {
  requireSupabaseEnvironment();
  console.log('Setting up test users...');
  
  for (const userData of Object.values(TEST_USERS_DATA)) {
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: { full_name: userData.name }
    });

    let userId = created.user?.id;
    if (createError) {
      if (!createError.message.toLowerCase().includes('already registered')) {
        throw new Error(`Failed to create test user ${userData.email}: ${createError.message}`);
      }

      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (listError) {
        throw new Error(`Failed to find existing test user ${userData.email}: ${listError.message}`);
      }
      userId = users.users.find((user) => user.email === userData.email)?.id;
    }

    if (!userId) {
      throw new Error(`Test user ${userData.email} has no auth id`);
    }

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
  requireSupabaseEnvironment();
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

export async function createTestProject(createdBy: string, name: string, description?: string) {
  const scopedName = scopeE2EProjectName(name);
  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert({
      name: scopedName,
      description: description || '',
      created_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test project: ${error.message}`);
  }

  return data;
}

export async function addTestProjectMember(projectId: string, userId: string, role: string, addedBy: string) {
  const { data, error } = await supabaseAdmin
    .from('project_members')
    .insert({
      project_id: projectId,
      user_id: userId,
      role,
      added_by: addedBy,
      added_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add test project member: ${error.message}`);
  }

  return data;
}

export async function createTestDocument(projectId: string, workflowStep: number, title: string, content: string, createdBy: string, status: string = 'private') {
  const { data, error } = await supabaseAdmin
    .from('planning_documents')
    .insert({
      project_id: projectId,
      workflow_step: workflowStep,
      title,
      content,
      status,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test document: ${error.message}`);
  }

  return data;
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    throw new Error(`Failed to get user by email: ${error.message}`);
  }

  return data;
}
