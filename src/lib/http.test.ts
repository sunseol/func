jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      json: async () => data,
    })),
  },
}));

import { ApiError, toErrorResponse } from './http';

describe('toErrorResponse error logging', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps provider and database details out of 5xx log arguments', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new ApiError(500, 'DATABASE_ERROR', 'Database request failed', {
      message: 'provider-secret-detail',
      membership: { email: 'member@example.com', token: 'membership-secret-token' },
      query: 'select * from private_records',
      nested: [{ sentinel: 'sentinel secret' }],
    });

    toErrorResponse(error);

    expect(consoleError).toHaveBeenCalledWith('API error:', expect.objectContaining({
      status: 500,
      code: 'DATABASE_ERROR',
    }));
    const serializedLogArgs = JSON.stringify(consoleError.mock.calls);
    expect(serializedLogArgs).not.toContain('provider-secret-detail');
    expect(serializedLogArgs).not.toContain('member@example.com');
    expect(serializedLogArgs).not.toContain('membership-secret-token');
    expect(serializedLogArgs).not.toContain('select * from private_records');
    expect(serializedLogArgs).not.toContain('sentinel secret');
  });

  it('does not serialize an unknown error object into the 500 log', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = Object.assign(new Error('provider-secret-detail'), {
      details: { sentinel: 'sentinel secret' },
    });

    toErrorResponse(error);

    const serializedLogArgs = JSON.stringify(consoleError.mock.calls);
    expect(serializedLogArgs).not.toContain('provider-secret-detail');
    expect(serializedLogArgs).not.toContain('sentinel secret');
    expect(serializedLogArgs).toContain('INTERNAL_ERROR');
  });

  it('keeps safe 4xx diagnostics while redacting sensitive detail fields', async () => {
    const response = toErrorResponse(new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', {
      field: 'title',
      reason: 'must be present',
      email: 'member@example.com',
      token: 'membership-secret-token',
      query: 'select * from private_records',
    }));
    const body = await response.json();

    expect(body).toMatchObject({
      error: 'VALIDATION_ERROR',
      details: { field: 'title', reason: 'must be present' },
    });
    const serializedBody = JSON.stringify(body);
    expect(serializedBody).not.toContain('member@example.com');
    expect(serializedBody).not.toContain('membership-secret-token');
    expect(serializedBody).not.toContain('select * from private_records');
  });
});
