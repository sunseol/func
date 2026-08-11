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

export interface ParseJsonOptions {
  readonly maxBytes?: number;
  readonly requireContentType?: boolean;
}

async function readBodyWithinLimit(request: Request, maxBytes: number): Promise<string> {
  const body = request.body;
  if (!body) return '';

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      totalBytes += result.value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel('request body exceeds limit');
        throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function parseJson<T>(request: Request, options: ParseJsonOptions = {}): Promise<T> {
  if (options.requireContentType) {
    const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/json') {
      throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json');
    }
  }

  try {
    const body = options.maxBytes === undefined
      ? await request.json()
      : JSON.parse(await readBodyWithinLimit(request, options.maxBytes)) as T;
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof SyntaxError) {
      throw new ApiError(400, 'INVALID_JSON', 'Invalid JSON body');
    }
    throw error;
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
    if (error.status >= 500) {
      console.error('API error:', { status: error.status, code: error.code, details: error.details });
      return json({ error: error.code, message: error.message }, { status: error.status });
    }
    const response = error.details === undefined
      ? { error: error.code, message: error.message }
      : { error: error.code, message: error.message, details: error.details };
    return json(response, { status: error.status });
  }

  console.error('Unhandled API error:', error);
  return json(
    { error: 'INTERNAL_ERROR', message: 'Unexpected error' },
    { status: 500 },
  );
}
