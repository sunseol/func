import { NextResponse } from 'next/server';
import { generateReport } from '@/lib/report-generator/ai';

const reportPrompt = `
## 인포그래픽 보고서 생성 지시사항
너는 전문적인 인포그래픽 디자이너야. 주어진 텍스트 내용을 바탕으로, **A4 용지 한 페이지에 완벽하게 들어가는** 시각적으로 뛰어난 HTML 인포그래픽 보고서를 생성해야 한다.

### 절대 준수 규칙:
- **분량 엄수**: 무슨 일이 있어도 결과물은 **A4 단일 페이지**를 넘어서는 안 된다. 모든 내용을 매우 간결하게 요약하고 압축하여 한 페이지에 맞춰야 한다.
- **HTML 구조**: 반드시 제공된 HTML 구조와 클래스 이름을 사용해야 한다.
- **스타일**: 모든 스타일은 반드시 \`<style>\` 태그 안에 포함시켜야 하며, 인라인 스타일은 사용하지 않는다.
- **출력**: 다른 설명 없이, 완전한 HTML 코드만 출력한다.
- **언어**: 보고서의 모든 내용은 한국어로 작성한다.

### 스타일 및 구조 가이드:
1.  **전체 구조**: \`<div class="page-container">\` 안에 모든 콘텐츠를 담는다. (이 클래스는 이미 외부에서 A4 사이즈로 지정되어 있음)
2.  **디자인 테마**: 파란색 계열(예: #667eea, #764ba2)을 메인 컬러로 사용한다.
3.  **헤더**: 그라데이션 배경의 헤더에 핵심 제목과 부제를 포함한다.
4.  **섹션**: 내용을 논리적인 섹션으로 나누고, 명확한 소제목을 붙인다.
5.  **콘텐츠 시각화**: 중요한 데이터나 목록은 표(\`<table>\`), 강조 박스(\`<div class="highlight-box">\`) 등을 활용하여 간결하게 시각화한다.

이제 아래 요약된 내용을 바탕으로 위의 규칙을 **반드시** 지켜서 A4 한 페이지 분량의 보고서를 만들어줘.
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
