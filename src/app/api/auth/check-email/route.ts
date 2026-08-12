import { json, withApi } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const GET = withApi(async () => json(
  { error: 'ENDPOINT_DISABLED' },
  { status: 410 },
));
