import { NextRequest } from 'next/server';
import { ApiError, json, withApi } from '@/lib/http';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  if (!email) {
    throw new ApiError(400, 'INVALID_EMAIL', 'Email is required');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ exists: false, unavailable: true }, { status: 503 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(email);
  if (error) {
    throw new ApiError(500, 'SUPABASE_ERROR', 'Failed to check email', error);
  }

  return json({ exists: !!data?.user });
});
