/**
 * @jest-environment node
 */

import { generateReport, LOW_COST_MODEL, summarizeContent } from '../ai';

const mockGroqCreate = jest.fn();

jest.mock('groq-sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockGroqCreate } },
  })),
}));

describe('report-generator AI models', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GROQ_API_KEY = 'test-key';
    mockGroqCreate.mockResolvedValue({ choices: [{ message: { content: 'generated' } }] });
  });

  it('uses the current low-cost model for summarization', async () => {
    await expect(summarizeContent('source text')).resolves.toBe('generated');

    expect(mockGroqCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: LOW_COST_MODEL,
      max_tokens: 3500,
    }));
  });

  it('keeps the larger model for HTML report generation', async () => {
    await expect(generateReport('summary', 'prompt')).resolves.toBe('generated');

    expect(mockGroqCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'openai/gpt-oss-120b',
      max_tokens: 4500,
    }));
  });
});
