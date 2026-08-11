import { Locator, Page, expect } from '@playwright/test';
import { scopeE2EProjectName } from '../setup/test-setup';

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
    await this.page.getByPlaceholder('이메일').fill(user.email);
    await this.page.getByPlaceholder('비밀번호').fill(user.password);
    await this.page.getByRole('button', { name: '로그인' }).click();
    
    // Wait for successful login redirect
    await this.page.waitForURL('/', { timeout: 10000 });
  }

  async logout() {
    const userMenu = this.page.getByRole('button', { name: '사용자 메뉴' });
    await userMenu.hover();
    await this.page.getByRole('button', { name: '로그아웃' }).click();
    await this.page.waitForURL(/\/login|\/landing/);
  }

  async navigateToAIPM() {
    await this.page.goto('/ai-pm');
    await this.page.waitForLoadState('networkidle');
  }

  async createProject(name: string, description: string = '') {
    const scopedName = scopeE2EProjectName(name);
    await this.navigateToAIPM();
    await this.page.getByRole('button', { name: /새 프로젝트/ }).first().click();
    
    // Fill project form
    await this.page.getByLabel('프로젝트 이름').fill(scopedName);
    if (description) {
      await this.page.getByLabel('프로젝트 설명').fill(description);
    }
    
    await this.page.getByRole('button', { name: '프로젝트 생성' }).click();
    
    // Wait for project to be created and redirected
    await this.page.waitForURL(/\/ai-pm\/[^\/]+$/);
    
    // Extract project ID from URL
    const url = this.page.url();
    const projectId = url.match(/\/ai-pm\/([^/]+)/)?.[1];
    if (!projectId) throw new Error(`Project creation did not navigate to a project: ${url}`);
    return projectId;
  }

  async addProjectMember(email: string, role: string) {
    const membersTab = this.page.getByRole('button', { name: '멤버 관리' });
    if (await membersTab.count() > 0) await membersTab.click();
    await this.page.getByRole('button', { name: '멤버 추가' }).click();
    await this.page.getByLabel('사용자 선택').click();
    await this.page.getByText(email, { exact: true }).click();
    await this.page.getByLabel('역할').click();
    await this.page.getByText(role, { exact: true }).click();
    await this.page.getByRole('button', { name: '멤버 추가', exact: true }).last().click();
    
    // Wait for member to be added
    await expect(this.page.getByText(email, { exact: true })).toBeVisible();
  }

  async navigateToWorkflowStep(step: number) {
    await this.page.getByRole('link', { name: new RegExp(`^${step}\\.`) }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async sendAIMessage(message: string) {
    await this.page.getByPlaceholder('Type your message...').fill(message);
    await this.page.getByRole('button', { name: 'Send message' }).click();
    
    // Wait for AI response
    await this.page.locator('[data-testid="ai-response"]').last().waitFor({ timeout: 30000 });
  }

  async generateDocument() {
    await this.page.getByRole('button', { name: /새 문서/ }).click();
    
    // Wait for document to be generated
    await this.page.locator('[data-testid="document-editor"]').waitFor({ timeout: 30000 });
  }

  async editDocument(content: string) {
    // Clear existing content and add new content
    const editor = this.page.getByLabel('문서 내용');
    if (await editor.count() === 0) {
      await this.page.getByRole('button', { name: '편집', exact: true }).click();
    }
    await editor.fill(content);
    
    // Save document
    await this.page.getByRole('button', { name: /완료|저장/ }).click();
    
    // Wait for save confirmation
    await expect(this.page.getByText(/저장됨|문서 저장 완료/).first()).toBeVisible();
  }

  async requestApproval() {
    await this.setDocumentStatus('pending_approval', '승인 요청');
    
    // Wait for approval request confirmation
    await expect(this.page.getByText('승인 대기', { exact: true }).first()).toBeVisible();
  }

  async approveDocument() {
    await this.setDocumentStatus('official', '공식 문서');
    
    // Wait for approval confirmation
    await expect(this.page.getByText('공식 문서', { exact: true }).first()).toBeVisible();
  }

  async checkConflicts() {
    await this.page.getByRole('button', { name: /충돌 분석/ }).click();
    
    // Wait for conflict analysis
    await this.page.locator('[data-testid="conflict-analysis-panel"]').waitFor({ timeout: 30000 });
  }

  private async setDocumentStatus(value: string, optionLabel: string) {
    const nativeSelect = this.page.locator('select').filter({
      has: this.page.locator(`option[value="${value}"]`),
    });
    if (await nativeSelect.count() > 0) {
      await nativeSelect.first().selectOption(value);
      return;
    }

    const statusButton = this.page.getByRole('button', { name: /개인 문서|승인 대기|공식 문서/ }).first();
    await statusButton.click();
    await this.page.getByText(optionLabel, { exact: true }).last().click();
  }

  async waitForToast(message: string) {
    await expect(this.page.getByRole('alert')).toContainText(message);
  }

  async expectElementVisible(target: Locator | string) {
    await expect(typeof target === 'string' ? this.page.locator(target) : target).toBeVisible();
  }

  async expectElementNotVisible(target: Locator | string) {
    await expect(typeof target === 'string' ? this.page.locator(target) : target).not.toBeVisible();
  }

  async expectTextContent(target: Locator | string, text: string | RegExp) {
    await expect(typeof target === 'string' ? this.page.locator(target) : target).toContainText(text);
  }
}

export async function setupTestData(page: Page) {
  void page;
  const { setupTestUsers } = await import('../setup/test-setup');
  await setupTestUsers();
}

export async function cleanupTestData(page: Page) {
  void page;
  const { cleanupTestData: cleanup } = await import('../setup/test-setup');
  await cleanup();
}
