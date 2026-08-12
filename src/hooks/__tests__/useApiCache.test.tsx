import { renderHook, waitFor } from '@testing-library/react';
import { useDocuments } from '../useApiCache';

describe('useDocuments', () => {
  it('requests documents with the route parameter names and encoded values', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ documents: [] }),
    });

    renderHook(() => useDocuments('project id', 2));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/ai-pm/documents?projectId=project%20id&workflowStep=2',
    );
  });
});
