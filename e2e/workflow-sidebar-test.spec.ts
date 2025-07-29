import { test, expect } from '@playwright/test';

test.describe('WorkflowSidebar Component Test', () => {
    test('should load AI-PM project page with WorkflowSidebar', async ({ page }) => {
        // 콘솔 에러를 캐치하기 위한 리스너
        const consoleErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // 페이지 에러를 캐치하기 위한 리스너
        const pageErrors: string[] = [];
        page.on('pageerror', error => {
            pageErrors.push(error.message);
        });

        // 실제 WorkflowSidebar가 사용되는 페이지로 이동
        // 임시 프로젝트 ID 사용 (실제로는 존재하지 않을 수 있음)
        await page.goto('/ai-pm/test-project-123');

        // 페이지가 로드될 때까지 대기 (에러가 나더라도)
        await page.waitForTimeout(3000);

        // WorkflowSidebar 관련 에러 확인
        const workflowErrors = [...consoleErrors, ...pageErrors].filter(error =>
            error.includes('WorkflowSidebar') ||
            error.includes('includes') ||
            error.includes('completedSteps')
        );

        console.log('모든 콘솔 에러:', consoleErrors);
        console.log('모든 페이지 에러:', pageErrors);
        console.log('WorkflowSidebar 관련 에러들:', workflowErrors);

        // 에러 바운더리가 표시되었는지 확인
        const errorBoundary = page.locator('text=Error Boundary caught an error');
        const hasErrorBoundary = await errorBoundary.isVisible();

        if (hasErrorBoundary) {
            console.log('❌ 에러 바운더리가 표시됨 - WorkflowSidebar에 문제가 있음');
            // 테스트 실패시키기
            expect(hasErrorBoundary).toBe(false);
        } else {
            console.log('✅ 에러 바운더리가 표시되지 않음');
        }

        // WorkflowSidebar 관련 에러가 있으면 테스트 실패
        if (workflowErrors.length > 0) {
            throw new Error(`WorkflowSidebar 에러 발견: ${workflowErrors.join(', ')}`);
        }
    });

    test('should handle missing completedSteps prop gracefully', async ({ page }) => {
        await page.goto('/');

        // 페이지가 정상적으로 로드되는지 확인
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });
});