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

test('SQL migrations contain no single-hyphen corruption markers', () => {
  for (const file of migrationFiles) {
    const text = migrationText(file);
    assert.doesNotMatch(text, /;-$|^[\t ]*-[^-]/m, `${file} contains a trailing or standalone single hyphen`);
  }
});

test('AI-PM project views and progress RPC avoid PostgreSQL SRF-in-CASE failures', () => {
  const bootstrap = migrationText('001_ai_pm_schema.sql');
  const repair = migrationText('021_fix_ai_pm_view_runtime.sql');

  for (const [file, text] of [['001_ai_pm_schema.sql', bootstrap], ['021_fix_ai_pm_view_runtime.sql', repair]]) {
    assert.doesNotMatch(text, /CASE\s+generate_series\s*\(/i, `${file} contains an SRF inside CASE`);
    assert.doesNotMatch(text, /CASE[\s\S]{0,240}\b(?:unnest|jsonb_array_elements|regexp_matches)\s*\(/i, `${file} contains an SRF inside CASE`);
  }

  const progressFunction = repair.match(
    /CREATE OR REPLACE FUNCTION public\.get_project_progress\(project_uuid UUID\)[\s\S]*?\$\$;/,
  );
  assert.ok(progressFunction);
  assert.match(progressFunction[0], /FROM\s+generate_series\(1,\s*9\)\s+AS\s+workflow\(step_num\)/i);
  assert.match(progressFunction[0], /CASE\s+workflow\.step_num/i);
  assert.doesNotMatch(progressFunction[0], /SECURITY\s+DEFINER/i);

  const countsView = repair.match(
    /CREATE OR REPLACE VIEW public\.projects_with_counts AS[\s\S]*?ALTER VIEW public\.projects_with_counts SET \(security_invoker = true\);/i,
  );
  const creatorView = repair.match(
    /CREATE OR REPLACE VIEW public\.projects_with_creator AS[\s\S]*?ALTER VIEW public\.projects_with_creator SET \(security_invoker = true\);/i,
  );
  assert.ok(countsView);
  assert.ok(creatorView);
  assert.match(countsView[0], /p\.\*/);
  assert.match(countsView[0], /member_count/);
  assert.match(countsView[0], /official_document_count/);
  assert.match(countsView[0], /LEFT JOIN public\.user_profiles creator ON creator\.id = p\.created_by/i);
  assert.match(creatorView[0], /p\.id[\s\S]*p\.updated_at/);
  assert.match(creatorView[0], /LEFT JOIN public\.user_profiles creator ON creator\.id = p\.created_by/i);
  assert.doesNotMatch(repair, /GRANT[^;]*\bTO\s+(?:anon|PUBLIC)\b/i);
  assert.doesNotMatch(repair, /SECURITY\s+DEFINER/i);
});

test('pending approval view uses a valid SQL CASE while preserving workflow role mappings', () => {
  const migration = migrationText('002_approval_workflow.sql');
  const view = migration.match(/CREATE OR REPLACE VIEW pending_approval_documents AS[\s\S]*?\nFROM planning_documents pd/);
  assert.ok(view);
  assert.doesNotMatch(view[0], /CASE\s+pd\.workflow_step\s+WHEN\s+\d+(?:\s*,\s*\d+)+\s+THEN/);
  assert.match(view[0], /CASE\s+WHEN\s+pd\.workflow_step\s+IN\s*\(\s*1\s*,\s*2\s*,\s*3\s*,\s*6\s*,\s*7\s*,\s*8\s*\)\s+THEN\s+'서비스기획'/);
  assert.match(view[0], /WHEN\s+pd\.workflow_step\s*=\s*4\s+THEN\s+'UIUX기획'/);
  assert.match(view[0], /WHEN\s+pd\.workflow_step\s*=\s*5\s+THEN\s+'개발자'/);
  assert.match(view[0], /WHEN\s+pd\.workflow_step\s*=\s*9\s+THEN\s+'콘텐츠기획,서비스기획'/);
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

test('approved document enrichment keeps the base row visible when creator profile RLS hides metadata', () => {
  const repair = migrationText('022_fix_planning_documents_view_rls.sql');
  assert.match(repair, /CREATE OR REPLACE VIEW public\.planning_documents_with_users AS/);
  assert.match(repair, /FROM public\.planning_documents pd\s+LEFT JOIN public\.user_profiles creator ON creator\.id = pd\.created_by/i);
  assert.match(repair, /LEFT JOIN public\.user_profiles approver ON approver\.id = pd\.approved_by/i);
  assert.match(repair, /ALTER VIEW public\.planning_documents_with_users SET \(security_invoker = true\);/);
  assert.doesNotMatch(repair, /SECURITY\s+DEFINER/i);
  assert.doesNotMatch(repair, /GRANT[^;]*\bTO\s+(?:anon|PUBLIC)\b/i);
});

test('can_approve_document uses a searched CASE and preserves workflow role mappings', () => {
  for (const file of migrationFiles) {
    assert.doesNotMatch(
      migrationText(file),
      /RETURN\s+CASE\s+\w+[\s\S]*?WHEN\s+\d+(?:\s*,\s*\d+)+\s+THEN/,
      `${file} contains an invalid comma-list RETURN CASE expression`,
    );
  }

  const repair = migrationText('017_security_hardening_and_contract_repair.sql');
  const approvalFunction = repair.match(
    /CREATE OR REPLACE FUNCTION public\.can_approve_document[\s\S]*?\nCREATE OR REPLACE FUNCTION public\.enforce_document_identity_immutable/,
  );
  assert.ok(approvalFunction);
  assert.match(approvalFunction[0], /RETURN CASE\s+WHEN workflow_step_num IN\s*\(\s*1\s*,\s*2\s*,\s*3\s*,\s*6\s*,\s*7\s*,\s*8\s*\)\s+THEN\s+member_role = 'service_planning'/);
  assert.match(approvalFunction[0], /WHEN workflow_step_num = 4\s+THEN\s+member_role = 'ux_planning'/);
  assert.match(approvalFunction[0], /WHEN workflow_step_num = 5\s+THEN\s+member_role = 'developer'/);
  assert.match(approvalFunction[0], /WHEN workflow_step_num = 9\s+THEN\s+member_role IN \('content_planning', 'service_planning'\)/);
});

test('forward repair migration restores RLS and secures definer functions', () => {
  const repair = migrationText('017_security_hardening_and_contract_repair.sql');
  assert.match(repair, /ENABLE ROW LEVEL SECURITY/);
  assert.match(repair, /SET search_path = public, pg_temp/);
  assert.match(repair, /auth\.uid\(\)/);
  assert.match(repair, /REVOKE ALL ON FUNCTION/);
});

test('approval RPCs authorize before status checks and hide unauthorized document state', () => {
  const repair = migrationText('017_security_hardening_and_contract_repair.sql');
  const forward = migrationText('025_fix_approval_rpc_visibility.sql');

  for (const text of [repair, forward]) {
    const approval = text.match(
      /CREATE OR REPLACE FUNCTION public\.approve_document_and_demote_old_official[\s\S]*?\nCREATE OR REPLACE FUNCTION public\.withdraw_document_approval/,
    );
    const withdrawal = text.match(
      /CREATE OR REPLACE FUNCTION public\.withdraw_document_approval[\s\S]*?(?:\nCREATE OR REPLACE FUNCTION public\.create_project_with_owner|\nREVOKE ALL ON FUNCTION)/,
    );
    assert.ok(approval);
    assert.ok(withdrawal);

    const approvalAuthorization = approval[0].indexOf('public.can_approve_document');
    const approvalStatus = approval[0].indexOf("target_document.status IS DISTINCT FROM 'pending_approval'");
    assert.ok(approvalAuthorization >= 0 && approvalAuthorization < approvalStatus);
    assert.match(approval[0], /IF NOT public\.can_approve_document[\s\S]*?THEN\s*RETURN;/);
    assert.doesNotMatch(approval[0], /document approval is not authorized/);

    const withdrawalAuthorization = withdrawal[0].indexOf('public.is_admin()');
    const withdrawalStatus = withdrawal[0].indexOf("target_document.status IS DISTINCT FROM 'pending_approval'");
    assert.ok(withdrawalAuthorization >= 0 && withdrawalAuthorization < withdrawalStatus);
    assert.match(withdrawal[0], /IF NOT \([\s\S]*?THEN\s*RETURN;/);
    assert.doesNotMatch(withdrawal[0], /document withdrawal is not authorized/);
    assert.match(text, /p_user_id IS DISTINCT FROM auth\.uid\(\)/);
    assert.match(text, /SET search_path = public, pg_temp/);
  }

  assert.match(forward, /REVOKE ALL ON FUNCTION public\.approve_document_and_demote_old_official\(UUID, UUID\) FROM PUBLIC/);
  assert.match(forward, /REVOKE ALL ON FUNCTION public\.withdraw_document_approval\(UUID, UUID\) FROM PUBLIC/);
  assert.match(forward, /GRANT EXECUTE ON FUNCTION public\.approve_document_and_demote_old_official\(UUID, UUID\) TO authenticated/);
  assert.match(forward, /GRANT EXECUTE ON FUNCTION public\.withdraw_document_approval\(UUID, UUID\) TO authenticated/);
  assert.doesNotMatch(forward, /GRANT[^;]*\b(?:anon|PUBLIC)\b/);
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
  assert.match(versionTrigger[0], /IF OLD\.title IS DISTINCT FROM NEW\.title[\s\S]*OLD\.content IS DISTINCT FROM NEW\.content[\s\S]*NEW\.version := COALESCE\(OLD\.version, 0\) \+ 1;/);
  assert.match(versionTrigger[0], /ELSE[\s\S]*NEW\.version := OLD\.version;/);
});

test('document version CAS covers title edits and preserves no-op updates', () => {
  const repair = migrationText('017_security_hardening_and_contract_repair.sql');
  const forward = migrationText('023_fix_document_version_cas.sql');
  for (const [file, text] of [['017_security_hardening_and_contract_repair.sql', repair], ['023_fix_document_version_cas.sql', forward]]) {
    const versionTrigger = text.match(/CREATE OR REPLACE FUNCTION public\.create_document_version\(\)[\s\S]*?\n(?:CREATE OR REPLACE FUNCTION public\.create_initial_document_version|DROP TRIGGER IF EXISTS create_planning_document_version)/);
    assert.ok(versionTrigger, `${file} must define the document version trigger function`);
    assert.match(versionTrigger[0], /OLD\.title IS DISTINCT FROM NEW\.title/);
    assert.match(versionTrigger[0], /OLD\.content IS DISTINCT FROM NEW\.content/);
    assert.match(versionTrigger[0], /NEW\.version := COALESCE\(OLD\.version, 0\) \+ 1;/);
    assert.match(versionTrigger[0], /ELSE[\s\S]*NEW\.version := OLD\.version;/);
    assert.match(versionTrigger[0], /INSERT INTO public\.document_versions/);
    assert.doesNotMatch(versionTrigger[0], /OLD\.updated_at|NEW\.updated_at/);
  }
  assert.match(forward, /SECURITY DEFINER/);
  assert.match(forward, /SET search_path = public, pg_temp/);
  assert.match(forward, /DROP TRIGGER IF EXISTS create_planning_document_version ON public\.planning_documents/);
  assert.match(forward, /CREATE TRIGGER create_planning_document_version[\s\S]*BEFORE UPDATE ON public\.planning_documents/);
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

test('chat append RPC is replay-safe and scopes client identities to one conversation', () => {
  const migration = migrationText('024_ai_conversation_idempotency.sql');
  assert.match(
    migration,
    /append_ai_conversation_messages\(\s*p_project_id\s+UUID,\s*p_workflow_step\s+INTEGER,\s*p_messages\s+JSONB,\s*p_idempotency_key\s+UUID\s*\)/s,
  );
  assert.match(migration, /DROP FUNCTION IF EXISTS public\.append_ai_conversation_messages\(UUID, INTEGER, JSONB\)/);
  assert.match(
    migration,
    /DO\s+\$\$\s+BEGIN[\s\S]*?to_regprocedure\('public\.append_ai_conversation_messages\(uuid, integer, jsonb\)'\)[\s\S]*?EXECUTE\s+'REVOKE ALL ON FUNCTION public\.append_ai_conversation_messages\(UUID, INTEGER, JSONB\) FROM PUBLIC, authenticated, anon'[\s\S]*?END\s+\$\$;/,
  );
  assert.doesNotMatch(
    migration,
    /^\s*REVOKE ALL ON FUNCTION public\.append_ai_conversation_messages\(UUID, INTEGER, JSONB\) FROM PUBLIC, authenticated, anon;\s*$/m,
  );
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /idempotency_key/);
  assert.match(migration, /RETURN NEXT current_row;\s*RETURN;/);
  assert.match(migration, /identity already belongs to another conversation/);
  assert.match(migration, /message identities must be distinct/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.append_ai_conversation_messages\(UUID, INTEGER, JSONB\) FROM PUBLIC, authenticated, anon/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.append_ai_conversation_messages\(UUID, INTEGER, JSONB, UUID\) TO authenticated/);
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
  assert.doesNotMatch(repair, /document approval is not authorized/);
  assert.doesNotMatch(repair, /document withdrawal is not authorized/);
});

test('core product migration defines the daily reports, drafts, notifications, and profile contracts', () => {
  const migration = migrationText('018_core_product_schema.sql');
  assert.match(migration, /ALTER TABLE IF EXISTS public\.user_profiles[\s\S]*ADD COLUMN IF NOT EXISTS email/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS full_name/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS role/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS updated_at/);
  for (const table of ['daily_reports', 'draft_reports', 'notification_settings', 'notification_history']) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`));
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
    assert.match(migration, new RegExp(`CREATE POLICY ${table}_select`));
    assert.match(migration, new RegExp(`CREATE POLICY ${table}_insert`));
    assert.match(migration, new RegExp(`CREATE POLICY ${table}_update`));
    assert.match(migration, new RegExp(`CREATE POLICY ${table}_delete`));
  }

  for (const column of [
    'report_date', 'report_type', 'user_name_snapshot', 'report_content', 'projects_data', 'misc_tasks_data',
  ]) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.daily_reports[\\s\\S]*ADD COLUMN IF NOT EXISTS ${column}`));
    assert.match(migration, new RegExp(`ALTER TABLE public\\.draft_reports[\\s\\S]*ADD COLUMN IF NOT EXISTS ${column}`));
  }
  for (const column of [
    'morning_reminder_enabled', 'morning_reminder_time', 'evening_reminder_enabled', 'evening_reminder_time',
    'weekend_reminders', 'email_notifications', 'browser_notifications',
  ]) {
    assert.match(migration, new RegExp(`notification_settings[\\s\\S]*${column}`));
  }
  assert.match(migration, /notification_history[\s\S]*is_read[\s\S]*read_at/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /public\.is_admin\(\)/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS idx_notification_history_user_sent/);
  assert.match(migration, /CREATE TRIGGER on_auth_user_created_notification_settings/);
  assert.match(migration, /CREATE TRIGGER daily_reports_set_updated_at/);
  assert.match(migration, /SET search_path = public, pg_temp/);
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.daily_reports TO authenticated/);
});

test('core product upgrade repairs legacy ownership, settings duplicates, constraints, and privilege boundaries', () => {
  const repair = migrationText('026_core_product_upgrade_safety.sql');
  assert.match(repair, /core_product_migration_quarantine/);
  assert.match(repair, /missing or orphaned user_id/);
  assert.match(repair, /duplicate user_id; latest meaningful values merged into retained row/);
  assert.match(repair, /ARRAY_AGG\(id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC\)/);
  assert.match(repair, /morning_reminder_enabled = COALESCE\(m\.morning_reminder_enabled, TRUE\)/);
  assert.match(repair, /WHERE t\.user_id IS NULL OR u\.id IS NULL/);
  assert.match(repair, /ALTER COLUMN user_id SET NOT NULL/);
  assert.match(repair, /VALIDATE CONSTRAINT daily_reports_report_type_core_check/);
  assert.match(repair, /CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_user_id/);
  assert.match(repair, /INSERT INTO public\.notification_settings\(user_id\)[\s\S]*ON CONFLICT \(user_id\) DO NOTHING/);
  assert.match(repair, /ALTER TABLE public\.notification_settings ENABLE ROW LEVEL SECURITY/);
  assert.match(repair, /REVOKE ALL ON TABLE public\.core_product_migration_quarantine FROM anon, PUBLIC, authenticated/);
  assert.match(repair, /GRANT ALL ON TABLE public\.core_product_migration_quarantine TO service_role/);
  assert.doesNotMatch(repair, /GRANT[^;]*\b(?:anon|PUBLIC)\b/);
});

test('service-role grants cover every public application table with full DML', () => {
  const migration = migrationText('019_service_role_table_grants.sql');
  const managedTables = [
    'user_profiles', 'projects', 'project_members', 'planning_documents',
    'document_versions', 'ai_conversations', 'document_approval_history',
    'project_activities', 'project_collaboration_stats', 'member_activity_summary',
    'daily_reports', 'draft_reports', 'notification_settings', 'notification_history',
  ];

  for (const table of managedTables) {
    assert.match(migration, new RegExp(`public\\.${table}`));
    assert.match(migration, new RegExp(`GRANT ALL ON TABLE[\\s\\S]*public\\.${table}[\\s\\S]*TO service_role`));
  }
  assert.match(migration, /GRANT USAGE, SELECT(?:, UPDATE)? ON SEQUENCE/);
});

test('authenticated grants are limited to policy-backed application operations', () => {
  const migration = migrationText('019_service_role_table_grants.sql');
  assert.match(
    migration,
    /GRANT SELECT, UPDATE ON TABLE public\.user_profiles TO authenticated/,
  );
  assert.match(
    migration,
    /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE[\s\S]*public\.projects[\s\S]*public\.planning_documents[\s\S]*TO authenticated/,
  );
  assert.match(
    migration,
    /GRANT SELECT, DELETE ON TABLE public\.ai_conversations TO authenticated/,
  );
  assert.match(
    migration,
    /GRANT SELECT ON TABLE[\s\S]*public\.document_versions[\s\S]*public\.member_activity_summary[\s\S]*TO authenticated/,
  );
  assert.doesNotMatch(migration, /GRANT ALL ON TABLE[^;]*TO authenticated/);
});

test('application tables remain RLS-protected and anon/public receive no table privileges', () => {
  const migration = migrationText('019_service_role_table_grants.sql');
  const protectedTables = [
    'user_profiles', 'projects', 'project_members', 'planning_documents',
    'document_versions', 'ai_conversations', 'document_approval_history',
    'project_activities', 'project_collaboration_stats', 'member_activity_summary',
    'daily_reports', 'draft_reports', 'notification_settings', 'notification_history',
  ];

  for (const table of protectedTables) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
    assert.match(migration, new RegExp(`REVOKE ALL ON TABLE[^;]*public\\.${table}[^;]*FROM anon, PUBLIC`));
  }
  assert.doesNotMatch(migration, /GRANT[^;]*\b(?:anon|PUBLIC)\b/);
});

test('forward grant migration does not widen SECURITY DEFINER execute contracts', () => {
  const migration = migrationText('019_service_role_table_grants.sql');
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.log_project_activity\(UUID, UUID, VARCHAR, VARCHAR, UUID, JSONB, TEXT\) FROM PUBLIC, authenticated, anon/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.initialize_project_stats\(UUID\) FROM PUBLIC, authenticated, anon/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.log_project_activity\(UUID, UUID, VARCHAR, VARCHAR, UUID, JSONB, TEXT\) TO service_role/);
  assert.doesNotMatch(migration, /GRANT EXECUTE ON FUNCTION[\s\S]*TO anon/);
});

