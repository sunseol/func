import { expect, type Page } from '@playwright/test';
import { scopeE2EProjectName } from '../setup/test-setup';

export type TestUser = Readonly<{
  email: string;
  password: string;
  role: 'admin' | 'user';
  name: string;
}>;

export const TEST_USERS = {
  admin: { email: 'admin@test.com', password: 'testpassword123', role: 'admin', name: 'Test Admin' },
  planner1: { email: 'planner1@test.com', password: 'testpassword123', role: 'user', name: 'Content Planner' },
  planner2: { email: 'planner2@test.com', password: 'testpassword123', role: 'user', name: 'Service Planner' },
  designer: { email: 'designer@test.com', password: 'testpassword123', role: 'user', name: 'UI/UX Designer' },
} as const satisfies Record<string, TestUser>;

export class TestHelpers {
  public constructor(private readonly page: Page) {}

  public async login(user: TestUser): Promise<void> {
    await this.page.goto('/login');
    await this.page.getByLabel('이메일').fill(user.email);
    await this.page.getByLabel('비밀번호').fill(user.password);
    await this.page.getByRole('button', { name: '로그인' }).click();
    await this.page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 });
  }

  public async logout(): Promise<void> {
    await this.page.getByRole('button', { name: '사용자 메뉴' }).click();
    await this.page.getByRole('button', { name: '로그아웃' }).click();
    await this.page.waitForURL((url) => url.pathname === '/landing', { timeout: 15_000 });
  }

  public async navigateToAIPM(): Promise<void> {
    await this.page.goto('/ai-pm');
    await this.page.waitForLoadState('domcontentloaded');
  }

  public async createProject(name: string, description = ''): Promise<string> {
    await this.navigateToAIPM();
    await this.page.getByRole('button', { name: '새 프로젝트' }).first().click();
    await this.page.getByLabel('프로젝트 이름').fill(scopeE2EProjectName(name));
    if (description) await this.page.getByLabel('프로젝트 설명').fill(description);
    await this.page.getByRole('button', { name: '프로젝트 생성' }).click();
    await this.page.waitForURL(/\/ai-pm\/[^/]+$/);
    const projectId = new URL(this.page.url()).pathname.split('/').at(-1);
    if (!projectId) throw new Error('Project creation did not navigate to a project');
    return projectId;
  }

  public async navigateToWorkflowStep(step: number): Promise<void> {
    await this.page.getByTestId(`workflow-step-${step}`).click();
    await this.page.waitForURL(new RegExp(`/workflow/${step}$`));
  }

  public async expectVisible(target: string): Promise<void> {
    await expect(this.page.locator(target)).toBeVisible();
  }

  public async expectText(target: string, text: string | RegExp): Promise<void> {
    await expect(this.page.locator(target)).toContainText(text);
  }
}

export async function setupTestData(): Promise<void> {
  const { setupTestUsers } = await import('../setup/test-setup');
  await setupTestUsers();
}

export async function cleanupTestData(): Promise<void> {
  const { cleanupTestData: cleanup } = await import('../setup/test-setup');
  await cleanup();
}
