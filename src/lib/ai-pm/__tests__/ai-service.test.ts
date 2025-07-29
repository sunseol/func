import { AIService, getAIService, createAIService } from '../ai-service';
import { AIChatMessage, WorkflowStep, AIpmErrorType } from '@/types/ai-pm';

// Mock GROQ SDK
const mockGroqCompletion = {
  choices: [
    {
      message: {
        content: 'AI generated response'
      }
    }
  ]
};

const mockGroqStream = {
  async *[Symbol.asyncIterator]() {
    yield {
      choices: [
        {
          delta: {
            content: 'AI '
          }
        }
      ]
    };
    yield {
      choices: [
        {
          delta: {
            content: 'generated '
          }
        }
      ]
    };
    yield {
      choices: [
        {
          delta: {
            content: 'response'
          }
        }
      ]
    };
  }
};

const mockGroq = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => mockGroq);
});

// Mock security modules
jest.mock('@/lib/security/promptInjection', () => ({
  validateAiPmPrompt: jest.fn(() => ({
    isSecure: true,
    riskLevel: 'low',
    sanitizedInput: 'sanitized input'
  })),
  logSecurityEvent: jest.fn(),
  securePromptTemplate: jest.fn((template, vars) => template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || ''))
}));

jest.mock('@/lib/security/secretsManager', () => ({
  DataSanitizer: {
    sanitizeForLogging: jest.fn((data) => data)
  }
}));

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    jest.clearAllMocks();
    aiService = new AIService({
      apiKey: 'test-api-key',
      model: 'test-model',
      temperature: 0.7,
      maxTokens: 1000
    });
    mockGroq.chat.completions.create.mockResolvedValue(mockGroqCompletion);
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      const config = {
        apiKey: 'test-key',
        model: 'custom-model',
        temperature: 0.5,
        maxTokens: 2000
      };

      const service = new AIService(config);
      expect(service).toBeInstanceOf(AIService);
    });

    it('should use default values for optional config', () => {
      const service = new AIService({ apiKey: 'test-key' });
      expect(service).toBeInstanceOf(AIService);
    });
  });

  describe('generateResponse', () => {
    const mockMessages: AIChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      }
    ];

    it('should generate AI response successfully', async () => {
      const response = await aiService.generateResponse(mockMessages, 1);

      expect(response).toBe('AI generated response');
      expect(mockGroq.chat.completions.create).toHaveBeenCalledWith({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Test message' })
        ]),
        model: 'test-model',
        temperature: 0.7,
        max_tokens: 1000
      });
    });

    it('should include project context when provided', async () => {
      const projectContext = 'Project: Test Platform';
      await aiService.generateResponse(mockMessages, 1, projectContext);

      expect(mockGroq.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining(projectContext)
            })
          ])
        })
      );
    });

    it('should handle different workflow steps', async () => {
      await aiService.generateResponse(mockMessages, 2);

      expect(mockGroq.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('2단계')
            })
          ])
        })
      );
    });

    it('should handle API errors', async () => {
      mockGroq.chat.completions.create.mockRejectedValue(new Error('API Error'));

      await expect(aiService.generateResponse(mockMessages, 1))
        .rejects
        .toMatchObject({
          error: AIpmErrorType.AI_SERVICE_ERROR,
          message: 'API Error'
        });
    });

    it('should handle rate limiting errors', async () => {
      mockGroq.chat.completions.create.mockRejectedValue({ status: 429 });

      await expect(aiService.generateResponse(mockMessages, 1))
        .rejects
        .toMatchObject({
          error: AIpmErrorType.RATE_LIMITED,
          message: expect.stringContaining('요청 한도를 초과')
        });
    });

    it('should handle authentication errors', async () => {
      mockGroq.chat.completions.create.mockRejectedValue({ status: 401 });

      await expect(aiService.generateResponse(mockMessages, 1))
        .rejects
        .toMatchObject({
          error: AIpmErrorType.UNAUTHORIZED,
          message: expect.stringContaining('인증에 실패')
        });
    });

    it('should handle empty AI response', async () => {
      mockGroq.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }]
      });

      await expect(aiService.generateResponse(mockMessages, 1))
        .rejects
        .toThrow('AI 서비스에서 응답을 받지 못했습니다.');
    });
  });

  describe('generateStreamingResponse', () => {
    const mockMessages: AIChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      }
    ];

    it('should generate streaming response successfully', async () => {
      mockGroq.chat.completions.create.mockResolvedValue(mockGroqStream);

      const generator = aiService.generateStreamingResponse(mockMessages, 1);
      const responses = [];

      for await (const response of generator) {
        responses.push(response);
      }

      expect(responses).toHaveLength(4); // 3 chunks + final
      expect(responses[0]).toEqual({
        content: 'AI ',
        isComplete: false
      });
      expect(responses[1]).toEqual({
        content: 'AI generated ',
        isComplete: false
      });
      expect(responses[2]).toEqual({
        content: 'AI generated response',
        isComplete: false
      });
      expect(responses[3]).toEqual({
        content: 'AI generated response',
        isComplete: true
      });
    });

    it('should handle streaming errors', async () => {
      mockGroq.chat.completions.create.mockRejectedValue(new Error('Streaming error'));

      const generator = aiService.generateStreamingResponse(mockMessages, 1);
      const responses = [];

      for await (const response of generator) {
        responses.push(response);
      }

      expect(responses).toHaveLength(1);
      expect(responses[0]).toEqual({
        content: '',
        isComplete: true,
        error: 'Streaming error'
      });
    });
  });

  describe('generateDocument', () => {
    const mockMessages: AIChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Generate a document',
        timestamp: new Date()
      }
    ];

    it('should generate document successfully', async () => {
      const mockDocumentResponse = {
        choices: [
          {
            message: {
              content: '# Generated Document\n\nThis is a generated document.'
            }
          }
        ]
      };

      mockGroq.chat.completions.create.mockResolvedValue(mockDocumentResponse);

      const document = await aiService.generateDocument(mockMessages, 1);

      expect(document).toBe('# Generated Document\n\nThis is a generated document.');
      expect(mockGroq.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5 // Lower temperature for document generation
        })
      );
    });

    it('should handle security validation', async () => {
      const { validateAiPmPrompt } = require('@/lib/security/promptInjection');
      validateAiPmPrompt.mockReturnValue({
        isSecure: false,
        riskLevel: 'critical',
        sanitizedInput: 'sanitized input'
      });

      await expect(aiService.generateDocument(mockMessages, 1))
        .rejects
        .toThrow('입력에서 보안 위험이 감지되었습니다');
    });

    it('should sanitize project context when security risk detected', async () => {
      const { validateAiPmPrompt } = require('@/lib/security/promptInjection');
      validateAiPmPrompt
        .mockReturnValueOnce({ isSecure: true, riskLevel: 'low' }) // For user input
        .mockReturnValueOnce({ isSecure: false, riskLevel: 'medium', sanitizedInput: 'sanitized context' }); // For project context

      mockGroq.chat.completions.create.mockResolvedValue(mockGroqCompletion);

      await aiService.generateDocument(mockMessages, 1, 'risky project context', 'user-123');

      expect(mockGroq.chat.completions.create).toHaveBeenCalled();
    });

    it('should handle document generation errors', async () => {
      mockGroq.chat.completions.create.mockRejectedValue(new Error('Document generation failed'));

      await expect(aiService.generateDocument(mockMessages, 1))
        .rejects
        .toMatchObject({
          error: AIpmErrorType.AI_SERVICE_ERROR,
          message: 'Document generation failed'
        });
    });
  });

  describe('analyzeConflicts', () => {
    const currentDocument = '# Current Document\n\nThis is the current document.';
    const officialDocuments = [
      { step: 1 as WorkflowStep, content: '# Step 1 Document\n\nStep 1 content.' },
      { step: 2 as WorkflowStep, content: '# Step 2 Document\n\nStep 2 content.' }
    ];

    it('should analyze conflicts successfully', async () => {
      const mockConflictResponse = {
        choices: [
          {
            message: {
              content: '# 충돌 분석 결과\n\n충돌이 발견되지 않았습니다.'
            }
          }
        ]
      };

      mockGroq.chat.completions.create.mockResolvedValue(mockConflictResponse);

      const analysis = await aiService.analyzeConflicts(currentDocument, officialDocuments, 3);

      expect(analysis).toBe('# 충돌 분석 결과\n\n충돌이 발견되지 않았습니다.');
      expect(mockGroq.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3, // Lower temperature for analytical response
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('현재 문서:')
            })
          ])
        })
      );
    });

    it('should handle conflict analysis errors', async () => {
      mockGroq.chat.completions.create.mockRejectedValue(new Error('Conflict analysis failed'));

      await expect(aiService.analyzeConflicts(currentDocument, officialDocuments, 3))
        .rejects
        .toMatchObject({
          error: AIpmErrorType.AI_SERVICE_ERROR,
          message: 'Conflict analysis failed'
        });
    });

    it('should handle empty conflict analysis response', async () => {
      mockGroq.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }]
      });

      await expect(aiService.analyzeConflicts(currentDocument, officialDocuments, 3))
        .rejects
        .toThrow('충돌 분석 중 AI 서비스에서 응답을 받지 못했습니다.');
    });
  });

  describe('utility functions', () => {
    describe('getAIService', () => {
      beforeEach(() => {
        // Reset the module to clear the singleton
        jest.resetModules();
      });

      it('should return singleton AI service instance', () => {
        process.env.NEXT_PUBLIC_GROQ_API_KEY = 'test-api-key';
        
        const service1 = getAIService();
        const service2 = getAIService();

        expect(service1).toBe(service2);
      });

      it('should throw error when API key is not configured', () => {
        delete process.env.NEXT_PUBLIC_GROQ_API_KEY;

        expect(() => getAIService()).toThrow('GROQ API key is not configured');
      });
    });

    describe('createAIService', () => {
      it('should create new AI service instance', () => {
        const config = { apiKey: 'test-key' };
        const service = createAIService(config);

        expect(service).toBeInstanceOf(AIService);
      });
    });
  });

  describe('error handling', () => {
    it('should handle timeout errors', async () => {
      mockGroq.chat.completions.create.mockRejectedValue({
        message: 'timeout',
        code: 'ECONNABORTED'
      });

      const mockMessages: AIChatMessage[] = [
        { id: '1', role: 'user', content: 'Test', timestamp: new Date() }
      ];

      await expect(aiService.generateResponse(mockMessages, 1))
        .rejects
        .toMatchObject({
          error: AIpmErrorType.AI_SERVICE_ERROR,
          message: expect.stringContaining('응답 시간이 초과')
        });
    });

    it('should handle unknown errors', async () => {
      mockGroq.chat.completions.create.mockRejectedValue({
        status: 500,
        message: 'Internal server error'
      });

      const mockMessages: AIChatMessage[] = [
        { id: '1', role: 'user', content: 'Test', timestamp: new Date() }
      ];

      await expect(aiService.generateResponse(mockMessages, 1))
        .rejects
        .toMatchObject({
          error: AIpmErrorType.AI_SERVICE_ERROR,
          message: 'Internal server error'
        });
    });
  });

  describe('message conversion', () => {
    it('should convert chat messages to GROQ format correctly', async () => {
      const messages: AIChatMessage[] = [
        { id: '1', role: 'user', content: 'User message', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Assistant message', timestamp: new Date() },
        { id: '3', role: 'user', content: 'Another user message', timestamp: new Date() }
      ];

      await aiService.generateResponse(messages, 1);

      expect(mockGroq.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: 'User message' }),
            expect.objectContaining({ role: 'assistant', content: 'Assistant message' }),
            expect.objectContaining({ role: 'user', content: 'Another user message' })
          ]
        })
      );
    });
  });
});