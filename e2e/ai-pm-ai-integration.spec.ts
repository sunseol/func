import { test, expect } from '@playwright/test';
import { TestHelpers, TEST_USERS, setupTestData, cleanupTestData } from './utils/test-helpers';

test.describe('AI PM AI Integration Tests', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await setupTestData(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page);
  });

  test('AI chat and document generation workflow', async ({ page }) => {
    // Setup: Create project and navigate to workflow
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('AI Integration Test');
    await helpers.navigateToWorkflowStep(1);

    // Test AI chat interface
    await helpers.expectElementVisible('[data-testid="ai-chat-panel"]');
    await helpers.expectElementVisible('[data-testid="ai-chat-input"]');
    await helpers.expectElementVisible('[data-testid="send-message-button"]');

    // Send initial message to AI
    await helpers.sendAIMessage('스마트폰 앱 기반의 음식 배달 플랫폼을 기획하고 싶습니다. 주요 타겟은 20-30대 직장인입니다.');

    // Verify AI response appears
    await helpers.expectElementVisible('[data-testid="ai-response"]');
    
    // Check that response contains relevant content
    const aiResponse = await page.locator('[data-testid="ai-response"]').last();
    await expect(aiResponse).toContainText('음식 배달');
    await expect(aiResponse).toContainText('플랫폼');

    // Test follow-up conversation
    await helpers.sendAIMessage('경쟁사 분석도 포함해서 더 자세히 설명해주세요.');
    
    // Verify conversation history is maintained
    await expect(page.locator('[data-testid="ai-message"]')).toHaveCount(4); // 2 user + 2 AI messages

    // Test document generation from conversation
    await helpers.generateDocument();
    
    // Verify document was generated with AI content
    await helpers.expectElementVisible('[data-testid="document-editor"]');
    const documentContent = await page.locator('[data-testid="document-editor"]').inputValue();
    expect(documentContent).toContain('음식 배달');
    expect(documentContent.length).toBeGreaterThan(100); // Should be substantial content
  });

  test('AI conflict detection and analysis', async ({ page }) => {
    // Setup: Create project with multiple approved documents
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('Conflict Detection Test');

    // Create and approve document in step 1
    await helpers.navigateToWorkflowStep(1);
    await helpers.editDocument(`
# 사업 아이디어 정의

## 핵심 아이디어
온라인 교육 플랫폼 "EduHub"

## 주요 특징
- 실시간 화상 강의
- AI 기반 개인화 학습
- 모바일 최적화

## 타겟 고객
- 대학생 및 직장인
- 온라인 학습 선호자
    `);
    await helpers.requestApproval();
    await helpers.approveDocument();

    // Create and approve document in step 2
    await helpers.navigateToWorkflowStep(2);
    await helpers.editDocument(`
# 시장 조사 및 경쟁사 분석

## 시장 현황
- 온라인 교육 시장 급성장
- 코로나19로 인한 비대면 교육 확산

## 주요 경쟁사
- 클래스101: 취미 중심
- 패스트캠퍼스: 직무 교육
- 코세라: 대학 강의
    `);
    await helpers.requestApproval();
    await helpers.approveDocument();

    // Create conflicting document in step 3
    await helpers.navigateToWorkflowStep(3);
    await helpers.editDocument(`
# 핵심 기능 정의

## 주요 기능
- 오프라인 강의 예약 시스템
- 실물 교재 배송 서비스
- PC 전용 학습 환경

## 특징
- 전통적인 교육 방식 선호
- 고령층 타겟
    `);

    // Test AI conflict detection
    await helpers.checkConflicts();

    // Verify conflict analysis panel appears
    await helpers.expectElementVisible('[data-testid="conflict-analysis-panel"]');
    
    // Check that conflicts are properly identified
    const conflictPanel = page.locator('[data-testid="conflict-analysis-panel"]');
    await expect(conflictPanel).toContainText('충돌');
    await expect(conflictPanel).toContainText('모바일'); // Should mention mobile conflict
    await expect(conflictPanel).toContainText('오프라인'); // Should mention offline conflict

    // Test conflict severity levels
    await helpers.expectElementVisible('[data-testid="conflict-severity"]');
    const severity = await page.locator('[data-testid="conflict-severity"]').textContent();
    expect(['높음', '중간', '낮음']).toContain(severity);

    // Test conflict resolution suggestions
    await helpers.expectElementVisible('[data-testid="conflict-suggestions"]');
    const suggestions = page.locator('[data-testid="conflict-suggestions"]');
    await expect(suggestions).toContainText('제안');
  });

  test('AI streaming response handling', async ({ page }) => {
    // Setup
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('Streaming Test');
    await helpers.navigateToWorkflowStep(1);

    // Send a complex message that should trigger streaming
    await page.fill('[data-testid="ai-chat-input"]', '종합적인 핀테크 플랫폼을 기획해주세요. 결제, 송금, 투자, 대출 등 모든 금융 서비스를 포함한 상세한 기획안을 작성해주세요.');
    await page.click('[data-testid="send-message-button"]');

    // Verify streaming indicator appears
    await helpers.expectElementVisible('[data-testid="ai-typing-indicator"]');

    // Wait for streaming to complete
    await page.waitForSelector('[data-testid="ai-typing-indicator"]', { state: 'hidden', timeout: 60000 });

    // Verify final response is complete
    const finalResponse = await page.locator('[data-testid="ai-response"]').last();
    const responseText = await finalResponse.textContent();
    expect(responseText).not.toBeNull();
    expect((responseText ?? '').length).toBeGreaterThan(500); // Should be comprehensive
    expect(responseText ?? '').toContain('핀테크');
    expect(responseText ?? '').toContain('결제');
  });

  test('AI error handling and recovery', async ({ page }) => {
    // Setup
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('Error Handling Test');
    await helpers.navigateToWorkflowStep(1);

    // Test network error simulation
    await page.route('**/api/ai-pm/chat', route => {
      route.abort('failed');
    });

    await helpers.sendAIMessage('테스트 메시지입니다.');

    // Verify error message appears
    await helpers.expectElementVisible('[data-testid="ai-error-message"]');
    await helpers.expectTextContent('[data-testid="ai-error-message"]', '오류');

    // Test retry functionality
    await page.unroute('**/api/ai-pm/chat');
    await page.click('[data-testid="retry-ai-message"]');

    // Verify retry works
    await helpers.expectElementVisible('[data-testid="ai-response"]');

    // Test timeout handling
    await page.route('**/api/ai-pm/chat', route => {
      // Delay response to simulate timeout
      setTimeout(() => route.continue(), 35000);
    });

    await helpers.sendAIMessage('타임아웃 테스트 메시지입니다.');

    // Verify timeout error appears
    await helpers.expectElementVisible('[data-testid="ai-timeout-error"]');
  });

  test('AI context awareness across workflow steps', async ({ page }) => {
    // Setup: Create project and work through multiple steps
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('Context Awareness Test');

    // Step 1: Define business idea
    await helpers.navigateToWorkflowStep(1);
    await helpers.sendAIMessage('헬스케어 IoT 플랫폼을 기획하고 싶습니다.');
    await helpers.generateDocument();
    await helpers.editDocument(`
# 사업 아이디어 정의

## 핵심 아이디어
헬스케어 IoT 플랫폼 "HealthConnect"

## 주요 특징
- 웨어러블 디바이스 연동
- 실시간 건강 모니터링
- AI 기반 건강 분석
    `);
    await helpers.requestApproval();
    await helpers.approveDocument();

    // Step 2: Market analysis with context awareness
    await helpers.navigateToWorkflowStep(2);
    await helpers.sendAIMessage('앞서 정의한 헬스케어 IoT 플랫폼에 대한 시장 분석을 해주세요.');

    // Verify AI response shows context awareness
    const aiResponse = await page.locator('[data-testid="ai-response"]').last();
    await expect(aiResponse).toContainText('HealthConnect');
    await expect(aiResponse).toContainText('웨어러블');
    await expect(aiResponse).toContainText('헬스케어');

    // Step 3: Feature definition with accumulated context
    await helpers.navigateToWorkflowStep(3);
    await helpers.sendAIMessage('이전 단계들을 바탕으로 핵심 기능을 정의해주세요.');

    const step3Response = await page.locator('[data-testid="ai-response"]').last();
    await expect(step3Response).toContainText('IoT');
    await expect(step3Response).toContainText('모니터링');
  });

  test('AI prompt customization per workflow step', async ({ page }) => {
    // Setup
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('Prompt Customization Test');

    // Test different prompts for different steps
    const stepTests = [
      { step: 1, keyword: '사업 아이디어', expectedContext: '아이디어' },
      { step: 2, keyword: '시장 조사', expectedContext: '경쟁사' },
      { step: 3, keyword: '핵심 기능', expectedContext: '기능' },
      { step: 4, keyword: '기술 스택', expectedContext: '기술' },
      { step: 5, keyword: '개발 계획', expectedContext: '개발' }
    ];

    for (const { step, keyword, expectedContext } of stepTests) {
      await helpers.navigateToWorkflowStep(step);
      await helpers.sendAIMessage(`${keyword}에 대해 도움을 주세요.`);
      
      const response = await page.locator('[data-testid="ai-response"]').last();
      await expect(response).toContainText(expectedContext);
    }
  });

  test('AI conversation persistence and history', async ({ page }) => {
    // Setup
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('Conversation Persistence Test');
    await helpers.navigateToWorkflowStep(1);

    // Have a conversation
    await helpers.sendAIMessage('첫 번째 메시지입니다.');
    await helpers.sendAIMessage('두 번째 메시지입니다.');
    await helpers.sendAIMessage('세 번째 메시지입니다.');

    // Verify all messages are visible
    await expect(page.locator('[data-testid="ai-message"]')).toHaveCount(6); // 3 user + 3 AI

    // Navigate away and back
    await helpers.navigateToWorkflowStep(2);
    await helpers.navigateToWorkflowStep(1);

    // Verify conversation history is preserved
    await expect(page.locator('[data-testid="ai-message"]')).toHaveCount(6);
    
    // Verify message content is preserved
    const messages = await page.locator('[data-testid="user-message"]').allTextContents();
    expect(messages).toContain('첫 번째 메시지입니다.');
    expect(messages).toContain('두 번째 메시지입니다.');
    expect(messages).toContain('세 번째 메시지입니다.');

    // Test conversation export/import (if implemented)
    await page.click('[data-testid="export-conversation"]');
    await helpers.expectElementVisible('[data-testid="export-modal"]');
  });

  test('AI-generated content quality validation', async ({ page }) => {
    // Setup
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('Content Quality Test');
    await helpers.navigateToWorkflowStep(1);

    // Generate document with specific requirements
    await helpers.sendAIMessage('B2B SaaS 플랫폼을 기획해주세요. 구체적인 타겟 고객, 핵심 가치 제안, 수익 모델을 포함해서 상세히 작성해주세요.');
    await helpers.generateDocument();

    // Validate generated content quality
    const documentContent = await page.locator('[data-testid="document-editor"]').inputValue();
    
    // Check for required sections
    expect(documentContent).toContain('타겟');
    expect(documentContent).toContain('가치');
    expect(documentContent).toContain('수익');
    expect(documentContent).toContain('B2B');
    expect(documentContent).toContain('SaaS');

    // Check content structure (should have headers)
    expect(documentContent).toMatch(/#{1,3}\s+/); // Should have markdown headers
    
    // Check minimum content length
    expect(documentContent.length).toBeGreaterThan(300);

    // Test content refinement
    await helpers.sendAIMessage('생성된 문서에서 수익 모델 부분을 더 구체적으로 개선해주세요.');
    await helpers.generateDocument();

    const refinedContent = await page.locator('[data-testid="document-editor"]').inputValue();
    expect(refinedContent.length).toBeGreaterThan(documentContent.length);
  });
});