test('AI-PM views grant SELECT only to authenticated and service_role', () => {
  const expectedViews = [
    'project_members_with_profiles',
    'projects_with_counts',
    'projects_with_creator',
    'planning_documents_with_users',
    'pending_approval_documents',
    'document_approval_history_with_users',
  ];
  const extractPublicRelations = (statement) =>
    [...statement.matchAll(/\bpublic\.([a-z0-9_]+)\b/g)].map((match) => match[1]);

  for (const file of ['019_service_role_table_grants.sql', '020_ai_pm_view_grants.sql']) {
    const migration = migrationText(file);
    const grantStatements = migration
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => /^GRANT\s+/i.test(statement));
    const viewGrantStatements = grantStatements.filter((statement) =>
      /^GRANT SELECT ON TABLE[\s\S]*TO\s+authenticated\s*,\s*service_role$/i.test(statement),
    );
    assert.equal(viewGrantStatements.length, 1, `${file} must contain one AI-PM view grant allowlist`);
    assert.deepEqual(
      extractPublicRelations(viewGrantStatements[0]).sort(),
      expectedViews.slice().sort(),
    );

    const revokeStatements = migration
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => /^REVOKE\s+/i.test(statement));
    const viewRevoke = revokeStatements.find((statement) =>
      /^REVOKE ALL ON TABLE[\s\S]*FROM\s+anon\s*,\s*PUBLIC$/i.test(statement)
        && expectedViews.every((view) => statement.includes(`public.${view}`)),
    );
    assert.ok(viewRevoke, `${file} must revoke anon/PUBLIC from every AI-PM view`);
    assert.deepEqual(
      extractPublicRelations(viewRevoke).sort(),
      expectedViews.slice().sort(),
    );

    assert.doesNotMatch(migration, /GRANT[^;]*\b(?:anon|PUBLIC)\b[^;]*;/);
  }
});
