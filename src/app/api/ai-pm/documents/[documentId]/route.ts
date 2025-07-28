import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  UpdateDocumentRequest,
  DocumentResponse,
  AIpmErrorType,
  isValidDocumentStatus
} from '@/types/ai-pm';

// GET /api/ai-pm/documents/[documentId] - Get a specific document
export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: AIpmErrorType.UNAUTHORIZED, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { documentId } = params;

    // Get document with user info
    const { data: document, error: queryError } = await supabase
      .from('planning_documents')
      .select(`
        *,
        creator:user_profiles!created_by(email, full_name),
        approver:user_profiles!approved_by(email, full_name)
      `)
      .eq('id', documentId)
      .single();

    if (queryError || !document) {
      return NextResponse.json(
        { error: AIpmErrorType.DOCUMENT_NOT_FOUND, message: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Check access permissions
    const canAccess = document.status === 'official' || document.created_by === user.id;
    
    if (!canAccess) {
      // Check if user is admin
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userProfile || userProfile.role !== 'admin') {
        // Check if user is project member
        const { data: projectMember } = await supabase
          .from('project_members')
          .select('id')
          .eq('project_id', document.project_id)
          .eq('user_id', user.id)
          .single();

        if (!projectMember) {
          return NextResponse.json(
            { error: AIpmErrorType.FORBIDDEN, message: '문서에 접근할 권한이 없습니다.' },
            { status: 403 }
          );
        }
      }
    }

    // Get document versions if requested
    const url = new URL(request.url);
    const includeVersions = url.searchParams.get('includeVersions') === 'true';
    
    let versions = undefined;
    if (includeVersions) {
      const { data: versionData } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version', { ascending: false });
      
      versions = versionData || [];
    }

    // Format response
    const documentWithUsers = {
      ...document,
      creator_email: document.creator?.email || '',
      creator_name: document.creator?.full_name || null,
      approver_email: document.approver?.email || null,
      approver_name: document.approver?.full_name || null
    };

    // Remove nested objects
    delete documentWithUsers.creator;
    delete documentWithUsers.approver;

    const response: DocumentResponse = { 
      document: documentWithUsers,
      versions
    };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Get Document API Error:', error);
    return NextResponse.json(
      { 
        error: AIpmErrorType.INTERNAL_ERROR, 
        message: '서버 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PUT /api/ai-pm/documents/[documentId] - Update a document
export async function PUT(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: AIpmErrorType.UNAUTHORIZED, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { documentId } = params;
    const body: UpdateDocumentRequest = await request.json();
    const { title, content, status } = body;

    // Get existing document
    const { data: existingDocument, error: queryError } = await supabase
      .from('planning_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (queryError || !existingDocument) {
      return NextResponse.json(
        { error: AIpmErrorType.DOCUMENT_NOT_FOUND, message: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Check edit permissions
    const canEdit = existingDocument.created_by === user.id;
    
    if (!canEdit) {
      // Check if user is admin
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userProfile || userProfile.role !== 'admin') {
        return NextResponse.json(
          { error: AIpmErrorType.FORBIDDEN, message: '문서를 수정할 권한이 없습니다.' },
          { status: 403 }
        );
      }
    }

    // Validate status if provided
    if (status && !isValidDocumentStatus(status)) {
      return NextResponse.json(
        { error: AIpmErrorType.VALIDATION_ERROR, message: '유효하지 않은 문서 상태입니다.' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (status !== undefined) updateData.status = status;

    // Handle version increment for content changes
    let shouldCreateVersion = false;
    if (content !== undefined && content !== existingDocument.content) {
      updateData.version = existingDocument.version + 1;
      shouldCreateVersion = true;
    }

    // Handle approval status changes
    if (status === 'official' && existingDocument.status !== 'official') {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    } else if (status !== 'official' && existingDocument.status === 'official') {
      updateData.approved_by = null;
      updateData.approved_at = null;
    }

    // Update document
    const { data: document, error: updateError } = await supabase
      .from('planning_documents')
      .update(updateData)
      .eq('id', documentId)
      .select(`
        *,
        creator:user_profiles!created_by(email, full_name),
        approver:user_profiles!approved_by(email, full_name)
      `)
      .single();

    if (updateError) {
      console.error('Error updating document:', updateError);
      return NextResponse.json(
        { error: AIpmErrorType.DATABASE_ERROR, message: '문서 업데이트 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // Create version record if content changed
    if (shouldCreateVersion) {
      await supabase
        .from('document_versions')
        .insert([{
          document_id: documentId,
          version: existingDocument.version,
          content: existingDocument.content,
          created_by: existingDocument.created_by
        }]);
    }

    // Format response
    const documentWithUsers = {
      ...document,
      creator_email: document.creator?.email || '',
      creator_name: document.creator?.full_name || null,
      approver_email: document.approver?.email || null,
      approver_name: document.approver?.full_name || null
    };

    // Remove nested objects
    delete documentWithUsers.creator;
    delete documentWithUsers.approver;

    const response: DocumentResponse = { document: documentWithUsers };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Update Document API Error:', error);
    return NextResponse.json(
      { 
        error: AIpmErrorType.INTERNAL_ERROR, 
        message: '서버 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE /api/ai-pm/documents/[documentId] - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: AIpmErrorType.UNAUTHORIZED, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { documentId } = params;

    // Get existing document
    const { data: existingDocument, error: queryError } = await supabase
      .from('planning_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (queryError || !existingDocument) {
      return NextResponse.json(
        { error: AIpmErrorType.DOCUMENT_NOT_FOUND, message: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Check delete permissions
    const canDelete = existingDocument.created_by === user.id;
    
    if (!canDelete) {
      // Check if user is admin
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userProfile || userProfile.role !== 'admin') {
        return NextResponse.json(
          { error: AIpmErrorType.FORBIDDEN, message: '문서를 삭제할 권한이 없습니다.' },
          { status: 403 }
        );
      }
    }

    // Delete document (versions will be deleted by cascade)
    const { error: deleteError } = await supabase
      .from('planning_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('Error deleting document:', deleteError);
      return NextResponse.json(
        { error: AIpmErrorType.DATABASE_ERROR, message: '문서 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '문서가 성공적으로 삭제되었습니다.' });

  } catch (error) {
    console.error('Delete Document API Error:', error);
    return NextResponse.json(
      { 
        error: AIpmErrorType.INTERNAL_ERROR, 
        message: '서버 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}