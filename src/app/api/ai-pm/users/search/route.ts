import { NextRequest } from 'next/server';
import { ApiError, json, withApi } from '@/lib/http';
import { getSupabase, requireAuth } from '@/lib/ai-pm/auth';
import { sanitizeText } from '@/lib/ai-pm/validators';
import { AIpmErrorType } from '@/types/ai-pm';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (request: NextRequest) => {
  const supabase = await getSupabase();
  await requireAuth(supabase);

  const { searchParams } = new URL(request.url);
  const email = sanitizeText(searchParams.get('email'));

  let query = supabase
    .from('user_profiles')
    .select('id, email, full_name')
    .order('full_name', { ascending: true });

  if (email) {
    query = query.ilike('email', `%${email}%`);
  }

  const { data: users, error } = await query.limit(50);

  if (error) {
    throw new ApiError(500, AIpmErrorType.DATABASE_ERROR, 'Failed to fetch users', error);
  }

  return json({ users: users || [] });
});
