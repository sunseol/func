import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ToastProvider } from '@/contexts/ToastContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { NavigationProvider } from '@/contexts/NavigationContext'

// Mock data for tests
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  isAdmin: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockProject = {
  id: 'test-project-id',
  name: 'Test Project',
  description: 'A test project for unit testing',
  creatorId: mockUser.id,
  creator: mockUser,
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockDocument = {
  id: 'test-document-id',
  title: 'Test Document',
  content: '# Test Document\n\nThis is a test document.',
  projectId: mockProject.id,
  step: 1,
  status: 'draft',
  createdBy: mockUser.id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: typeof mockUser
  isAuthenticated?: boolean
  isAdmin?: boolean
}

const AllTheProviders = ({ 
  children, 
  user = mockUser, 
  isAuthenticated = true, 
  isAdmin = true 
}: { 
  children: React.ReactNode 
} & CustomRenderOptions) => {
  return (
    <ToastProvider>
      <AuthProvider>
        <NavigationProvider>
          {children}
        </NavigationProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { user, isAuthenticated, isAdmin, ...renderOptions } = options
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders 
        user={user} 
        isAuthenticated={isAuthenticated} 
        isAdmin={isAdmin}
      >
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Mock functions
export const mockFetch = jest.fn()
export const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
export const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})

// Test helpers
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0))

export const createMockResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
})

export const mockApiResponse = (data: any, status = 200) => {
  mockFetch.mockResolvedValueOnce(createMockResponse(data, status))
}

export const mockApiError = (message: string, status = 400) => {
  mockFetch.mockResolvedValueOnce(createMockResponse({ error: message }, status))
}

// Cleanup helpers
export const cleanupMocks = () => {
  mockFetch.mockClear()
  mockConsoleError.mockClear()
  mockConsoleWarn.mockClear()
}

// Setup global fetch mock
beforeEach(() => {
  global.fetch = mockFetch
})

afterEach(() => {
  cleanupMocks()
}) 