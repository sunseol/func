ALTER TABLE ai_conversations
ADD CONSTRAINT ai_conversations_project_step_user_unique UNIQUE (project_id, workflow_step, user_id);
