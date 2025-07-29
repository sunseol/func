import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

export async function setupTestUsers() {
  console.log('Setting up test users...');
  
  for (const userData of Object.values(TEST_USERS_DATA)) {
    try {
      // Create auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          name: userData.name
        }
      });

      if (authError && !authError.message.includes('already registered')) {
        console.error(`Error creating auth user ${userData.email}:`, authError);
        continue;
      }

      // Create user profile
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: authUser?.user?.id || userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error(`Error creating user profile ${userData.email}:`, profileError);
      }
    } catch (error) {
      console.error(`Error setting up user ${userData.email}:`, error);
    }
  }
  
  console.log('Test users setup completed');
}

export async function cleanupTestData() {
  console.log('Cleaning up test data...');
  
  try {
    // Clean up in reverse dependency order
    await supabaseAdmin.from('ai_conversations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('document_versions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('planning_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('project_activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('project_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Clean up test users (keep them for reuse)
    // await supabaseAdmin.from('user_profiles').delete().in('email', Object.values(TEST_USERS_DATA).map(u => u.email));
    
    console.log('Test data cleanup completed');
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

export async function createTestProject(createdBy: string, name: string, description?: string) {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert({
      name,
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