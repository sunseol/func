/**
 * @jest-environment node
 */

import { AIService, getAIService } from '../ai-service';
import { AIpmErrorType, WorkflowStep } from '@/types/ai-pm';

const mockCreate = jest.fn();

jest.mock('groq-sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

jest.mock('@/lib/security/promptInjection', () => ({
  validateAiPmPrompt: jest.fn(() => ({ isSecure: true, riskLevel: 'low' })),
  logSecurityEvent: jest.fn(),
  securePromptTemplate: jest.fn((template: string) => template),
}));

describe('AIService', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('generates a response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Hello from AI' } }],
    });

    const service = new AIService({ apiKey: 'test-key' });
    const result = await service.generateResponse([], 1 as WorkflowStep);

    expect(result).toBe('Hello from AI');
  });

  it('handles rate limit errors', async () => {
    mockCreate.mockRejectedValue({ status: 429 });

    const service = new AIService({ apiKey: 'test-key' });
    await expect(service.generateResponse([], 1 as WorkflowStep)).rejects.toMatchObject({
      error: AIpmErrorType.RATE_LIMITED,
      message: expect.stringContaining('rate limit'),
    });
  });

  it('handles empty response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const service = new AIService({ apiKey: 'test-key' });
    await expect(service.generateResponse([], 1 as WorkflowStep)).rejects.toMatchObject({
      error: AIpmErrorType.AI_SERVICE_ERROR,
      message: 'AI response was empty',
    });
  });

  it('generates document content', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '# Document' } }],
    });

    const service = new AIService({ apiKey: 'test-key' });
    const result = await service.generateDocument([], 2 as WorkflowStep);

    expect(result).toBe('# Document');
  });

  it('analyzes conflicts', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"hasConflicts":false}' } }],
    });

    const service = new AIService({ apiKey: 'test-key' });
    const result = await service.analyzeConflicts('doc', [], 3 as WorkflowStep);

    expect(result).toContain('hasConflicts');
  });

  it('throws when API key is missing', () => {
    delete process.env.GROQ_API_KEY;
    expect(() => getAIService()).toThrow('GROQ API key is not configured');
  });
});
