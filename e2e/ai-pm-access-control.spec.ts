import { test, expect } from '@playwright/test';
import { TestHelpers, TEST_USERS, setupTestData, cleanupTestData } from './utils/test-helpers';

test.describe('AI PM Access Control and Permissions', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await setupTestData(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page);
  });

  test('Admin access control', async ({ page }) => {
    // Admin login
    await helpers.login(TEST_USERS.admin);
    
    // Admin should see all projects
    await helpers.navigateToAIPM();
    await helpers.expectElementVisible('[data-testid="create-project-button"]');
    
    // Create a project
    const projectId = await helpers.createProject('Admin Test Project');
    
    // Admin should have full access to project management
    await helpers.expectElementVisible('[data-testid="add-member-button"]');
    await helpers.expectElementVisible('[data-testid="project-settings-button"]');
    
    // Add a member
    await helpers.addProjectMember(TEST_USERS.planner1.email, '콘텐츠기획');
    
    // Admin should be able to access all workflow steps
    for (let step = 1; step <= 9; step++) {
      await helpers.navigateToWorkflowStep(step);
      await helpers.expectElementVisible('[data-testid="document-editor"]');
    }
    
    // Admin should be able to approve documents
    await helpers.navigateToWorkflowStep(1);
    await helpers.editDocument('# Test Document\n\nAdmin created document.');
    await helpers.requestApproval();
    await helpers.approveDocument();
    
    // Admin should see all project activities
    await page.goto(`/ai-pm/${projectId}`);
    await helpers.expectElementVisible('[data-testid="activity-feed"]');
  });

  test('Regular user access control', async ({ page }) => {
    // Setup: Admin creates project and adds user
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('User Access Test');
    await helpers.addProjectMember(TEST_USERS.planner1.email, '콘텐츠기획');
    await helpers.logout();
    
    // Regular user login
    await helpers.login(TEST_USERS.planner1);
    
    // User should only see projects they're a member of
    await helpers.navigateToAIPM();
    await helpers.expectElementNotVisible('[data-testid="create-project-button"]');
    
    // User should see the project they're a member of
    await helpers.expectElementVisible(`[data-testid="project-${projectId}"]`);
    
    // Navigate to project
    await page.goto(`/ai-pm/${projectId}`);
    
    // User should not see admin functions
    await helpers.expectElementNotVisible('[data-testid="add-member-button"]');
    await helpers.expectElementNotVisible('[data-testid="project-settings-button"]');
    
    // User should be able to work on documents
    await helpers.navigateToWorkflowStep(1);
    await helpers.editDocument('# User Document\n\nRegular user created document.');
    
    // User can request approval but cannot approve their own documents
    await helpers.requestApproval();
    await helpers.expectElementNotVisible('[data-testid="approve-document-button"]');
  });

  test('Non-member access denial', async ({ page }) => {
    // Setup: Admin creates project without adding the test user
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('Private Project');
    await helpers.logout();
    
    // Non-member tries to access project
    await helpers.login(TEST_USERS.planner1);
    
    // Direct URL access should be denied
    await page.goto(`/ai-pm/${projectId}`);
    await helpers.expectElementVisible('[data-testid="access-denied"]');
    
    // Project should not appear in project list
    await helpers.navigateToAIPM();
    await helpers.expectElementNotVisible(`[data-testid="project-${projectId}"]`);
    
    // Workflow steps should be inaccessible
    await page.goto(`/ai-pm/${projectId}/workflow/1`);
    await helpers.expectElementVisible('[data-testid="access-denied"]');
  });

  test('Role-based document access', async ({ page }) => {
    // Setup: Admin creates project and adds members with different roles
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('Role Test Project');
    await helpers.addProjectMember(TEST_USERS.planner1.email, '콘텐츠기획');
    await helpers.addProjectMember(TEST_USERS.planner2.email, '서비스기획');
    await helpers.logout();
    
    // Content planner creates a private document
    await helpers.login(TEST_USERS.planner1);
    await page.goto(`/ai-pm/${projectId}/workflow/1`);
    await helpers.editDocument('# Private Content Plan\n\nThis is a private document.');
    
    // Document should be private (not approved)
    await helpers.expectTextContent('[data-testid="document-status"]', '비공개');
    await helpers.logout();
    
    // Service planner should not see the private document
    await helpers.login(TEST_USERS.planner2);
    await page.goto(`/ai-pm/${projectId}/workflow/1`);
    await helpers.expectElementNotVisible('[data-testid="document-content"]');
    await helpers.logout();
    
    // Admin should see all documents
    await helpers.login(TEST_USERS.admin);
    await page.goto(`/ai-pm/${projectId}/workflow/1`);
    await helpers.expectElementVisible('[data-testid="document-content"]');
    
    // Admin approves the document
    await helpers.approveDocument();
    await helpers.logout();
    
    // Now service planner should see the approved document
    await helpers.login(TEST_USERS.planner2);
    await page.goto(`/ai-pm/${projectId}/workflow/1`);
    await helpers.expectElementVisible('[data-testid="document-content"]');
    await helpers.expectTextContent('[data-testid="document-status"]', '승인됨');
  });

  test('Session management and security', async ({ page }) => {
    // Login as user
    await helpers.login(TEST_USERS.planner1);
    
    // Verify user is logged in
    await helpers.expectElementVisible('[data-testid="user-menu"]');
    
    // Simulate session expiry by clearing cookies
    await page.context().clearCookies();
    
    // Try to access AI PM - should redirect to login
    await helpers.navigateToAIPM();
    await page.waitForURL('/login');
    
    // Login again
    await helpers.login(TEST_USERS.planner1);
    
    // Test logout functionality
    await helpers.logout();
    await page.waitForURL('/login');
    
    // Verify cannot access protected routes after logout
    await page.goto('/ai-pm');
    await page.waitForURL('/login');
  });

  test('API endpoint access control', async ({ page }) => {
    // Setup: Create project as admin
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('API Test Project');
    await helpers.logout();
    
    // Test API access without authentication
    const response = await page.request.get(`/api/ai-pm/projects/${projectId}`);
    expect(response.status()).toBe(401);
    
    // Login as non-member
    await helpers.login(TEST_USERS.planner1);
    
    // Test API access as non-member
    const nonMemberResponse = await page.request.get(`/api/ai-pm/projects/${projectId}`);
    expect(nonMemberResponse.status()).toBe(403);
    
    await helpers.logout();
    
    // Login as admin
    await helpers.login(TEST_USERS.admin);
    
    // Test API access as admin
    const adminResponse = await page.request.get(`/api/ai-pm/projects/${projectId}`);
    expect(adminResponse.status()).toBe(200);
    
    // Add user as member
    await page.goto(`/ai-pm/${projectId}`);
    await helpers.addProjectMember(TEST_USERS.planner1.email, '콘텐츠기획');
    await helpers.logout();
    
    // Login as member
    await helpers.login(TEST_USERS.planner1);
    
    // Test API access as member
    const memberResponse = await page.request.get(`/api/ai-pm/projects/${projectId}`);
    expect(memberResponse.status()).toBe(200);
  });

  test('Document version access control', async ({ page }) => {
    // Setup: Admin creates project and document
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('Version Control Test');
    await helpers.addProjectMember(TEST_USERS.planner1.email, '콘텐츠기획');
    
    // Create and approve a document
    await helpers.navigateToWorkflowStep(1);
    await helpers.editDocument('# Version 1\n\nFirst version of the document.');
    await helpers.requestApproval();
    await helpers.approveDocument();
    
    // Create a new version
    await helpers.editDocument('# Version 2\n\nSecond version of the document.');
    await helpers.requestApproval();
    await helpers.approveDocument();
    
    await helpers.logout();
    
    // Member should see version history
    await helpers.login(TEST_USERS.planner1);
    await page.goto(`/ai-pm/${projectId}/workflow/1`);
    
    await page.click('[data-testid="document-history-button"]');
    await helpers.expectElementVisible('[data-testid="version-history-panel"]');
    
    // Should see both versions
    await expect(page.locator('[data-testid="version-item"]')).toHaveCount(2);
    
    // Should be able to view previous versions
    await page.click('[data-testid="view-version-1"]');
    await helpers.expectTextContent('[data-testid="version-content"]', 'First version');
    
    await helpers.logout();
    
    // Non-member should not access version history
    await helpers.login(TEST_USERS.designer);
    
    const versionResponse = await page.request.get(`/api/ai-pm/documents/${projectId}/versions`);
    expect(versionResponse.status()).toBe(403);
  });

  test('Bulk permission operations', async ({ page }) => {
    // Admin creates project
    await helpers.login(TEST_USERS.admin);
    const projectId = await helpers.createProject('Bulk Operations Test');
    
    // Add multiple members
    await helpers.addProjectMember(TEST_USERS.planner1.email, '콘텐츠기획');
    await helpers.addProjectMember(TEST_USERS.planner2.email, '서비스기획');
    await helpers.addProjectMember(TEST_USERS.designer.email, 'UIUX기획');
    
    // Verify all members were added
    await helpers.expectElementVisible(`[data-testid="member-${TEST_USERS.planner1.email}"]`);
    await helpers.expectElementVisible(`[data-testid="member-${TEST_USERS.planner2.email}"]`);
    await helpers.expectElementVisible(`[data-testid="member-${TEST_USERS.designer.email}"]`);
    
    // Test bulk role change (if implemented)
    await page.click('[data-testid="bulk-actions-button"]');
    await page.selectOption('[data-testid="bulk-role-select"]', '개발자');
    await page.click('[data-testid="apply-bulk-changes"]');
    
    // Verify roles were changed
    await helpers.expectTextContent(`[data-testid="member-role-${TEST_USERS.planner1.email}"]`, '개발자');
    await helpers.expectTextContent(`[data-testid="member-role-${TEST_USERS.planner2.email}"]`, '개발자');
    await helpers.expectTextContent(`[data-testid="member-role-${TEST_USERS.designer.email}"]`, '개발자');
    
    // Test bulk member removal
    await page.click('[data-testid="select-all-members"]');
    await page.click('[data-testid="bulk-remove-members"]');
    await page.click('[data-testid="confirm-bulk-remove"]');
    
    // Verify members were removed
    await helpers.expectElementNotVisible(`[data-testid="member-${TEST_USERS.planner1.email}"]`);
    await helpers.expectElementNotVisible(`[data-testid="member-${TEST_USERS.planner2.email}"]`);
    await helpers.expectElementNotVisible(`[data-testid="member-${TEST_USERS.designer.email}"]`);
  });
});