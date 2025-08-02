import { NextResponse } from 'next/server';
import { generateReport } from '@/lib/report-generator/ai';

const reportPrompt = `
## 인포그래픽 보고서 생성 지시사항
너는 전문적인 인포그래픽 디자이너야. 주어진 텍스트 내용을 바탕으로, 한 페이지 분량의 시각적으로 뛰어난 HTML 인포그래픽 보고서를 생성해야 해.

### 준수 사항:
1.  **전체 구조**: 전체를 감싸는 \`<div class="page-container">\` 안에 모든 콘텐츠를 담아줘.
2.  **디자인 테마**: 전문적이고 현대적인 느낌을 주기 위해 파란색 계열(예: #667eea, #764ba2)을 메인 컬러로 사용해줘.
3.  **헤더**: 그라데이션 배경을 가진 헤더를 만들고, 보고서의 핵심 제목과 부제를 포함해줘.
4.  **섹션 나누기**: 내용을 논리적인 여러 섹션으로 나누고, 각 섹션마다 명확한 소제목을 붙여줘.
5.  **콘텐츠 시각화**: 중요한 데이터나 목록은 일반 텍스트 대신 표(\`<table>\`), 강조 박스(\`<div class="highlight-box">\`) 등을 활용해서 시각적으로 보기 좋게 표현해줘.
6.  **스타일**: 모든 스타일은 반드시 \`<style>\` 태그 안에 포함시켜야 하며, 인라인 스타일은 사용하지 마.
7.  **언어**: 보고서의 모든 내용은 한국어로 작성해줘.
8.  **출력 형식**: 다른 설명 없이, 완전한 HTML 코드만 출력해줘.

이제 아래 내용을 요약해서 보고서를 만들어줘.
`;

export async function POST(req: Request) {
    console.log("[GENERATE_HTML_API] Received request");
    try {
        const body = await req.json();
        const summary = body.summary;

        if (!summary || typeof summary !== 'string') {
            return NextResponse.json({ error: '요약된 내용이 필요합니다.' }, { status: 400 });
        }
        
        const report = await generateReport(summary, reportPrompt);

        return NextResponse.json({ report });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        return NextResponse.json({ error: 'HTML 보고서 생성 중 오류 발생', details: errorMessage }, { status: 500 });
    }
}
