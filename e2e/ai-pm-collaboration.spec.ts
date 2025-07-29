import { test, expect } from '@playwright/test';
import { TestHelpers, TEST_USERS, setupTestData, cleanupTestData } from './utils/test-helpers';

test.describe('AI PM Multi-User Collaboration', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await setupTestData(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page);
  });

  test('Multi-user collaboration workflow', async ({ browser }) => {
    // Create multiple browser contexts for different users
    const adminContext = await browser.newContext();
    const planner1Context = await browser.newContext();
    const planner2Context = await browser.newContext();
    const designerContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const planner1Page = await planner1Context.newPage();
    const planner2Page = await planner2Context.newPage();
    const designerPage = await designerContext.newPage();

    const adminHelpers = new TestHelpers(adminPage);
    const planner1Helpers = new TestHelpers(planner1Page);
    const planner2Helpers = new TestHelpers(planner2Page);
    const designerHelpers = new TestHelpers(designerPage);

    try {
      // 1. Admin creates project and adds all members
      await adminHelpers.login(TEST_USERS.admin);
      const projectId = await adminHelpers.createProject('Collaboration Test Project');
      
      await adminHelpers.addProjectMember(TEST_USERS.planner1.email, '콘텐츠기획');
      await adminHelpers.addProjectMember(TEST_USERS.planner2.email, '서비스기획');
      await adminHelpers.addProjectMember(TEST_USERS.designer.email, 'UIUX기획');

      // 2. All users login and navigate to the project
      await planner1Helpers.login(TEST_USERS.planner1);
      await planner1Page.goto(`/ai-pm/${projectId}`);
      
      await planner2Helpers.login(TEST_USERS.planner2);
      await planner2Page.goto(`/ai-pm/${projectId}`);
      
      await designerHelpers.login(TEST_USERS.designer);
      await designerPage.goto(`/ai-pm/${projectId}`);

      // 3. Planner1 works on step 1 (사업 아이디어 정의)
      await planner1Helpers.navigateToWorkflowStep(1);
      await planner1Helpers.sendAIMessage('모바일 게임 플랫폼을 기획하고 싶습니다.');
      await planner1Helpers.generateDocument();
      await planner1Helpers.editDocument(`
# 사업 아이디어 정의

## 핵심 아이디어
모바일 게임 플랫폼 "GameHub"

## 주요 특징
- 인디 게임 개발자 지원
- 소셜 게임 기능
- 크로스 플랫폼 지원
      `);

      // 4. Planner2 simultaneously works on step 2 (시장 조사)
      await planner2Helpers.navigateToWorkflowStep(2);
      await planner2Helpers.sendAIMessage('모바일 게임 시장 현황을 분석해주세요.');
      await planner2Helpers.generateDocument();
      await planner2Helpers.editDocument(`
# 시장 조사 및 경쟁사 분석

## 시장 현황
- 국내 모바일 게임 시장 규모: 5조원
- 주요 트렌드: 하이퍼 캐주얼, 배틀로얄

## 주요 경쟁사
- 넷마블, 엔씨소프트, 컴투스
      `);

      // 5. Designer works on step 6 (UI/UX 설계)
      await designerHelpers.navigateToWorkflowStep(6);
      await designerHelpers.sendAIMessage('게임 플랫폼의 UI/UX를 설계해주세요.');
      await designerHelpers.generateDocument();
      await designerHelpers.editDocument(`
# UI/UX 설계

## 디자인 컨셉
- 게이머 친화적 다크 테마
- 직관적인 네비게이션
- 소셜 기능 강조

## 주요 화면
- 홈 화면: 추천 게임
- 게임 상세: 스크린샷, 리뷰
- 프로필: 게임 기록, 친구
      `);

      // 6. Test real-time collaboration visibility
      // Planner1 requests approval for step 1
      await planner1Helpers.requestApproval();

      // Admin should see the approval request
      await adminPage.goto(`/ai-pm/${projectId}`);
      await adminHelpers.expectElementVisible('[data-testid="pending-approval-notification"]');

      // 7. Admin approves step 1
      await adminPage.goto(`/ai-pm/${projectId}/workflow/1`);
      await adminHelpers.approveDocument();

      // 8. All users should see step 1 as completed
      await planner2Page.reload();
      await planner2Helpers.expectElementVisible('[data-testid="step-1-completed"]');
      
      await designerPage.reload();
      await designerHelpers.expectElementVisible('[data-testid="step-1-completed"]');

      // 9. Test conflict detection across users
      // Planner2 requests approval for step 2
      await planner2Helpers.requestApproval();
      await adminPage.goto(`/ai-pm/${projectId}/workflow/2`);
      await adminHelpers.approveDocument();

      // Designer checks for conflicts with approved documents
      await designerHelpers.checkConflicts();
      await designerHelpers.expectElementVisible('[data-testid="conflict-analysis-panel"]');

      // 10. Test activity tracking
      await adminPage.goto(`/ai-pm/${projectId}`);
      
      // Should show recent activities from all users
      await adminHelpers.expectElementVisible('[data-testid="activity-feed"]');
      await adminHelpers.expectTextContent('[data-testid="activity-feed"]', TEST_USERS.planner1.name);
      await adminHelpers.expectTextContent('[data-testid="activity-feed"]', TEST_USERS.planner2.name);
      await adminHelpers.expectTextContent('[data-testid="activity-feed"]', TEST_USERS.designer.name);

      // 11. Test member role visibility
      // Each user should see other members and their roles
      await planner1Page.goto(`/ai-pm/${projectId}`);
      await planner1Helpers.expectTextContent('[data-testid="member-list"]', '서비스기획');
      await planner1Helpers.expectTextContent('[data-testid="member-list"]', 'UIUX기획');

    } finally {
      // Clean up contexts
      await adminContext.close();
      await planner1Context.close();
      await planner2Context.close();
      await designerContext.close();
    }
  });

  test('Concurrent document editing and conflict resolution', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const helpers1 = new TestHelpers(page1);
    const helpers2 = new TestHelpers(page2);

    try {
      // Setup: Admin creates project
      await helpers1.login(TEST_USERS.admin);
      const projectId = await helpers1.createProject('Concurrent Edit Test');
      await helpers1.addProjectMember(TEST_USERS.planner1.email, '콘텐츠기획');

      // User 1 (Admin) starts editing a document
      await helpers1.navigateToWorkflowStep(1);
      await helpers1.editDocument('# Version 1\n\nAdmin is editing this document.');

      // User 2 (Planner) logs in and tries to edit the same document
      await helpers2.login(TEST_USERS.planner1);
      await page2.goto(`/ai-pm/${projectId}/workflow/1`);

      // Should show that document is being edited by another user
      await helpers2.expectElementVisible('[data-testid="document-locked-warning"]');

      // User 1 saves and requests approval
      await helpers1.requestApproval();

      // User 2 should now be able to see the document but not edit until approved
      await page2.reload();
      await helpers2.expectElementVisible('[data-testid="document-pending-approval"]');

      // Admin approves the document
      await helpers1.approveDocument();

      // User 2 can now see the official document
      await page2.reload();
      await helpers2.expectTextContent('[data-testid="document-content"]', 'Version 1');

    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('Project member management and permissions', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const memberContext = await browser.newContext();
    
    const adminPage = await adminContext.newPage();
    const memberPage = await memberContext.newPage();
    
    const adminHelpers = new TestHelpers(adminPage);
    const memberHelpers = new TestHelpers(memberPage);

    try {
      // Admin creates project
      await adminHelpers.login(TEST_USERS.admin);
      const projectId = await adminHelpers.createProject('Permission Test Project');

      // Add member
      await adminHelpers.addProjectMember(TEST_USERS.planner1.email, '콘텐츠기획');

      // Member logs in and accesses project
      await memberHelpers.login(TEST_USERS.planner1);
      await memberPage.goto(`/ai-pm/${projectId}`);
      
      // Member should see project
      await memberHelpers.expectElementVisible('[data-testid="project-dashboard"]');

      // Admin removes member
      await adminPage.goto(`/ai-pm/${projectId}`);
      await adminPage.click(`[data-testid="remove-member-${TEST_USERS.planner1.email}"]`);
      await adminPage.click('[data-testid="confirm-remove-member"]');

      // Member should no longer have access
      await memberPage.reload();
      await memberHelpers.expectElementVisible('[data-testid="access-denied"]');

      // Re-add member with different role
      await adminHelpers.addProjectMember(TEST_USERS.planner1.email, 'UIUX기획');

      // Member should have access again with new role
      await memberPage.reload();
      await memberHelpers.expectElementVisible('[data-testid="project-dashboard"]');
      await memberHelpers.expectTextContent('[data-testid="user-role"]', 'UIUX기획');

    } finally {
      await adminContext.close();
      await memberContext.close();
    }
  });
});