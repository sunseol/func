import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PdfReader } from 'pdfreader';
import { summarizeContent } from '@/lib/report-generator/ai';

async function extractText(file: File): Promise<string> {
    const mimetype = file.type;
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
        throw new Error(`Unsupported file type: ${mimetype}`);
    }
}

export async function POST(req: Request) {
    console.log("[SUMMARIZE_API] Received request");
    try {
        let rawContent: string;
        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;
            if (!file) return NextResponse.json({ error: '파일이 업로드되지 않았습니다.' }, { status: 400 });
            rawContent = await extractText(file);
        } else if (contentType.includes('application/json')) {
            const body = await req.json();
            rawContent = body.text;
            if (!rawContent) return NextResponse.json({ error: '텍스트 내용이 비어있습니다.' }, { status: 400 });
        } else {
            return NextResponse.json({ error: '지원하지 않는 요청 형식입니다.' }, { status: 415 });
        }
        
        const summary = await summarizeContent(rawContent);

        return NextResponse.json({ summary });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        return NextResponse.json({ error: '콘텐츠 요약 중 오류 발생', details: errorMessage }, { status: 500 });
    }
}
