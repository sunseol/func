const INTERNAL_ORIGIN = 'http://internal.funcommute';
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const PROTECTED_PATHS = [
  '/',
  '/my-reports',
  '/report-generator',
  '/notifications',
  '/profile',
  '/admin',
  '/ai-pm',
] as const;

function matchesPathPrefix(pathname: string, path: string): boolean {
  return pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => matchesPathPrefix(pathname, path));
}

export function getSafeRedirectPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null;
  }
  if (CONTROL_CHARACTER_PATTERN.test(value)) {
    return null;
  }

  try {
    const parsed = new URL(value, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN || !parsed.pathname.startsWith('/')) {
      return null;
    }
  } catch {
    return null;
  }

  return value;
}

export function getRequestedPath(pathname: string, search = ''): string {
  const normalizedSearch = search && search.startsWith('?') ? search : '';
  return `${pathname}${normalizedSearch}`;
}

export function buildLoginRedirect(requestedPath: string): string {
  const safePath = getSafeRedirectPath(requestedPath) ?? '/';
  return `/login?redirect=${encodeURIComponent(safePath)}`;
}

export function getPostLoginPath(value: string | null | undefined): string {
  const safePath = getSafeRedirectPath(value);
  if (!safePath || safePath === '/login' || safePath.startsWith('/login/')) {
    return '/';
  }
  return safePath;
}
