import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'user';
  name: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: 'admin@test.com',
    password: 'testpassword123',
    role: 'admin',
    name: 'Test Admin'
  },
  planner1: {
    email: 'planner1@test.com',
    password: 'testpassword123',
    role: 'user',
    name: 'Content Planner'
  },
  planner2: {
    email: 'planner2@test.com',
    password: 'testpassword123',
    role: 'user',
    name: 'Service Planner'
  },
  designer: {
    email: 'designer@test.com',
    password: 'testpassword123',
    role: 'user',
    name: 'UI/UX Designer'
  }
};

export class TestHelpers {
  constructor(private page: Page) {}

  async login(user: TestUser) {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for successful login redirect
    await this.page.waitForURL('/', { timeout: 10000 });
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('/login');
  }

  async navigateToAIPM() {
    await this.page.goto('/ai-pm');
    await this.page.waitForLoadState('networkidle');
  }

  async createProject(name: string, description: string = '') {
    await this.navigateToAIPM();
    await this.page.click('[data-testid="create-project-button"]');
    
    // Fill project form
    await this.page.fill('[data-testid="project-name-input"]', name);
    if (description) {
      await this.page.fill('[data-testid="project-description-input"]', description);
    }
    
    await this.page.click('[data-testid="save-project-button"]');
    
    // Wait for project to be created and redirected
    await this.page.waitForURL(/\/ai-pm\/[^\/]+$/);
    
    // Extract project ID from URL
    const url = this.page.url();
    const projectId = url.split('/ai-pm/')[1];
    return projectId;
  }

  async addProjectMember(email: string, role: string) {
    await this.page.click('[data-testid="add-member-button"]');
    await this.page.fill('[data-testid="member-email-input"]', email);
    await this.page.selectOption('[data-testid="member-role-select"]', role);
    await this.page.click('[data-testid="confirm-add-member-button"]');
    
    // Wait for member to be added
    await expect(this.page.locator(`[data-testid="member-${email}"]`)).toBeVisible();
  }

  async navigateToWorkflowStep(step: number) {
    await this.page.click(`[data-testid="workflow-step-${step}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async sendAIMessage(message: string) {
    await this.page.fill('[data-testid="ai-chat-input"]', message);
    await this.page.click('[data-testid="send-message-button"]');
    
    // Wait for AI response
    await this.page.waitForSelector('[data-testid="ai-response"]', { timeout: 30000 });
  }

  async generateDocument() {
    await this.page.click('[data-testid="generate-document-button"]');
    
    // Wait for document to be generated
    await this.page.waitForSelector('[data-testid="document-editor"]', { timeout: 30000 });
  }

  async editDocument(content: string) {
    // Clear existing content and add new content
    await this.page.click('[data-testid="document-editor"]');
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.type(content);
    
    // Save document
    await this.page.click('[data-testid="save-document-button"]');
    
    // Wait for save confirmation
    await expect(this.page.locator('[data-testid="save-status"]')).toContainText('저장됨');
  }

  async requestApproval() {
    await this.page.click('[data-testid="request-approval-button"]');
    
    // Wait for approval request confirmation
    await expect(this.page.locator('[data-testid="document-status"]')).toContainText('승인 대기');
  }

  async approveDocument() {
    await this.page.click('[data-testid="approve-document-button"]');
    
    // Wait for approval confirmation
    await expect(this.page.locator('[data-testid="document-status"]')).toContainText('승인됨');
  }

  async checkConflicts() {
    await this.page.click('[data-testid="check-conflicts-button"]');
    
    // Wait for conflict analysis
    await this.page.waitForSelector('[data-testid="conflict-analysis-panel"]', { timeout: 30000 });
  }

  async waitForToast(message: string) {
    await expect(this.page.locator('[data-testid="toast-message"]')).toContainText(message);
  }

  async expectElementVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectElementNotVisible(selector: string) {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }

  async expectTextContent(selector: string, text: string) {
    await expect(this.page.locator(selector)).toContainText(text);
  }
}

export async function setupTestData(page: Page) {
  // ES 모듈 문제 해결을 위해 임시로 주석 처리
  // const { setupTestUsers } = await import('../setup/test-setup');
  // await setupTestUsers();
  console.log('Test data setup skipped for now');
}

export async function cleanupTestData(page: Page) {
  const { cleanupTestData: cleanup } = await import('../setup/test-setup');
  await cleanup();
}