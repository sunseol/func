import { TextDecoder, TextEncoder } from 'node:util';
import { ReadableStream, TransformStream, WritableStream } from 'node:stream/web';

let updateSession: typeof import('./middleware').updateSession;
let NextRequest: typeof import('next/server').NextRequest;
let EdgeRequest: typeof import('next/dist/compiled/@edge-runtime/primitives/fetch').Request;
let EdgeHeaders: typeof import('next/dist/compiled/@edge-runtime/primitives/fetch').Headers;
let EdgeResponse: typeof import('next/dist/compiled/@edge-runtime/primitives/fetch').Response;

jest.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}));

describe('middleware auth redirect', () => {
  beforeAll(async () => {
    Object.assign(globalThis, { ReadableStream, TransformStream, WritableStream, TextDecoder, TextEncoder });
    ({ Request: EdgeRequest, Headers: EdgeHeaders, Response: EdgeResponse } = await import('next/dist/compiled/@edge-runtime/primitives/fetch'));
    Object.assign(globalThis, { Request: EdgeRequest, Headers: EdgeHeaders, Response: EdgeResponse });
    ({ updateSession } = await import('./middleware'));
    ({ NextRequest } = await import('next/server'));
  });

  it('redirects an unauthenticated protected request to login with encoded path and query', async () => {
    const response = await updateSession(new NextRequest('http://localhost/my-reports?filter=morning'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost/login?redirect=%2Fmy-reports%3Ffilter%3Dmorning',
    );
  });

  it.each(['/ai-pm/project-123', '/ai-pm/project-123/workflow/1', '/admin/settings'])(
    'redirects an unauthenticated protected subpath to login: %s',
    async (path) => {
      const response = await updateSession(new NextRequest(`http://localhost${path}`));

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(
        `http://localhost/login?redirect=${encodeURIComponent(path)}`,
      );
    },
  );

  it.each(['/landing', '/login', '/signup', '/reset-password', '/auth/callback'])(
    'allows public auth path %s without redirect',
    async (path) => {
      const response = await updateSession(new NextRequest(`http://localhost${path}`));

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    },
  );

  it.each(['/qa-missing-route', '/ai-pm-not-a-route', '/reports'])
    ('passes an unknown non-API path through to Next for not-found handling: %s', async (path) => {
      const response = await updateSession(new NextRequest(`http://localhost${path}`));

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });

  it('passes API requests through without a page redirect', async () => {
    const response = await updateSession(new NextRequest('http://localhost/api/unknown'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});
