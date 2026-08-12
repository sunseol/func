import { requireLocalSupabaseMutation, supabaseAdmin, scopeE2EProjectName } from './test-setup';

export async function createTestProject(createdBy: string, name: string, description?: string) {
  requireLocalSupabaseMutation();
  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert({
      name: scopeE2EProjectName(name),
      description: description || '',
      created_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create test project: ${error.message}`);
  return data;
}

export async function addTestProjectMember(projectId: string, userId: string, role: string, addedBy: string) {
  requireLocalSupabaseMutation();
  const { data, error } = await supabaseAdmin
    .from('project_members')
    .insert({ project_id: projectId, user_id: userId, role, added_by: addedBy, added_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error(`Failed to add test project member: ${error.message}`);
  return data;
}

export async function createTestDocument(projectId: string, workflowStep: number, title: string, content: string, createdBy: string, status = 'private') {
  requireLocalSupabaseMutation();
  const { data, error } = await supabaseAdmin
    .from('planning_documents')
    .insert({ project_id: projectId, workflow_step: workflowStep, title, content, status, created_by: createdBy, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error(`Failed to create test document: ${error.message}`);
  return data;
}

export async function getUserByEmail(email: string) {
  requireLocalSupabaseMutation();
  const { data, error } = await supabaseAdmin.from('user_profiles').select('*').eq('email', email).single();
  if (error) throw new Error(`Failed to get user by email: ${error.message}`);
  return data;
}
