import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlanningDocumentWithUsers, DocumentStatus } from '@/types/ai-pm';

// Mock fetch
global.fetch = vi.fn();

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      }))
    })),
    removeChannel: vi.fn()
  })
}));

const mockDocument: PlanningDocumentWithUsers = {
  id: 'doc-1',
  project_id: 'project-1',
  workflow_step: 1,
  title: 'Test Document',
  content: '# Test Content',
  status: 'private',
  version: 1,
  created_by: 'user-1',
  approved_by: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  approved_at: null,
  creator_email: 'user@test.com',
  creator_name: 'Test User',
  approver_email: null,
  approver_name: null
};

describe('Document Manager API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should make correct API call for loading documents', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ documents: [mockDocument] })
    } as Response);

    // Simulate API call
    const response = await fetch('/api/ai-pm/documents?projectId=project-1&workflowStep=1', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai-pm/documents?projectId=project-1&workflowStep=1',
      expect.objectContaining({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
    );
    expect(data.documents).toEqual([mockDocument]);
  });

  it('should handle API error responses', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Load failed' })
    } as Response);

    const response = await fetch('/api/ai-pm/documents?projectId=project-1&workflowStep=1');
    const data = await response.json();

    expect(response.ok).toBe(false);
    expect(data.message).toBe('Load failed');
  });

  it('should make correct API call for creating documents', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ document: mockDocument })
    } as Response);

    const response = await fetch('/api/ai-pm/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: 'project-1',
        workflow_step: 1,
        title: 'Test Document',
        content: '# Test Content'
      })
    });

    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai-pm/documents',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: 'project-1',
          workflow_step: 1,
          title: 'Test Document',
          content: '# Test Content'
        })
      })
    );
    expect(data.document).toEqual(mockDocument);
  });

  it('should make correct API call for updating documents', async () => {
    const mockFetch = vi.mocked(fetch);
    const updatedDocument = { ...mockDocument, content: '# Updated Content', version: 2 };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ document: updatedDocument })
    } as Response);

    const response = await fetch('/api/ai-pm/documents/doc-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '# Updated Content' })
    });

    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai-pm/documents/doc-1',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '# Updated Content' })
      })
    );
    expect(data.document).toEqual(updatedDocument);
  });

  it('should make correct API call for AI document generation', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ document: mockDocument })
    } as Response);

    const response = await fetch('/api/ai-pm/documents/generate?projectId=project-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_step: 1 })
    });

    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai-pm/documents/generate?projectId=project-1',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_step: 1 })
      })
    );
    expect(data.document).toEqual(mockDocument);
  });

  it('should make correct API call for deleting documents', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Document deleted' })
    } as Response);

    const response = await fetch('/api/ai-pm/documents/doc-1', {
      method: 'DELETE'
    });

    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai-pm/documents/doc-1',
      expect.objectContaining({
        method: 'DELETE'
      })
    );
    expect(data.message).toBe('Document deleted');
  });
});