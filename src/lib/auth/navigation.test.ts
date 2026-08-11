import {
  buildLoginRedirect,
  getSafeRedirectPath,
  getRequestedPath,
  getPostLoginPath,
  isProtectedPath,
} from './navigation';

describe('auth navigation contract', () => {
  describe('getSafeRedirectPath', () => {
    it.each([
      ['/my-reports', '/my-reports'],
      ['/my-reports?filter=morning', '/my-reports?filter=morning'],
      ['/ai-pm/project-1/workflow/2?tab=docs', '/ai-pm/project-1/workflow/2?tab=docs'],
    ])('accepts safe internal path %s', (value, expected) => {
      expect(getSafeRedirectPath(value)).toBe(expected);
    });

    it.each(['', 'https://evil.example', '//evil.example', '/\\\\evil.example', 'javascript:alert(1)'])
      ('rejects unsafe redirect %s', (value) => {
        expect(getSafeRedirectPath(value)).toBeNull();
      });
  });

  it('builds an encoded login redirect with the requested query string', () => {
    expect(buildLoginRedirect('/my-reports?filter=morning')).toBe(
      '/login?redirect=%2Fmy-reports%3Ffilter%3Dmorning',
    );
  });

  it('uses the pathname and search string as one safe requested path', () => {
    expect(getRequestedPath('/my-reports', '?filter=morning')).toBe('/my-reports?filter=morning');
  });

  it('does not redirect an authenticated user back to login', () => {
    expect(getPostLoginPath('/login')).toBe('/');
  });

  it.each([
    '/',
    '/my-reports',
    '/report-generator',
    '/notifications',
    '/profile',
    '/admin/settings',
    '/ai-pm/project-1/workflow/2',
  ])('recognizes known protected route %s', (pathname) => {
    expect(isProtectedPath(pathname)).toBe(true);
  });

  it.each(['/qa-missing-route', '/api/unknown', '/ai-pm-not-a-route', '/reports'])(
    'does not recognize non-protected route %s',
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(false);
    },
  );
});
