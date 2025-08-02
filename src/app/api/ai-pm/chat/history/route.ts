import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/ai-pm/auth-middleware';
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authResult = await checkAuth();

    if ('error' in authResult) {
      return NextResponse.json(authResult, { status: 401 });
    }
    const { user } = authResult;

    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: AIpmErrorType.INVALID_PROJECT_ID, message: '프로젝트 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const { data: summaries, error } = await supabase.rpc('get_conversation_summaries', {
      p_project_id: projectId,
      p_user_id: user.id,
    });

    if (error) {
      throw error;
    }

    const conversationSummaries: ConversationSummary[] = summaries || [];

    return NextResponse.json({
      conversations: conversationSummaries,
      stats: generateStats(conversationSummaries),
    });
  } catch (error) {
    console.error('Conversation History API Error:', error);
    return NextResponse.json(
      {
        error: AIpmErrorType.INTERNAL_ERROR,
        message: '서버 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
      { status: 500 }
    );
  }
}

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
      mostActiveStep = parseInt(step) as WorkflowStep;
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
