import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PdfReader } from 'pdfreader';
import { ApiError, withApi } from '@/lib/http';
import { getSupabase, requireAuth } from '@/lib/ai-pm/auth';
import { summarizeContent } from '@/lib/report-generator/ai';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_JSON_BODY_BYTES = 256 * 1024;
const MAX_MULTIPART_BODY_BYTES = MAX_FILE_BYTES + 64 * 1024;
const MAX_TEXT_CHARS = 120_000;
const ALLOWED_FILE_TYPES = new Set([
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

async function readBodyWithinLimit(request: Request, maxBytes: number): Promise<Uint8Array> {
    const body = request.body;
    if (!body) {
        throw new ApiError(400, 'INVALID_BODY', 'Request body is required');
    }

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
        while (true) {
            const result = await reader.read();
            if (result.done) break;
            totalBytes += result.value.byteLength;
            if (totalBytes > maxBytes) {
                await reader.cancel();
                throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'request body exceeds the allowed limit');
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

    return bytes;
}

async function readJsonWithinLimit(request: Request, maxBytes: number): Promise<unknown> {
    try {
        const bytes = await readBodyWithinLimit(request, maxBytes);
        const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
        return parsed;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(400, 'INVALID_JSON', 'Invalid JSON body');
    }
}

async function extractText(file: File): Promise<string> {
    const mimetype = file.type;
    if (!ALLOWED_FILE_TYPES.has(mimetype)) {
        throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', `Unsupported file type: ${mimetype}`);
    }
    if (file.size > MAX_FILE_BYTES) {
        throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'file exceeds the allowed limit');
    }
    if (file.size === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'file is empty');
    }
    const buffer = Buffer.from(await file.arrayBuffer());

    if (mimetype === 'application/pdf') {
        return new Promise((resolve, reject) => {
            let text = '';
            new PdfReader(null).parseBuffer(buffer, (err, item) => {
                if (err) return reject(err);
                if (!item) return resolve(text);
                if (item.text) text += item.text + ' ';
            });
        });
    } else if (mimetype === 'text/plain') {
        return buffer.toString('utf-8');
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } else {
        throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', `Unsupported file type: ${mimetype}`);
    }
}

export const POST = withApi(async (req: Request) => {
        const supabase = await getSupabase();
        await requireAuth(supabase);

        let rawContent: string;
        const contentType = req.headers.get('content-type') || '';
        const contentLength = req.headers.get('content-length');

        if (contentType.includes('multipart/form-data')) {
            if (contentLength === null || !/^\d+$/.test(contentLength)) {
                throw new ApiError(411, 'LENGTH_REQUIRED', 'content-length is required for file uploads');
            }
            const multipartBytes = Number(contentLength);
            if (!Number.isSafeInteger(multipartBytes) || multipartBytes > MAX_MULTIPART_BODY_BYTES) {
                throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'request body exceeds the allowed limit');
            }
            const boundedBody = await readBodyWithinLimit(req, MAX_MULTIPART_BODY_BYTES);
            const boundedRequest = new Request(req.url, {
                method: req.method,
                headers: { 'content-type': contentType },
                body: boundedBody,
            });
            const formData = await boundedRequest.formData();
            const entries = Array.from(formData.entries());
            if (entries.length !== 1 || entries[0]?.[0] !== 'file' || !(entries[0][1] instanceof File)) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'exactly one file is required');
            }
            rawContent = await extractText(entries[0][1]);
        } else if (contentType.includes('application/json')) {
            if (contentLength !== null && Number(contentLength) > MAX_JSON_BODY_BYTES) {
                throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'request body exceeds the allowed limit');
            }
            const rawBody = await readJsonWithinLimit(req, MAX_JSON_BODY_BYTES);
            if (typeof rawBody !== 'object' || rawBody === null || !('text' in rawBody) ||
                typeof rawBody.text !== 'string' || rawBody.text.trim().length === 0) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'text is required');
            }
            if (new TextEncoder().encode(JSON.stringify(rawBody)).byteLength > MAX_JSON_BODY_BYTES ||
                rawBody.text.length > MAX_TEXT_CHARS) {
                throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'text exceeds the allowed limit');
            }
            rawContent = rawBody.text;
        } else {
            throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'unsupported request content type');
        }

        if (rawContent.trim().length === 0) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'file contains no text');
        }
        if (rawContent.length > MAX_TEXT_CHARS) {
            throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'extracted text exceeds the allowed limit');
        }
        
        const summary = await summarizeContent(rawContent);

        return NextResponse.json({ summary });
});
