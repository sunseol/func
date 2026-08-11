/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/http';
import { requireAuth, getSupabase } from '@/lib/ai-pm/auth';
import { summarizeContent } from '@/lib/report-generator/ai';
import { POST } from '../route';

jest.mock('@/lib/ai-pm/auth', () => ({
  getSupabase: jest.fn(),
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/report-generator/ai', () => ({
  summarizeContent: jest.fn(),
}));

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockSummarizeContent = summarizeContent as jest.MockedFunction<typeof summarizeContent>;

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

describe('/api/report/summarize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupabase.mockResolvedValue({} as Awaited<ReturnType<typeof getSupabase>>);
    mockSummarizeContent.mockResolvedValue('summary');
  });

  it('rejects unauthenticated requests before invoking the AI service', async () => {
    mockRequireAuth.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));

    const response = await POST(new NextRequest('http://localhost/api/report/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    }), undefined);

    expect(response.status).toBe(401);
    expect(mockSummarizeContent).not.toHaveBeenCalled();
  });

  it('preserves the response contract for authenticated JSON requests', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);

    const response = await POST(new NextRequest('http://localhost/api/report/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    }), undefined);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ summary: 'summary' });
  });

  it('rejects oversized JSON text before invoking the AI service', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);

    const response = await POST(new NextRequest('http://localhost/api/report/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'x'.repeat(120_001) }),
    }), undefined);

    expect(response.status).toBe(413);
    expect(mockSummarizeContent).not.toHaveBeenCalled();
  });

  it('rejects an oversized JSON body without a content-length header before parsing JSON', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);
    const body = JSON.stringify({ text: 'hello', padding: 'x'.repeat(256 * 1024) });

    const response = await POST(new NextRequest('http://localhost/api/report/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }), undefined);

    expect(response.status).toBe(413);
    expect(mockSummarizeContent).not.toHaveBeenCalled();
  });

  it('requires content-length for multipart requests', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);
    const formData = new FormData();
    formData.append('file', new File(['hello'], 'notes.txt', { type: 'text/plain' }));

    const response = await POST(new NextRequest('http://localhost/api/report/summarize', {
      method: 'POST',
      body: formData,
    }), undefined);

    expect(response.status).toBe(411);
    expect(mockSummarizeContent).not.toHaveBeenCalled();
  });

  it('summarizes one supported file for an authenticated request', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);
    const formData = new FormData();
    formData.append('file', new File(['hello'], 'notes.txt', { type: 'text/plain' }));

    const response = await POST(new NextRequest('http://localhost/api/report/summarize', {
      method: 'POST',
      headers: { 'Content-Length': '100' },
      body: formData,
    }), undefined);

    expect(response.status).toBe(200);
    expect(mockSummarizeContent).toHaveBeenCalledWith('hello');
  });

  it('rejects multiple files before invoking the AI service', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);
    const formData = new FormData();
    formData.append('file', new File(['one'], 'one.txt', { type: 'text/plain' }));
    formData.append('file', new File(['two'], 'two.txt', { type: 'text/plain' }));

    const response = await POST(new NextRequest('http://localhost/api/report/summarize', {
      method: 'POST',
      headers: { 'Content-Length': '100' },
      body: formData,
    }), undefined);

    expect(response.status).toBe(400);
    expect(mockSummarizeContent).not.toHaveBeenCalled();
  });

  it('rejects an oversized file before invoking the AI service', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);
    const formData = new FormData();
    formData.append('file', new File(['x'.repeat(10 * 1024 * 1024 + 1)], 'large.txt', { type: 'text/plain' }));

    const response = await POST(new NextRequest('http://localhost/api/report/summarize', {
      method: 'POST',
      headers: { 'Content-Length': '10485761' },
      body: formData,
    }), undefined);

    expect(response.status).toBe(413);
    expect(mockSummarizeContent).not.toHaveBeenCalled();
  });

  it('rejects extra multipart fields before invoking the AI service', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);
    const formData = new FormData();
    formData.append('file', new File(['hello'], 'notes.txt', { type: 'text/plain' }));
    formData.append('unexpected', 'value');

    const response = await POST(new NextRequest('http://localhost/api/report/summarize', {
      method: 'POST',
      headers: { 'Content-Length': '100' },
      body: formData,
    }), undefined);

    expect(response.status).toBe(400);
    expect(mockSummarizeContent).not.toHaveBeenCalled();
  });

  it('rejects an oversized multipart body despite a forged small content-length', async () => {
    mockRequireAuth.mockResolvedValueOnce(authenticatedUser);
    const sourceFormData = new FormData();
    sourceFormData.append('file', new File(['x'.repeat(10 * 1024 * 1024 + 100 * 1024)], 'large.txt', { type: 'text/plain' }));
    const sourceRequest = new Request('http://localhost/api/report/summarize', {
      method: 'POST',
      body: sourceFormData,
    });
    const body = await sourceRequest.arrayBuffer();
    const headers = new Headers(sourceRequest.headers);
    headers.set('Content-Length', '100');
    const formDataSpy = jest.spyOn(Request.prototype, 'formData');

    const response = await POST(new NextRequest('http://localhost/api/report/summarize', {
      method: 'POST',
      headers,
      body,
    }), undefined);

    expect(response.status).toBe(413);
    expect(formDataSpy).not.toHaveBeenCalled();
    expect(mockSummarizeContent).not.toHaveBeenCalled();
    formDataSpy.mockRestore();
  });
});
