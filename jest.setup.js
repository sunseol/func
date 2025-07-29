import '@testing-library/jest-dom';

// 환경 변수 모킹
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.NEXT_PUBLIC_GROQ_API_KEY = 'test-groq-key';

// Supabase 모킹
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null
      }),
      signOut: jest.fn().mockResolvedValue({ error: null })
    }
  }))
}));

// Next.js 모킹
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useParams: () => ({
    projectId: 'test-project',
    step: '1'
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/ai-pm/test-project/workflow/1',
}));

// fetch 모킹
global.fetch = jest.fn();

// ResizeObserver 모킹
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// IntersectionObserver 모킹
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Element.prototype.scrollIntoView 모킹 (only in browser environment)
if (typeof window !== 'undefined' && typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = jest.fn();
}

// Mock window.matchMedia (only in browser environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock console methods to reduce noise in tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps has been renamed')
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
}) 