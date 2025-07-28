import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AIService, createAIService, getAIService } from '../ai-service';
import { AIChatMessage, WorkflowStep } from '@/types/ai-pm';

// Mock Groq SDK
jest.mock('groq-sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

describe('AIService', () => {
  let aiService: AIService;
  let mockGroq: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create AI service instance
    aiService = createAIService({
      apiKey: 'test-api-key',
      model: 'test-model',
      temperature: 0.7,
      maxTokens: 1000
    });

    // Get mock Groq instance
    const Groq = require('groq-sdk').default;
    mockGroq = new Groq();
  });

  describe('generateResponse', () => {
    it('should generate AI response for workflow step 1', async () => {
      // Mock successful API response
      mockGroq.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '안녕하세요! 플랫폼 기획의 1단계인 컨셉 정의를 도와드리겠습니다.'
          }
        }]
      });

      const messages: AIChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: '전자책 플랫폼을 기획하고 싶습니다.',
          timestamp: new Date()
        }
      ];

      const response = await aiService.generateResponse(messages, 1 as WorkflowStep);

      expect(response).toBe('안녕하세요! 플랫폼 기획의 1단계인 컨셉 정의를 도와드리겠습니다.');
      expect(mockGroq.chat.completions.create).toHaveBeenCalledWith({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: '전자책 플랫폼을 기획하고 싶습니다.' })
        ]),
        model: 'test-model',
        temperature: 0.7,
        max_tokens: 1000
      });
    });

    it('should include project context in system prompt', async () => {
      mockGroq.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '프로젝트 컨텍스트를 고려한 응답입니다.'
          }
        }]
      });

      const messages: AIChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: '도움이 필요합니다.',
          timestamp: new Date()
        }
      ];

      const projectContext = '프로젝트명: 테스트 플랫폼\n프로젝트 설명: 테스트용 플랫폼입니다.';

      await aiService.generateResponse(messages, 2 as WorkflowStep, projectContext);

      const callArgs = mockGroq.chat.completions.create.mock.calls[0][0];
      const systemMessage = callArgs.messages.find((msg: any) => msg.role === 'system');
      
      expect(systemMessage.content).toContain(projectContext);
    });

    it('should handle API errors gracefully', async () => {
      mockGroq.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const messages: AIChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: '테스트 메시지',
          timestamp: new Date()
        }
      ];

      await expect(aiService.generateResponse(messages, 1 as WorkflowStep))
        .rejects.toThrow('API Error');
    });

    it('should handle empty AI response', async () => {
      mockGroq.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: null
          }
        }]
      });

      const messages: AIChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: '테스트 메시지',
          timestamp: new Date()
        }
      ];

      await expect(aiService.generateResponse(messages, 1 as WorkflowStep))
        .rejects.toThrow('AI 서비스에서 응답을 받지 못했습니다.');
    });
  });

  describe('generateDocument', () => {
    it('should generate document based on conversation', async () => {
      mockGroq.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '# 플랫폼 기획서\n\n## 개요\n테스트 문서입니다.'
          }
        }]
      });

      const messages: AIChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: '전자책 플랫폼 기획서를 작성해주세요.',
          timestamp: new Date()
        },
        {
          id: 'msg2',
          role: 'assistant',
          content: '네, 전자책 플랫폼 기획을 도와드리겠습니다.',
          timestamp: new Date()
        }
      ];

      const document = await aiService.generateDocument(messages, 1 as WorkflowStep);

      expect(document).toBe('# 플랫폼 기획서\n\n## 개요\n테스트 문서입니다.');
      expect(mockGroq.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5 // Lower temperature for document generation
        })
      );
    });
  });

  describe('analyzeConflicts', () => {
    it('should analyze conflicts between documents', async () => {
      mockGroq.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '충돌 분석 결과: 문서 간 일부 불일치가 발견되었습니다.'
          }
        }]
      });

      const currentDocument = '현재 문서 내용입니다.';
      const officialDocuments = [
        { step: 1 as WorkflowStep, content: '1단계 공식 문서' },
        { step: 2 as WorkflowStep, content: '2단계 공식 문서' }
      ];

      const analysis = await aiService.analyzeConflicts(
        currentDocument,
        officialDocuments,
        3 as WorkflowStep
      );

      expect(analysis).toBe('충돌 분석 결과: 문서 간 일부 불일치가 발견되었습니다.');
      expect(mockGroq.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3 // Lower temperature for analytical response
        })
      );
    });
  });

  describe('generateStreamingResponse', () => {
    it('should generate streaming response', async () => {
      // Mock streaming response
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { choices: [{ delta: { content: '안녕' } }] };
          yield { choices: [{ delta: { content: '하세요!' } }] };
        }
      };

      mockGroq.chat.completions.create.mockResolvedValue(mockStream);

      const messages: AIChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: '안녕하세요',
          timestamp: new Date()
        }
      ];

      const chunks = [];
      for await (const chunk of aiService.generateStreamingResponse(messages, 1 as WorkflowStep)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3); // Two content chunks + final complete chunk
      expect(chunks[0]).toEqual({ content: '안녕', isComplete: false });
      expect(chunks[1]).toEqual({ content: '안녕하세요!', isComplete: false });
      expect(chunks[2]).toEqual({ content: '안녕하세요!', isComplete: true });
    });

    it('should handle streaming errors', async () => {
      mockGroq.chat.completions.create.mockRejectedValue(new Error('Streaming Error'));

      const messages: AIChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: '테스트',
          timestamp: new Date()
        }
      ];

      const chunks = [];
      for await (const chunk of aiService.generateStreamingResponse(messages, 1 as WorkflowStep)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual({
        content: '',
        isComplete: true,
        error: expect.stringContaining('Streaming Error')
      });
    });
  });

  describe('error handling', () => {
    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limited');
      (rateLimitError as any).status = 429;
      
      mockGroq.chat.completions.create.mockRejectedValue(rateLimitError);

      const messages: AIChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: '테스트',
          timestamp: new Date()
        }
      ];

      await expect(aiService.generateResponse(messages, 1 as WorkflowStep))
        .rejects.toMatchObject({
          error: 'RATE_LIMITED',
          message: expect.stringContaining('요청 한도를 초과')
        });
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;
      
      mockGroq.chat.completions.create.mockRejectedValue(authError);

      const messages: AIChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: '테스트',
          timestamp: new Date()
        }
      ];

      await expect(aiService.generateResponse(messages, 1 as WorkflowStep))
        .rejects.toMatchObject({
          error: 'UNAUTHORIZED',
          message: expect.stringContaining('인증에 실패')
        });
    });
  });

  describe('getAIService', () => {
    it('should throw error when API key is not configured', () => {
      // Mock missing environment variable
      const originalEnv = process.env.NEXT_PUBLIC_GROQ_API_KEY;
      delete process.env.NEXT_PUBLIC_GROQ_API_KEY;

      expect(() => getAIService()).toThrow('GROQ API key is not configured');

      // Restore environment variable
      if (originalEnv) {
        process.env.NEXT_PUBLIC_GROQ_API_KEY = originalEnv;
      }
    });

    it('should return singleton instance', () => {
      // Mock environment variable
      process.env.NEXT_PUBLIC_GROQ_API_KEY = 'test-key';

      const service1 = getAIService();
      const service2 = getAIService();

      expect(service1).toBe(service2);
    });
  });
});