-- Disable RLS for ai_conversations table
ALTER TABLE public.ai_conversations DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Project members can view AI conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Project members can create AI conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Conversation creators and admins can update conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Conversation creators and admins can delete conversations" ON public.ai_conversations;

-- Create a permissive policy to allow all actions
CREATE POLICY "Allow all actions on ai_conversations"
ON public.ai_conversations
FOR ALL
USING (true)
WITH CHECK (true);
