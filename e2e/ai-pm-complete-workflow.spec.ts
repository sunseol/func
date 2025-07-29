import { test, expect } from '@playwright/test';
import { TestHelpers, TEST_USERS, setupTestData, cleanupTestData } from './utils/test-helpers';

test.describe('AI PM Complete Workflow', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await setupTestData(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page);
  });

  test('Complete project workflow from creation to document approval', async ({ page }) => {
    // 1. Admin login and project creation
    await helpers.login(TEST_USERS.admin);
    
    const projectId = await helpers.createProject(
      'E-Book Platform Project',
      'A comprehensive e-book platform for digital content distribution'
    );

    // Verify project was created
    await helpers.expectTextContent('[data-testid="project-title"]', 'E-Book Platform Project');

    // 2. Add project members
    await helpers.addProjectMember(TEST_USERS.planner1.email, '콘텐츠기획');
    await helpers.addProjectMember(TEST_USERS.planner2.email, '서비스기획');
    await helpers.addProjectMember(TEST_USERS.designer.email, 'UIUX기획');

    // Verify members were added
    await helpers.expectElementVisible(`[data-testid="member-${TEST_USERS.planner1.email}"]`);
    await helpers.expectElementVisible(`[data-testid="member-${TEST_USERS.planner2.email}"]`);
    await helpers.expectElementVisible(`[data-testid="member-${TEST_USERS.designer.email}"]`);

    // 3. Start workflow - Step 1: 사업 아이디어 정의
    await helpers.navigateToWorkflowStep(1);
    
    // Send AI message
    await helpers.sendAIMessage('전자책 플랫폼을 기획하고 싶습니다. 독자들이 쉽게 전자책을 구매하고 읽을 수 있는 플랫폼을 만들고자 합니다.');
    
    // Generate document from AI conversation
    await helpers.generateDocument();
    
    // Edit the generated document
    await helpers.editDocument(`
# 사업 아이디어 정의

## 핵심 아이디어
전자책 플랫폼 "BookHub"는 독자들이 다양한 장르의 전자책을 쉽게 발견하고, 구매하고, 읽을 수 있는 통합 플랫폼입니다.

## 주요 특징
- 개인화된 도서 추천 시스템
- 소셜 리딩 기능 (독서 노트 공유, 독서 모임)
- 다양한 결제 옵션 및 구독 모델
- 크로스 플랫폼 지원 (웹, 모바일, 태블릿)

## 타겟 고객
- 20-40대 디지털 네이티브
- 독서를 즐기는 직장인 및 학생
- 새로운 콘텐츠를 찾는 독서 애호가
    `);

    // Request approval
    await helpers.requestApproval();

    // 4. Logout and login as content planner to approve
    await helpers.logout();
    await helpers.login(TEST_USERS.planner1);
    
    // Navigate to the project
    await page.goto(`/ai-pm/${projectId}/workflow/1`);
    
    // Approve the document
    await helpers.approveDocument();

    // 5. Continue to Step 2: 시장 조사 및 경쟁사 분석
    await helpers.navigateToWorkflowStep(2);
    
    await helpers.sendAIMessage('전자책 시장의 현황과 주요 경쟁사들을 분석해주세요. 특히 국내 시장에 집중해서 분석해주세요.');
    
    await helpers.generateDocument();
    
    await helpers.editDocument(`
# 시장 조사 및 경쟁사 분석

## 시장 현황
- 국내 전자책 시장 규모: 약 2,000억원 (2023년 기준)
- 연평균 성장률: 15%
- 주요 성장 동력: 모바일 독서 증가, 구독 서비스 확산

## 주요 경쟁사
### 1. 리디북스
- 시장 점유율: 40%
- 강점: 다양한 장르, 구독 서비스
- 약점: 높은 수수료율

### 2. 밀리의 서재
- 시장 점유율: 25%
- 강점: 무제한 구독 모델
- 약점: 제한적인 신간 도서

### 3. 교보문고 SAM
- 시장 점유율: 20%
- 강점: 오프라인 연계
- 약점: 사용자 경험 부족
    `);

    await helpers.requestApproval();

    // 6. Test conflict detection
    await helpers.checkConflicts();
    
    // Verify conflict analysis panel appears
    await helpers.expectElementVisible('[data-testid="conflict-analysis-panel"]');

    // 7. Approve step 2
    await helpers.approveDocument();

    // 8. Test workflow progress tracking
    await helpers.expectTextContent('[data-testid="workflow-progress"]', '2/9');
    
    // Verify step 1 and 2 are marked as completed
    await helpers.expectElementVisible('[data-testid="step-1-completed"]');
    await helpers.expectElementVisible('[data-testid="step-2-completed"]');

    // 9. Test document version history
    await page.click('[data-testid="document-history-button"]');
    await helpers.expectElementVisible('[data-testid="version-history-panel"]');
    
    // Should show at least 2 versions (initial and edited)
    await expect(page.locator('[data-testid="version-item"]')).toHaveCount(2);
  });

  test('AI functionality integration test', async ({ page }) => {
    // Login as admin and create project
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('AI Integration Test Project');

    // Navigate to workflow step 1
    await helpers.navigateToWorkflowStep(1);

    // Test AI chat functionality
    await helpers.sendAIMessage('웹툰 플랫폼을 기획하고 싶습니다.');
    
    // Verify AI response appears
    await helpers.expectElementVisible('[data-testid="ai-response"]');
    
    // Test document generation
    await helpers.generateDocument();
    
    // Verify document was generated
    await helpers.expectElementVisible('[data-testid="document-editor"]');
    
    // Test AI conflict detection
    await helpers.editDocument('# 웹툰 플랫폼 기획\n\n기본적인 웹툰 플랫폼을 만들고자 합니다.');
    
    // Create another document in step 2 to test conflicts
    await helpers.navigateToWorkflowStep(2);
    await helpers.editDocument('# 시장 분석\n\n웹툰 시장은 매우 경쟁이 치열합니다.');
    await helpers.requestApproval();
    await helpers.approveDocument();
    
    // Go back to step 1 and check for conflicts
    await helpers.navigateToWorkflowStep(1);
    await helpers.checkConflicts();
    
    // Verify conflict analysis appears
    await helpers.expectElementVisible('[data-testid="conflict-analysis-panel"]');
    
    // Test AI streaming response
    await helpers.sendAIMessage('더 자세한 기획안을 작성해주세요.');
    
    // Verify streaming indicator appears
    await helpers.expectElementVisible('[data-testid="ai-typing-indicator"]');
  });

  test('Document approval workflow edge cases', async ({ page }) => {
    // Setup: Admin creates project and adds members
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('Approval Test Project');
    await helpers.addProjectMember(TEST_USERS.planner1.email, '콘텐츠기획');

    // Test 1: Non-member cannot access project
    await helpers.logout();
    await helpers.login(TEST_USERS.designer); // Not added as member
    
    await page.goto(`/ai-pm/${projectId}`);
    
    // Should be redirected or show access denied
    await helpers.expectElementVisible('[data-testid="access-denied"]');

    // Test 2: Member can create private document
    await helpers.logout();
    await helpers.login(TEST_USERS.planner1);
    
    await page.goto(`/ai-pm/${projectId}/workflow/1`);
    await helpers.editDocument('# Private Document\n\nThis is a private document.');
    
    // Document should be in private status
    await helpers.expectTextContent('[data-testid="document-status"]', '비공개');

    // Test 3: Other members cannot see private documents
    await helpers.logout();
    await helpers.login(TEST_USERS.admin);
    
    await page.goto(`/ai-pm/${projectId}/workflow/1`);
    
    // Should not see the private document content
    await helpers.expectElementNotVisible('[data-testid="document-editor"]');

    // Test 4: Approval request workflow
    await helpers.logout();
    await helpers.login(TEST_USERS.planner1);
    
    await page.goto(`/ai-pm/${projectId}/workflow/1`);
    await helpers.requestApproval();
    
    // Test 5: Admin can approve documents
    await helpers.logout();
    await helpers.login(TEST_USERS.admin);
    
    await page.goto(`/ai-pm/${projectId}/workflow/1`);
    await helpers.approveDocument();
    
    // Document should now be official
    await helpers.expectTextContent('[data-testid="document-status"]', '승인됨');
  });
});