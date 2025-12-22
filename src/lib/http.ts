import { NextResponse } from 'next/server';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function parseJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Invalid JSON body');
  }
}

export function withApi<RequestType extends Request, Context>(
  handler: (request: RequestType, context: Context) => Promise<Response>,
) {
  return async (request: RequestType, context: Context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return json(
      { error: error.code, message: error.message, details: error.details },
      { status: error.status },
    );
  }

  console.error('Unhandled API error:', error);
  return json(
    { error: 'INTERNAL_ERROR', message: 'Unexpected error' },
    { status: 500 },
  );
}
