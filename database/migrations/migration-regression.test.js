const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const migrationsDir = __dirname;
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();

const migrationText = (file) =>
  fs.readFileSync(path.join(migrationsDir, file), 'utf8');

test('fresh bootstrap migrations contain no top-level procedural statements', () => {
  for (const file of migrationFiles) {
    const lines = migrationText(file).split(/\r?\n/);
    let inDollarBlock = false;
    for (const [index, line] of lines.entries()) {
      if (line.includes('$$')) inDollarBlock = !inDollarBlock;
      if (!inDollarBlock && (/^\s*(RAISE|LS\s*\()\b/.test(line) || /^\s*[가-힣][가-힣 ]*$/.test(line))) {
        assert.fail(`${file}:${index + 1} contains a top-level procedural statement: ${line.trim()}`);
      }
    }
  }
});

test('forward repair migration defines the canonical role and approval-history contract', () => {
  const repair = migrationText('017_security_hardening_and_contract_repair.sql');
  assert.match(repair, /content_planning/);
  assert.match(repair, /service_planning/);
  assert.match(repair, /ux_planning/);
  assert.match(repair, /developer/);
  assert.doesNotMatch(repair, /\b(?:FROM|INTO|ON)\s+(?:public\.)?approval_history\b/i);
  assert.match(repair, /document_approval_history/);
});

test('forward repair migration restores RLS and secures definer functions', () => {
  const repair = migrationText('017_security_hardening_and_contract_repair.sql');
  assert.match(repair, /ENABLE ROW LEVEL SECURITY/);
  assert.match(repair, /SET search_path = public, pg_temp/);
  assert.match(repair, /auth\.uid\(\)/);
  assert.match(repair, /REVOKE ALL ON FUNCTION/);
});

test('planning document direct inserts require private unapproved rows', () => {
  const repair = migrationText('017_security_hardening_and_contract_repair.sql');
  const insertPolicy = repair.match(/CREATE POLICY planning_documents_insert[\s\S]*?\nCREATE POLICY planning_documents_update/);
  assert.ok(insertPolicy);
  assert.match(insertPolicy[0], /created_by = auth\.uid\(\)/);
  assert.match(insertPolicy[0], /status = 'private'/);
  assert.match(insertPolicy[0], /approved_by IS NULL/);
  assert.match(insertPolicy[0], /approved_at IS NULL/);
  assert.match(insertPolicy[0], /public\.is_project_member\(project_id\)/);
  assert.match(insertPolicy[0], /public\.is_admin\(\)/);
  assert.match(repair, /REVOKE ALL ON FUNCTION public\.enforce_approval_metadata\(\) FROM PUBLIC/);
  assert.doesNotMatch(repair, /GRANT EXECUTE ON FUNCTION public\.enforce_approval_metadata\(\) TO authenticated/);
});

test('creator document access requires current project membership', () => {
  const repair = migrationText('017_security_hardening_and_contract_repair.sql');
  const planningSelect = repair.match(/CREATE POLICY planning_documents_select[\s\S]*?\nCREATE POLICY planning_documents_insert/);
  const planningDelete = repair.match(/CREATE POLICY planning_documents_delete[\s\S]*?\nCREATE POLICY document_versions_select/);
  const versionsSelect = repair.match(/CREATE POLICY document_versions_select[\s\S]*?\nCREATE POLICY ai_conversations_select/);
  const approvalHistorySelect = repair.match(/CREATE POLICY document_approval_history_select[\s\S]*?\nCREATE POLICY project_activities_select/);
  assert.ok(planningSelect);
  assert.ok(planningDelete);
  assert.ok(versionsSelect);
  assert.ok(approvalHistorySelect);
  assert.match(planningSelect[0], /created_by = auth\.uid\(\) AND public\.is_project_member\(project_id\)/);
  assert.match(planningDelete[0], /created_by = auth\.uid\(\) AND status = 'private' AND public\.is_project_member\(project_id\)/);
  assert.match(versionsSelect[0], /pd\.created_by = auth\.uid\(\) AND public\.is_project_member\(pd\.project_id\)/);
  assert.match(approvalHistorySelect[0], /pd\.created_by = auth\.uid\(\) AND public\.is_project_member\(pd\.project_id\)/);
});

test('document version trigger owns version changes', () => {
  const repair = migrationText('017_security_hardening_and_contract_repair.sql');
  const versionTrigger = repair.match(/CREATE OR REPLACE FUNCTION public\.create_document_version\(\)[\s\S]*?\nCREATE OR REPLACE FUNCTION public\.create_initial_document_version/);
  assert.ok(versionTrigger);
  assert.match(versionTrigger[0], /IF OLD\.content IS DISTINCT FROM NEW\.content THEN[\s\S]*NEW\.version := COALESCE\(OLD\.version, 0\) \+ 1;/);
  assert.match(versionTrigger[0], /ELSE[\s\S]*NEW\.version := OLD\.version;/);
});

test('direct document inserts normalize a supplied initial version to one', () => {
  const repair = migrationText('017_security_hardening_and_contract_repair.sql');
  const metadataTrigger = repair.match(/CREATE OR REPLACE FUNCTION public\.enforce_approval_metadata\(\)[\s\S]*?\nDROP TRIGGER IF EXISTS enforce_document_identity_immutable/);
  const initialVersion = repair.match(/CREATE OR REPLACE FUNCTION public\.create_initial_document_version\(\)[\s\S]*?\nDROP INDEX IF EXISTS public\.idx_document_versions_doc_version/);
  assert.ok(metadataTrigger);
  assert.ok(initialVersion);
  assert.match(metadataTrigger[0], /IF TG_OP = 'INSERT' THEN[\s\S]*NEW\.version := 1;/);
  assert.match(initialVersion[0], /VALUES \(NEW\.id, 1, NEW\.content,/);
  assert.doesNotMatch(initialVersion[0], /COALESCE\(NEW\.version, 1\)/);
});

test('forward repair migration exposes the atomic authenticated conversation append RPC', () => {
  const repair = migrationText('017_security_hardening_and_contract_repair.sql');
  assert.match(
    repair,
    /append_ai_conversation_messages\(\s*p_project_id\s+UUID,\s*p_workflow_step\s+INTEGER,\s*p_messages\s+JSONB\s*\)/s,
  );
  assert.match(repair, /ON CONFLICT \(project_id, workflow_step, user_id\)/);
  assert.match(repair, /FOR UPDATE/);
  assert.match(repair, /p_messages IS NULL/);
  assert.match(repair, /jsonb_typeof\(p_messages\) IS DISTINCT FROM 'array'/);
  assert.match(repair, /jsonb_array_length\(p_messages\) <> 2/);
  assert.match(repair, /message_index = 0 AND message_role IS DISTINCT FROM 'user'/);
  assert.match(repair, /message_index = 1 AND message_role IS DISTINCT FROM 'assistant'/);
  assert.match(repair, /octet_length\(p_messages::TEXT\) > 65536/);
  assert.match(repair, /octet_length\(message_content\) > 32768/);
  assert.match(repair, /NOT \(message \? 'id'\)/);
  assert.match(repair, /NOT \(message \? 'role'\)/);
  assert.match(repair, /NOT \(message \? 'content'\)/);
  assert.match(repair, /NOT \(message \? 'timestamp'\)/);
  assert.match(repair, /jsonb_typeof\(message -> 'id'\) IS DISTINCT FROM 'string'/);
  assert.match(repair, /jsonb_typeof\(message -> 'timestamp'\) IS DISTINCT FROM 'string'/);
  assert.match(repair, /jsonb_typeof\(message -> 'role'\) IS DISTINCT FROM 'string'/);
  assert.match(repair, /\(message ->> 'timestamp'\)::TIMESTAMPTZ/);
  const fiveThousandUnicodeCharacters = '😀'.repeat(5000);
  assert.equal(Buffer.byteLength(fiveThousandUnicodeCharacters, 'utf8'), 20000);
  assert.ok(Buffer.byteLength(fiveThousandUnicodeCharacters, 'utf8') < 32768);
});

test('forward repair migration keeps sensitive reads and mutations least-privilege', () => {
  const repair = migrationText('017_security_hardening_and_contract_repair.sql');
  assert.match(repair, /ai_conversations_select[\s\S]*user_id = auth\.uid\(\) OR public\.is_admin\(\)/);
  const conversationSelect = repair.match(/CREATE POLICY ai_conversations_select[\s\S]*?\nCREATE POLICY/);
  const memberInsert = repair.match(/CREATE POLICY project_members_insert[\s\S]*?\nCREATE POLICY/);
  assert.ok(conversationSelect);
  assert.ok(memberInsert);
  assert.match(conversationSelect[0], /user_id = auth\.uid\(\) AND public\.is_project_member\(project_id\)/);
  assert.doesNotMatch(memberInsert[0], /is_project_member/);
  const conversationDelete = repair.match(/CREATE POLICY ai_conversations_delete[\s\S]*?\n\n/);
  assert.ok(conversationDelete);
  assert.match(conversationDelete[0], /user_id = auth\.uid\(\) AND public\.is_project_member\(project_id\)/);
  assert.match(repair, /CREATE POLICY planning_documents_update[\s\S]*status = 'private'/);
  assert.match(repair, /CREATE POLICY planning_documents_delete[\s\S]*status = 'private'/);
  assert.doesNotMatch(repair, /GRANT EXECUTE ON FUNCTION public\.log_project_activity\([^\n]+\) TO authenticated/);
  assert.match(repair, /GRANT EXECUTE ON FUNCTION public\.log_project_activity\([^\n]+\) TO service_role/);
  for (const view of ['project_members_with_profiles', 'projects_with_creator', 'planning_documents_with_users', 'pending_approval_documents', 'document_approval_history_with_users']) {
    assert.match(repair, new RegExp(`ALTER VIEW public\\.${view} SET \\(security_invoker = true\\)`));
  }
  assert.match(repair, /FROM public\.projects WHERE id = project_uuid FOR UPDATE/);
  assert.match(repair, /planning_documents_one_official_per_project_step/);
  assert.match(repair, /ON public\.planning_documents\(project_id, workflow_step\)\s+WHERE status = 'official'/);
  assert.match(repair, /PARTITION BY project_id, workflow_step/);
  assert.match(repair, /workflow_step = target_document\.workflow_step/);
  assert.doesNotMatch(repair, /planning_documents_one_official_per_project\s+\n/);
  assert.match(repair, /status = 'pending_approval' AND public\.can_approve_document\(auth\.uid\(\), project_id, workflow_step\)/);
  assert.match(repair, /status = 'pending_approval' AND public\.can_approve_document\(auth\.uid\(\), pd\.project_id, pd\.workflow_step\)/);
  assert.match(repair, /public\.is_shared_project_user\(id\)/);
  assert.match(repair, /CREATE OR REPLACE VIEW public\.project_members_with_profiles[\s\S]*up\.email::VARCHAR\(255\) AS email[\s\S]*up\.full_name::TEXT AS full_name[\s\S]*FROM public\.project_members pm\s+JOIN public\.user_profiles/);
  assert.ok(repair.indexOf('CREATE OR REPLACE FUNCTION public.can_approve_document') < repair.indexOf('CREATE POLICY planning_documents_select'));
  assert.match(repair, /enforce_document_identity_immutable[\s\S]*NEW\.project_id IS DISTINCT FROM OLD\.project_id[\s\S]*NEW\.created_by IS DISTINCT FROM OLD\.created_by/);
  assert.match(repair, /enforce_conversation_identity_immutable[\s\S]*NEW\.project_id IS DISTINCT FROM OLD\.project_id[\s\S]*NEW\.user_id IS DISTINCT FROM OLD\.user_id/);
  assert.match(repair, /planning_documents_update[\s\S]*public\.is_project_member\(project_id\)/);
  assert.match(repair, /ai_conversations_update[\s\S]*public\.is_project_member\(project_id\)/);
  assert.match(repair, /created_by = auth\.uid\(\)[\s\S]*status = 'private'[\s\S]*public\.is_project_member\(project_id\)/);
  assert.match(repair, /auth\.role\(\) IS DISTINCT FROM 'service_role'/);
  assert.match(repair, /actor_id := CASE WHEN auth\.role\(\) = 'service_role' THEN p_user_id ELSE auth\.uid\(\) END/);
  assert.doesNotMatch(repair, /GRANT EXECUTE ON FUNCTION public\.(?:log_project_activity|initialize_project_stats)\([^\n]*\) TO authenticated/);
  assert.match(repair, /withdraw_document_approval\(\s*p_document_id UUID,\s*p_user_id UUID\s*\)[\s\S]*RETURNS SETOF public\.planning_documents/);
  assert.match(repair, /REVOKE ALL ON FUNCTION public\.withdraw_document_approval\(UUID, UUID\) FROM PUBLIC/);
  assert.match(repair, /GRANT EXECUTE ON FUNCTION public\.withdraw_document_approval\(UUID, UUID\) TO authenticated/);
  assert.match(repair, /target_document\.status IS DISTINCT FROM 'pending_approval'[\s\S]*RETURN;/);
  assert.match(repair, /enforce_approval_metadata[\s\S]*NEW\.approved_by := NULL[\s\S]*NEW\.approved_at := NULL/);
  assert.match(repair, /SET status = 'private', approved_by = NULL, approved_at = NULL/);
  assert.match(repair, /target_document\.status IS DISTINCT FROM 'pending_approval'[\s\S]*RETURN;[\s\S]*document approval is not authorized/);
});
