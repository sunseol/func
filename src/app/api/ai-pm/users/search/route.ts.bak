import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic'; // force dynamic rendering to bypass cache

// GET /api/ai-pm/users/search - Get all users or search by email
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    let query = supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .order('full_name', { ascending: true });

    // If email parameter is provided, filter by email
    if (email && email.trim()) {
      query = query.ilike('email', `%${email.trim()}%`);
    }

    const { data: users, error } = await query.limit(50);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '사용자 조회 중 오류가 발생했습니다.', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
