import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ProjectActivity {
  id: string;
  project_id: string;
  user_id: string | null;
  activity_type: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, any>;
  description: string;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

interface CollaborationStats {
  total_documents: number;
  official_documents: number;
  pending_documents: number;
  total_members: number;
  total_activities: number;
  last_activity_at: string;
}

interface MemberActivitySummary {
  user_id: string;
  user_name: string | null;
  user_email: string;
  role: string;
  documents_created: number;
  documents_updated: number;
  documents_approved: number;
  ai_conversations: number;
  last_activity_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();
    const { projectId } = params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is a member of the project
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !projectMember) {
      // Check if user is admin
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userProfile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    // Get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const activityType = url.searchParams.get('type');
    const includeStats = url.searchParams.get('includeStats') === 'true';
    const includeMemberSummary = url.searchParams.get('includeMemberSummary') === 'true';

    // Build activities query
    let activitiesQuery = supabase
      .from('project_activities')
      .select(`
        *,
        user:user_id (
          email,
          user_profiles (
            name
          )
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (activityType) {
      activitiesQuery = activitiesQuery.eq('activity_type', activityType);
    }

    const { data: activitiesData, error: activitiesError } = await activitiesQuery;

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    // Format activities
    const activities: ProjectActivity[] = (activitiesData || []).map((activity: any) => ({
      id: activity.id,
      project_id: activity.project_id,
      user_id: activity.user_id,
      activity_type: activity.activity_type,
      target_type: activity.target_type,
      target_id: activity.target_id,
      metadata: activity.metadata || {},
      description: activity.description,
      created_at: activity.created_at,
      user_name: activity.user?.user_profiles?.name || null,
      user_email: activity.user?.email || null
    }));

    const response: any = {
      activities,
      pagination: {
        limit,
        offset,
        hasMore: activities.length === limit
      }
    };

    // Get collaboration stats if requested
    if (includeStats) {
      const { data: statsData, error: statsError } = await supabase
        .from('project_collaboration_stats')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (!statsError && statsData) {
        response.collaborationStats = {
          total_documents: statsData.total_documents,
          official_documents: statsData.official_documents,
          pending_documents: statsData.pending_documents,
          total_members: statsData.total_members,
          total_activities: statsData.total_activities,
          last_activity_at: statsData.last_activity_at
        };
      }
    }

    // Get member activity summary if requested
    if (includeMemberSummary) {
      const { data: memberSummaryData, error: memberSummaryError } = await supabase
        .from('member_activity_summary')
        .select(`
          user_id,
          documents_created,
          documents_updated,
          documents_approved,
          ai_conversations,
          last_activity_at,
          user:user_id (
            email,
            user_profiles (
              name
            )
          ),
          project_member:project_members!inner (
            role
          )
        `)
        .eq('project_id', projectId)
        .order('last_activity_at', { ascending: false });

      if (!memberSummaryError && memberSummaryData) {
        response.memberSummary = memberSummaryData.map((member: any) => ({
          user_id: member.user_id,
          user_name: member.user?.user_profiles?.name || null,
          user_email: member.user?.email || 'Unknown',
          role: member.project_member?.role || 'Unknown',
          documents_created: member.documents_created,
          documents_updated: member.documents_updated,
          documents_approved: member.documents_approved,
          ai_conversations: member.ai_conversations,
          last_activity_at: member.last_activity_at
        }));
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in project activities API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 새로운 활동 기록을 위한 POST 엔드포인트
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();
    const { projectId } = params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      activity_type, 
      target_type, 
      target_id, 
      metadata = {}, 
      description 
    } = body;

    if (!activity_type || !description) {
      return NextResponse.json(
        { error: 'Activity type and description are required' },
        { status: 400 }
      );
    }

    // Use the helper function to log activity
    const { data: result, error } = await supabase.rpc('log_project_activity', {
      p_project_id: projectId,
      p_user_id: user.id,
      p_activity_type: activity_type,
      p_target_type: target_type,
      p_target_id: target_id,
      p_metadata: metadata,
      p_description: description
    });

    if (error) {
      console.error('Error logging activity:', error);
      return NextResponse.json(
        { error: 'Failed to log activity' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      activity_id: result
    });

  } catch (error) {
    console.error('Error in log activity API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 