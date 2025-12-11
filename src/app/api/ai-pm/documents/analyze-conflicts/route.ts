import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Groq from 'groq-sdk';

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

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ConflictAnalysisRequest = await request.json();
    const { projectId, currentContent, currentTitle, workflowStep } = body;

    if (!projectId || !currentContent) {
      return NextResponse.json({ error: 'Project ID and content are required' }, { status: 400 });
    }

    // Check project membership or admin role
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !projectMember) {
      const { data: userProfile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
      if (userProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get all official documents from the same project
    const { data: officialDocuments, error: documentsError } = await supabase
      .from('planning_documents')
      .select('id, workflow_step, title, content, version, created_by')
      .eq('project_id', projectId)
      .eq('status', 'official')
      .neq('workflow_step', workflowStep)
      .order('workflow_step', { ascending: true });

    if (documentsError) {
      console.error('Error fetching official documents:', documentsError);
      return NextResponse.json({ error: 'Failed to fetch project documents' }, { status: 500 });
    }

    // Manually fetch user details for document creators
    let documentContext: any[] = [];
    if (officialDocuments && officialDocuments.length > 0) {
      const userIds = officialDocuments.map(doc => doc.created_by);
      const { data: profiles } = await supabase.from('user_profiles').select('id, full_name, email').in('id', userIds);
      const userMap = new Map(profiles?.map(p => [p.id, { name: p.full_name, email: p.email }]));

      documentContext = officialDocuments.map((doc: any) => ({
        step: doc.workflow_step,
        title: doc.title,
        content: doc.content,
        version: doc.version,
        author: userMap.get(doc.created_by)?.name || userMap.get(doc.created_by)?.email || 'Unknown'
      }));
    }

    const analysisPrompt = `
당신은 프로젝트 기획 문서의 충돌을 분석하는 AI PM입니다. 현재 작성 중인 문서가 기존의 공식 승인된 문서들과 충돌하는지 분석해주세요.
## 현재 문서 (워크플로우 ${workflowStep}단계)
제목: ${currentTitle}
내용:\n${currentContent}
## 기존 공식 문서들
${documentContext.map((doc, index) => `### 문서 ${index + 1} (워크플로우 ${doc.step}단계)\n제목: ${doc.title}\n작성자: ${doc.author}\n버전: v${doc.version}\n내용:\n${doc.content}`).join('\n\n')}
## 분석 요청사항
다음 JSON 형식으로 충돌 분석 결과를 제공해주세요:
{
  "hasConflicts": boolean,
  "conflictLevel": "none" | "minor" | "major" | "critical",
  "conflicts": [{"type": "content" | "requirement" | "design" | "technical", "description": "충돌에 대한 구체적인 설명", "conflictingDocument": "충돌하는 문서의 제목과 단계", "severity": "low" | "medium" | "high", "suggestion": "해결 방안 제안"}],
  "recommendations": ["전반적인 개선 제안들"],
  "summary": "분석 결과 요약"
}
## 분석 기준
1. **내용 충돌**: 서로 다른 단계에서 상충되는 내용이나 요구사항
2. **요구사항 충돌**: 기능적/비기능적 요구사항의 불일치
3. **설계 충돌**: UI/UX, 아키텍처, 기술적 접근 방식의 불일치  
4. **기술적 충돌**: 기술 스택, 플랫폼, 구현 방식의 불일치
충돌이 없더라도 일관성 향상이나 품질 개선을 위한 제안을 포함해주세요. 한국어로 답변해주세요.`;

    try {
      const groq = new Groq({
        apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
      });

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: '당신은 프로젝트 기획 문서의 충돌을 분석하는 전문가입니다. 주어진 문서들을 분석하고 정확한 JSON 형식으로 결과를 제공합니다.' },
          { role: 'user', content: analysisPrompt }
        ],
        model: 'moonshotai/kimi-k2-instruct',
        temperature: 0.3,
        max_tokens: 4000,
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) throw new Error('AI analysis failed');

      let analysisResult: ConflictAnalysisResult;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        analysisResult = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        analysisResult = {
          hasConflicts: false,
          conflictLevel: 'none',
          conflicts: [],
          recommendations: ['AI 분석 중 오류가 발생했습니다. 수동으로 문서를 검토해주세요.'],
          summary: 'AI 분석 결과를 파싱할 수 없습니다.'
        };
      }

      // Store analysis result
      await supabase.from('ai_conversations').insert({
        project_id: projectId,
        workflow_step: workflowStep,
        user_id: user.id,
        messages: [{
          id: `conflict-analysis-${Date.now()}`,
          role: 'system',
          content: `충돌 분석 결과: ${JSON.stringify(analysisResult)}`,
          timestamp: new Date().toISOString()
        }]
      });

      return NextResponse.json({
        analysis: analysisResult,
        analyzedDocuments: documentContext.length,
        timestamp: new Date().toISOString()
      });

    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      return NextResponse.json({ error: 'AI analysis failed', details: aiError instanceof Error ? aiError.message : 'Unknown error' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in conflict analysis API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
