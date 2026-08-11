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

const REDACTED_DETAIL = '[REDACTED]';
const SENSITIVE_DETAIL_KEY = /(?:token|secret|password|credential|authorization|cookie|api[-_]?key|access[-_]?key|refresh[-_]?token|email|sql|query|provider|payload|body|request|stack|hint)/i;
const SENSITIVE_DETAIL_TEXT = [
  /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/,
  /\b(?:bearer|basic)\s+[^\s]+/i,
  /\b[a-z][a-z\d+.-]*:\/\/[^/\s:@]+:[^@\s]+@/i,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /\b(?:select|insert|update|delete|drop|alter|create)\b[\s\S]*/i,
  /\b(?:token|secret|password|credential|provider)\b/i,
];

function redactErrorDetails(
  value: unknown,
  key?: string,
  seen: WeakSet<object> = new WeakSet<object>(),
  depth = 0,
): unknown {
  if (depth > 6 || (key !== undefined && SENSITIVE_DETAIL_KEY.test(key))) return REDACTED_DETAIL;
  if (typeof value === 'string') {
    if (SENSITIVE_DETAIL_TEXT.some((pattern) => pattern.test(value))) return REDACTED_DETAIL;
    return value.length > 512 ? `${value.slice(0, 512)}…` : value;
  }
  if (typeof value !== 'object' || value === null) return value;
  if (seen.has(value)) return REDACTED_DETAIL;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactErrorDetails(item, undefined, seen, depth + 1));
  }

  const redacted: Record<string, unknown> = {};
  for (const [nestedKey, nestedValue] of Object.entries(value)) {
    redacted[nestedKey] = redactErrorDetails(nestedValue, nestedKey, seen, depth + 1);
  }
  return redacted;
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
      console.error('API error:', { status: error.status, code: error.code, messageClass: 'api_error' });
      return json({ error: error.code, message: error.message }, { status: error.status });
    }
    const response = error.details === undefined
      ? { error: error.code, message: error.message }
      : { error: error.code, message: error.message, details: redactErrorDetails(error.details) };
    return json(response, { status: error.status });
  }

  console.error('Unhandled API error:', { status: 500, code: 'INTERNAL_ERROR', messageClass: 'unhandled_error' });
  return json(
    { error: 'INTERNAL_ERROR', message: 'Unexpected error' },
    { status: 500 },
  );
}
