/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET } from '../route';

const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

describe('/api/auth/check-email', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it.each([
    'existing@example.com',
    'missing@example.com',
    'not-an-email',
  ])('returns the same retired response for %s without inspecting account state', async (email) => {
    const response = await GET(
      new NextRequest(`http://localhost:3000/api/auth/check-email?email=${encodeURIComponent(email)}`),
      undefined,
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({ error: 'ENDPOINT_DISABLED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not depend on service-role credentials', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const response = await GET(
      new NextRequest('http://localhost:3000/api/auth/check-email?email=user%40example.com'),
      undefined,
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({ error: 'ENDPOINT_DISABLED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
