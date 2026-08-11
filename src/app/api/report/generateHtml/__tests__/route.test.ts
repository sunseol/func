/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/http';
import { requireAuth, getSupabase } from '@/lib/ai-pm/auth';
import { generateReport } from '@/lib/report-generator/ai';
import { POST } from '../route';

jest.mock('@/lib/ai-pm/auth', () => ({
  getSupabase: jest.fn(),
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/report-generator/ai', () => ({
  generateReport: jest.fn(),
}));

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockGenerateReport = generateReport as jest.MockedFunction<typeof generateReport>;

const authenticatedUser = {
  user: { id: 'user-1', email: 'user@example.com' },
  profile: {
    id: 'user-1',
    email: 'user@example.com',
    full_name: 'User',
    role: 'user' as const,
    created_at: '',
    updated_at: '',
  },
};

describe('/api/report/generateHtml', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupabase.mockResolvedValue({} as Awaited<ReturnType<typeof getSupabase>>);
    mockGenerateReport.mockResolvedValue('<html></html>');
  });

  it('rejects unauthenticated requests before invoking the AI service', async () => {
    mockRequireAuth.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));

    const response = await POST(new NextRequest('http://localhost/api/report/generateHtml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: 'hello' }),
    }), undefined);

    expect(response.status).toBe(401);
    expect(mockGenerateReport).not.toHaveBeenCalled();
  });

  it('preserves the response contract for authenticated requests', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);

    const response = await POST(new NextRequest('http://localhost/api/report/generateHtml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: 'hello' }),
    }), undefined);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ report: '<html></html>' });
  });

  it('rejects oversized summaries before invoking the AI service', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);

    const response = await POST(new NextRequest('http://localhost/api/report/generateHtml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: 'x'.repeat(40_001) }),
    }), undefined);

    expect(response.status).toBe(413);
    expect(mockGenerateReport).not.toHaveBeenCalled();
  });

  it('rejects an oversized JSON body without a content-length header before parsing JSON', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);
    const body = JSON.stringify({ summary: 'hello', padding: 'x'.repeat(128 * 1024) });

    const response = await POST(new NextRequest('http://localhost/api/report/generateHtml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }), undefined);

    expect(response.status).toBe(413);
    expect(mockGenerateReport).not.toHaveBeenCalled();
  });
});
