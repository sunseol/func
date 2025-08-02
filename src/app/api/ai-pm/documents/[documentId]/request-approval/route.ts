import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/ai-pm/auth-middleware';
import { AIpmErrorType } from '@/types/ai-pm';

export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  console.log('--- DOCUMENT APPROVAL REQUEST API START ---');
  try {
    const supabase = await createClient();
    const authResult = await checkAuth();

    if ('error' in authResult) {
      console.log('[DEBUG] Auth Error:', authResult.message);
      return NextResponse.json(authResult, { status: 401 });
    }
    const { user } = authResult;
    const { documentId } = params;

    console.log(`[DEBUG] User ID: ${user.id}`);
    console.log(`[DEBUG] Document ID: ${documentId}`);

    console.log('[DEBUG] Calling RPC: request_document_approval...');
    const { data, error } = await supabase.rpc('request_document_approval', {
      p_document_id: documentId,
      p_user_id: user.id,
    });

    console.log('[DEBUG] RPC Response Data:', JSON.stringify(data, null, 2));
    console.log('[DEBUG] RPC Response Error:', JSON.stringify(error, null, 2));

    if (error) {
      console.error('Error in request_document_approval RPC:', error);
      return NextResponse.json(
        { error: AIpmErrorType.DATABASE_ERROR, message: '승인 요청 처리 중 데이터베이스 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
        console.log('[DEBUG] RPC returned no data. Conditions not met. Sending 400.');
        return NextResponse.json(
            { error: AIpmErrorType.VALIDATION_ERROR, message: '승인 요청을 할 수 없는 문서 상태이거나, 권한이 없습니다.' },
            { status: 400 }
        );
    }
    
    console.log('[DEBUG] RPC successful. Sending 200.');
    console.log('--- DOCUMENT APPROVAL REQUEST API END ---');
    return NextResponse.json({ message: '승인 요청이 성공적으로 처리되었습니다.' });

  } catch (error) {
    console.error('Request Approval API Error:', error);
    return NextResponse.json({ error: AIpmErrorType.INTERNAL_ERROR, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
