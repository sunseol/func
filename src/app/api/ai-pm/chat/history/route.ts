import { NextRequest } from 'next/server';
import { ApiError, json, withApi } from '@/lib/http';
import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';
import { requireString, requireUuid } from '@/lib/ai-pm/validators';
import { AIpmErrorType, WorkflowStep } from '@/types/ai-pm';

interface ConversationSummary {
  id: string;
  workflow_step: WorkflowStep;
  step_name: string;
  message_count: number;
  last_activity: string;
}

interface ConversationStats {
  total_conversations: number;
  total_messages: number;
  most_active_step: WorkflowStep | null;
  activity_by_step: Record<WorkflowStep, number>;
  recent_activity_count: number;
}

export const GET = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);

  const url = new URL(request.url);
  const projectId = requireUuid(requireString(url.searchParams.get('projectId'), 'projectId'), 'projectId');

  await requireProjectAccess(supabase, auth, projectId);

  const { data: summaries, error } = await supabase.rpc('get_conversation_summaries', {
    p_project_id: projectId,
    p_user_id: auth.user.id,
  });

  if (error) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch conversation summaries', error);
  }

  const conversationSummaries: ConversationSummary[] = summaries || [];

  return json({
    conversations: conversationSummaries,
    stats: generateStats(conversationSummaries),
  });
});

function generateStats(summaries: ConversationSummary[]): ConversationStats {
  const activityByStep: Record<WorkflowStep, number> = {} as Record<WorkflowStep, number>;
  let totalMessages = 0;
  let recentActivityCount = 0;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const summary of summaries) {
    const step = summary.workflow_step as WorkflowStep;
    activityByStep[step] = (activityByStep[step] || 0) + summary.message_count;
    totalMessages += summary.message_count;

    if (new Date(summary.last_activity) > oneDayAgo) {
      recentActivityCount++;
    }
  }

  let mostActiveStep: WorkflowStep | null = null;
  let maxActivity = 0;
  for (const [step, count] of Object.entries(activityByStep)) {
    if (count > maxActivity) {
      maxActivity = count;
      mostActiveStep = parseInt(step, 10) as WorkflowStep;
    }
  }

  return {
    total_conversations: summaries.length,
    total_messages: totalMessages,
    most_active_step: mostActiveStep,
    activity_by_step: activityByStep,
    recent_activity_count: recentActivityCount,
  };
}
