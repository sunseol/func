import { NextRequest } from 'next/server';
import { ApiError, json, parseJson, withApi } from '@/lib/http';
import { getAIService } from '@/lib/ai-pm/ai-service';
import { getSupabase, requireAuth, requireProjectAccess } from '@/lib/ai-pm/auth';
import { requireMaxLength, requireString, requireUuid, requireWorkflowStep } from '@/lib/ai-pm/validators';
import { AIpmErrorType } from '@/types/ai-pm';

export const runtime = 'nodejs';

interface ConflictAnalysisRequest {
  projectId: string;
  currentContent: string;
  currentTitle: string;
  workflowStep: number;
}

interface ConflictAnalysisResult {
  hasConflicts: boolean;
  conflictLevel: 'none' | 'minor' | 'major' | 'critical';
  conflicts: Array<{
    type: 'content' | 'requirement' | 'design' | 'technical';
    description: string;
    conflictingDocument: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }>;
  recommendations: string[];
  summary: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export const POST = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  const auth = await requireAuth(supabase);

  const body = await parseJson<ConflictAnalysisRequest>(request, { maxBytes: 512_000, requireContentType: true });
  const projectId = requireUuid(requireString(body.projectId, 'projectId'), 'projectId');
  const currentContent = requireMaxLength(requireString(body.currentContent, 'currentContent'), 'currentContent', 400_000);
  const currentTitle = requireMaxLength(requireString(body.currentTitle, 'currentTitle'), 'currentTitle', 255);
  const workflowStep = requireWorkflowStep(body.workflowStep, 'workflowStep');

  await requireProjectAccess(supabase, auth, projectId);

  const { data: officialDocuments, error: documentsError } = await supabase
    .from('planning_documents')
    .select('workflow_step, title, content, version, created_by')
    .eq('project_id', projectId)
    .eq('status', 'official')
    .neq('workflow_step', workflowStep)
    .order('workflow_step', { ascending: true });

  if (documentsError) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch official documents', documentsError);
  }

  const aiService = getAIService();
  const analysisText = await aiService.analyzeConflicts(
    `${currentTitle}\n\n${currentContent}`,
    (officialDocuments || []).filter(isRecord).map((doc) => ({
      step: doc.workflow_step,
      content: `${doc.title}\n\n${doc.content}`,
    })),
    workflowStep,
  );

  let analysisResult: ConflictAnalysisResult;
  try {
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    analysisResult = JSON.parse(jsonMatch ? jsonMatch[0] : analysisText);
  } catch (parseError) {
    analysisResult = {
      hasConflicts: false,
      conflictLevel: 'none',
      conflicts: [],
      recommendations: ['Unable to parse AI analysis. Please review manually.'],
      summary: 'AI analysis did not return valid JSON.',
    };
  }

  return json({
    analysis: analysisResult,
    analyzedDocuments: officialDocuments?.length || 0,
    timestamp: new Date().toISOString(),
  });
});
