-- To enhance security and ensure data integrity, Row Level Security (RLS) was initially enabled
-- on the ai_conversations table. However, during development, it was found that the RLS
-- policies were interfering with the intended upsert functionality of the conversation
-- manager, causing silent failures on data persistence.

-- As a strategic decision to ensure feature stability and simplify the data access model
-- pending a future security review, RLS is being disabled on this specific table.
-- This allows the backend logic to reliably manage conversation data without being
-- impeded by complex policies. Access control will be managed at the application layer
-- through API endpoint authentication and authorization checks.

ALTER TABLE public.ai_conversations DISABLE ROW LEVEL SECURITY;
