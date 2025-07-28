import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { documentId } = params;

    // Get document versions from document_versions table
    const { data: versions, error: versionsError } = await supabase
      .from('document_versions')
      .select(`
        id,
        version,
        content,
        created_by,
        created_at,
        creator:created_by (
          id,
          email,
          user_profiles!inner (
            name
          )
        )
      `)
      .eq('document_id', documentId)
      .order('version', { ascending: false });

    if (versionsError) {
      console.error('Error fetching document versions:', versionsError);
      return NextResponse.json(
        { error: 'Failed to fetch document versions' },
        { status: 500 }
      );
    }

    // Check if user has access to this document
    const { data: document, error: docError } = await supabase
      .from('planning_documents')
      .select('project_id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user is a member of the project
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', document.project_id)
      .eq('user_id', user.id)
      .single();

    const isMember = !memberError && projectMember;

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!isMember && userProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Format versions for response
    const formattedVersions = versions?.map((version: any) => ({
      id: version.id,
      version: version.version,
      content: version.content,
      created_by: version.created_by,
      created_at: version.created_at,
      creator_name: version.creator?.user_profiles?.name,
      creator_email: version.creator?.email
    })) || [];

    return NextResponse.json({
      versions: formattedVersions
    });

  } catch (error) {
    console.error('Error in document versions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { documentId } = params;
    const body = await request.json();
    const { versionId } = body;

    // Get the version to restore
    const { data: versionToRestore, error: versionError } = await supabase
      .from('document_versions')
      .select('content, version')
      .eq('id', versionId)
      .eq('document_id', documentId)
      .single();

    if (versionError || !versionToRestore) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Get current document
    const { data: currentDocument, error: docError } = await supabase
      .from('planning_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !currentDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to edit this document
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', currentDocument.project_id)
      .eq('user_id', user.id)
      .single();

    const isMember = !memberError && projectMember;

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!isMember && userProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Save current content as a new version before restoring
    const nextVersion = currentDocument.version + 1;

    // Create version for current content
    const { error: versionCreateError } = await supabase
      .from('document_versions')
      .insert({
        document_id: documentId,
        version: currentDocument.version,
        content: currentDocument.content,
        created_by: currentDocument.created_by
      });

    if (versionCreateError) {
      console.error('Error creating current version:', versionCreateError);
      return NextResponse.json(
        { error: 'Failed to save current version' },
        { status: 500 }
      );
    }

    // Update document with restored content
    const { error: updateError } = await supabase
      .from('planning_documents')
      .update({
        content: versionToRestore.content,
        version: nextVersion,
        updated_at: new Date().toISOString(),
        status: 'private' // Reset to private when restoring
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating document:', updateError);
      return NextResponse.json(
        { error: 'Failed to restore document' },
        { status: 500 }
      );
    }

    // Create version for restored content
    const { error: restoredVersionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: documentId,
        version: nextVersion,
        content: versionToRestore.content,
        created_by: user.id
      });

    if (restoredVersionError) {
      console.error('Error creating restored version:', restoredVersionError);
    }

    return NextResponse.json({
      message: 'Document restored successfully',
      version: nextVersion
    });

  } catch (error) {
    console.error('Error in document version restore API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 