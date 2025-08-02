import { createClient } from '@/lib/supabase/server';
import { checkAuthWithMemberships } from '@/lib/ai-pm/auth-middleware';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { documentId: string } }
) {
    const { documentId } = params;
  if (!documentId) {
    return NextResponse.json({ message: 'Document ID is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { user, error: authError } = await checkAuthWithMemberships(supabase);

  if (authError) {
    return NextResponse.json({ message: authError.message }, { status: authError.status });
  }

  try {
    // Changed from .single() to handle SETOF functions more safely
    const { data: updatedDocuments, error: rpcError } = await supabase.rpc(
      'approve_document_and_demote_old_official',
      {
        p_document_id: documentId,
        p_user_id: user.id
      }
    ).select();

    if (rpcError) {
      console.error('RPC Error approving document:', rpcError);
      return NextResponse.json({ message: 'Database error while approving document.', details: rpcError.message }, { status: 500 });
    }

    if (!updatedDocuments || updatedDocuments.length === 0) {
      return NextResponse.json({ message: 'Document not found or no changes were made.' }, { status: 404 });
    }

    // Return the first document from the result array
    return NextResponse.json({ document: updatedDocuments[0], message: '문서가 공식 문서로 승인되었습니다.' });
  } catch (err: any) {
    console.error('Error in approve route:', err);
    return NextResponse.json({ message: err.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
