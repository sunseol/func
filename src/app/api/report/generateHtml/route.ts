import { NextResponse } from 'next/server';
import { ApiError, withApi } from '@/lib/http';
import { getSupabase, requireAuth } from '@/lib/ai-pm/auth';
import { generateReport } from '@/lib/report-generator/ai';

const MAX_BODY_BYTES = 128 * 1024;
const MAX_SUMMARY_CHARS = 40_000;

async function readJsonWithinLimit(request: Request, maxBytes: number): Promise<unknown> {
        const body = request.body;
        if (!body) {
            throw new ApiError(400, 'INVALID_JSON', 'Request body is required');
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

        try {
            const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
            return parsed;
        } catch {
            throw new ApiError(400, 'INVALID_JSON', 'Invalid JSON body');
        }
}

const reportPrompt = `
## 인포그래픽 보고서 생성 지시사항
너는 전문적인 인포그래픽 디자이너야. 주어진 텍스트 내용을 바탕으로, **A4 용지 한 페이지에 완벽하게 들어가는** 시각적으로 뛰어난 HTML 인포그래픽 보고서를 생성해야 한다.

### 절대 준수 규칙:
- **분량 엄수**: 결과물은 **A4 단일 페이지**를 목표로 하되, 내용의 완성도를 우선시한다.
- **레이아웃 제약**: 전체 콘텐츠는 반드시 width: 100%, max-width: 210mm 안에 들어가야 한다. 절대로 이 너비를 초과하지 않는다.
- **메타데이터 제외**: 호스트명, 생성 시간, URL, 파일 경로 등 메타정보는 절대 포함하지 않는다. 오직 문서의 실제 내용만 다룬다.
- **출력**: 다른 설명 없이, 완전한 HTML 코드만 출력한다. \`\`\`html 같은 마크다운 코드 블록은 사용하지 않는다.
- **언어**: 보고서의 모든 내용은 한국어로 작성한다.

### 필수 HTML 구조:
\`\`\`html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; font-size: 14px; line-height: 1.8; color: #1a1a1a; background: white; }
    .container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 35px; text-align: center; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); }
    .header h1 { font-size: 32px; margin-bottom: 12px; font-weight: 700; }
    .header p { font-size: 17px; opacity: 0.95; font-weight: 400; }
    .section { margin-bottom: 22px; }
    .section h2 { font-size: 22px; color: #333; font-weight: 700; border-left: 5px solid #667eea; padding-left: 12px; margin-bottom: 16px; }
    .section h3 { font-size: 18px; color: #444; font-weight: 600; margin: 12px 0 8px 0; }
    .content { padding: 18px; background: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; color: #2c2c2c; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; background: white; }
    th, td { padding: 12px; text-align: left; border: 1px solid #d0d0d0; color: #1a1a1a; }
    th { background: #667eea; color: white; font-weight: 600; }
    tr:nth-child(even) { background: #f9f9f9; }
    .highlight-box { background: #f0f7ff; border-left: 5px solid #667eea; padding: 16px; margin: 12px 0; border-radius: 6px; color: #1a1a1a; }
    ul, ol { list-style-position: outside; margin-left: 20px; color: #1a1a1a; }
    li { margin: 8px 0; }
    p { margin: 8px 0; color: #2c2c2c; }
    strong { color: #1a1a1a; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>[제목]</h1>
      <p>[부제]</p>
    </div>

    <div class="section">
      <h2>섹션 제목</h2>
      <div class="content">
        [내용]
      </div>
    </div>

    <!-- 필요한 만큼 섹션 추가 -->
  </div>
</body>
</html>
\`\`\`

### 스타일 가이드:
1. **컬러**:
   - 메인: #667eea, 서브: #764ba2 (그라데이션)
   - 텍스트: #1a1a1a (진한 검은색), 본문: #2c2c2c
   - 배경: 흰색, 강조 영역: #f0f7ff
2. **간격**: 섹션 간 여백 22px, 내부 패딩 18px
3. **폰트**: 제목 h1(32px), h2(22px), h3(18px), 본문(14px), line-height: 1.8
4. **가독성**: 충분한 대비(검은 텍스트), 적절한 여백, 명확한 구분선
5. **구조**: 3-5개 섹션, 각 섹션은 제목과 충분한 설명 포함
6. **내용 우선**: 문서의 핵심 정보를 모두 담되, 메타데이터는 제외

이제 아래 요약된 내용을 바탕으로 위의 규칙을 **반드시** 지켜서 가독성 높은 인포그래픽 보고서를 만들어줘.
`;

export const POST = withApi(async (req: Request) => {
        const supabase = await getSupabase();
        await requireAuth(supabase);

        const contentType = req.headers.get('content-type') || '';
        if (contentType !== '' && !contentType.includes('application/json')) {
            throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'unsupported request content type');
        }
        const contentLength = req.headers.get('content-length');
        if (contentLength !== null && Number(contentLength) > MAX_BODY_BYTES) {
            throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'request body exceeds the allowed limit');
        }
        const rawBody = await readJsonWithinLimit(req, MAX_BODY_BYTES);
        if (typeof rawBody !== 'object' || rawBody === null || !('summary' in rawBody) ||
            typeof rawBody.summary !== 'string' || rawBody.summary.trim().length === 0) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'summary is required');
        }
        if (new TextEncoder().encode(JSON.stringify(rawBody)).byteLength > MAX_BODY_BYTES ||
            rawBody.summary.length > MAX_SUMMARY_CHARS) {
            throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'summary exceeds the allowed limit');
        }

        const summary = rawBody.summary;
        
        const report = await generateReport(summary, reportPrompt);

        return NextResponse.json({ report });
});
