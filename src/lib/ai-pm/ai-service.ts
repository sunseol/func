import Groq from 'groq-sdk';
import { AIChatMessage, WorkflowStep, AIpmError, AIpmErrorType } from '@/types/ai-pm';
import { validateAiPmPrompt, logSecurityEvent, securePromptTemplate } from '@/lib/security/promptInjection';

const STEP_GUIDANCE: Record<WorkflowStep, string> = {
  1: 'Define the product concept: mission, target users, problem, value proposition, differentiation, next steps.',
  2: 'Define core features and user journeys. Prioritize MVP vs later scope.',
  3: 'Define the technical approach: architecture, data model, integrations, risks.',
  4: 'Define the development plan: milestones, scope, resources, risks.',
  5: 'Define QA strategy: test plan, cases, automation, acceptance criteria.',
  6: 'Define release plan: environments, CI/CD, observability.',
  7: 'Define operations plan: monitoring, incident response, support.',
  8: 'Define marketing plan: positioning, channels, launch plan, metrics.',
  9: 'Define business plan: pricing, revenue model, go-to-market, KPIs.',
};

const DOCUMENT_SECTIONS: Record<WorkflowStep, string[]> = {
  1: ['Overview', 'Target users', 'Problem', 'Value proposition', 'Key features', 'Risks', 'Next steps'],
  2: ['User journeys', 'Feature list', 'MVP scope', 'Out of scope', 'Dependencies'],
  3: ['Architecture', 'Data model', 'Integrations', 'Security', 'Risks'],
  4: ['Milestones', 'Timeline', 'Resources', 'Risks', 'Delivery plan'],
  5: ['Test scope', 'Test cases', 'Automation', 'Acceptance criteria'],
  6: ['Environments', 'Release steps', 'CI/CD', 'Monitoring'],
  7: ['Operational checklist', 'Alerts', 'Support flows', 'SLOs'],
  8: ['Positioning', 'Channels', 'Launch plan', 'Metrics'],
  9: ['Pricing', 'Revenue model', 'Go-to-market', 'KPIs'],
};

export interface AIServiceConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamingResponse {
  content: string;
  isComplete: boolean;
  error?: string;
}

export class AIService {
  private groq: Groq;
  private config: Required<AIServiceConfig>;

  constructor(config: AIServiceConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'meta-llama/llama-4-maverick-17b-128e-instruct',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096,
    };

    this.groq = new Groq({ apiKey: this.config.apiKey });
  }

  async generateResponse(messages: AIChatMessage[], workflowStep: WorkflowStep, projectContext?: string): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(workflowStep, projectContext);
      const groqMessages = this.convertToGroqMessages(messages, systemPrompt);

      const completion = await this.groq.chat.completions.create({
        messages: groqMessages,
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('AI response was empty');
      }

      return response;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw this.handleAIError(error);
    }
  }

  async *generateStreamingResponse(
    messages: AIChatMessage[],
    workflowStep: WorkflowStep,
    projectContext?: string,
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    try {
      const systemPrompt = this.buildSystemPrompt(workflowStep, projectContext);
      const groqMessages = this.convertToGroqMessages(messages, systemPrompt);

      const stream = await this.groq.chat.completions.create({
        messages: groqMessages,
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullContent += content;

        yield {
          content: fullContent,
          isComplete: false,
        };
      }

      yield {
        content: fullContent,
        isComplete: true,
      };
    } catch (error) {
      console.error('AI Streaming Error:', error);
      yield {
        content: '',
        isComplete: true,
        error: this.handleAIError(error).message,
      };
    }
  }

  async generateDocument(
    messages: AIChatMessage[],
    workflowStep: WorkflowStep,
    projectContext?: string,
    userId?: string,
  ): Promise<string> {
    try {
      const combinedUserInput = messages
        .filter((msg) => msg.role === 'user')
        .map((msg) => msg.content)
        .join(' ');

      const securityResult = validateAiPmPrompt(combinedUserInput, 'document_generation');
      if (!securityResult.isSecure) {
        logSecurityEvent(userId || 'anonymous', combinedUserInput, securityResult, 'document_generation');
        if (securityResult.riskLevel === 'critical') {
          throw new Error('Prompt rejected due to security risk');
        }
      }

      if (projectContext) {
        const contextSecurityResult = validateAiPmPrompt(projectContext, 'document_generation');
        if (!contextSecurityResult.isSecure) {
          projectContext = contextSecurityResult.sanitizedInput;
        }
      }

      const documentPrompt = this.buildDocumentPrompt(workflowStep);

      const systemPrompt = securePromptTemplate(
        `{{basePrompt}}

{{documentPrompt}}

Write a structured planning document for step {{workflowStep}}. Use markdown.`,
        {
          basePrompt: this.buildSystemPrompt(workflowStep, projectContext),
          documentPrompt,
          workflowStep: workflowStep.toString(),
        },
      );

      const sanitizedMessages = messages.map((message) => {
        if (message.role !== 'user') return message;
        const messageSecurityResult = validateAiPmPrompt(message.content, 'document_generation');
        if (messageSecurityResult.isSecure) return message;
        return {
          ...message,
          content: messageSecurityResult.sanitizedInput || message.content,
        };
      });

      const groqMessages = this.convertToGroqMessages(sanitizedMessages, systemPrompt);

      const completion = await this.groq.chat.completions.create({
        messages: groqMessages,
        model: this.config.model,
        temperature: 0.5,
        max_tokens: this.config.maxTokens,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('Document generation returned empty response');
      }

      const responseSecurityResult = validateAiPmPrompt(response, 'document_generation');
      if (!responseSecurityResult.isSecure) {
        return responseSecurityResult.sanitizedInput;
      }

      return response;
    } catch (error) {
      console.error('Document Generation Error:', error);
      throw this.handleAIError(error);
    }
  }

  async analyzeConflicts(
    currentDocument: string,
    officialDocuments: Array<{ step: WorkflowStep; content: string }>,
    workflowStep: WorkflowStep,
  ): Promise<string> {
    try {
      const conflictPrompt = `You are an AI project planner. Compare the current document to existing official documents and return JSON with conflicts.

Current step: ${workflowStep}
Current document:
${currentDocument}

Official documents:
${officialDocuments
  .map((doc) => `[Step ${doc.step}]\n${doc.content}`)
  .join('\n\n')}

Return JSON:
{
  "hasConflicts": boolean,
  "conflictLevel": "none" | "minor" | "major" | "critical",
  "conflicts": [
    {"type": "content" | "requirement" | "design" | "technical", "description": "...", "conflictingDocument": "...", "severity": "low" | "medium" | "high", "suggestion": "..."}
  ],
  "recommendations": ["..."],
  "summary": "..."
}`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: conflictPrompt }],
        model: this.config.model,
        temperature: 0.3,
        max_tokens: this.config.maxTokens,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('Conflict analysis returned empty response');
      }

      return response;
    } catch (error) {
      console.error('Conflict Analysis Error:', error);
      throw this.handleAIError(error);
    }
  }

  private buildSystemPrompt(workflowStep: WorkflowStep, projectContext?: string): string {
    const basePrompt = [
      'You are an AI product manager. Be concise, structured, and actionable.',
      `Step ${workflowStep}: ${STEP_GUIDANCE[workflowStep]}`,
    ];

    if (projectContext) {
      basePrompt.push(`Project context:\n${projectContext}`);
    }

    return basePrompt.join('\n');
  }

  private buildDocumentPrompt(workflowStep: WorkflowStep): string {
    const sections = DOCUMENT_SECTIONS[workflowStep] || [];
    return `Document structure: ${sections.join(', ')}`;
  }

  private convertToGroqMessages(messages: AIChatMessage[], systemPrompt: string) {
    return [
      { role: 'system', content: systemPrompt },
      ...messages.map((message) => ({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content,
      })),
    ];
  }

  private handleAIError(error: any): AIpmError {
    if (error.status === 429) {
      return {
        error: AIpmErrorType.RATE_LIMITED,
        message: 'AI rate limit exceeded. Try again later.',
        details: error,
      };
    }

    if (error.status === 401) {
      return {
        error: AIpmErrorType.UNAUTHORIZED,
        message: 'AI authentication failed.',
        details: error,
      };
    }

    if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
      return {
        error: AIpmErrorType.AI_SERVICE_ERROR,
        message: 'AI request timed out. Try again later.',
        details: error,
      };
    }

    return {
      error: AIpmErrorType.AI_SERVICE_ERROR,
      message: error.message || 'AI service error.',
      details: error,
    };
  }
}

let defaultAIService: { apiKey: string; instance: AIService } | null = null;

export function getAIService(): AIService {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    defaultAIService = null;
    throw new Error('GROQ API key is not configured');
  }

  if (!defaultAIService || defaultAIService.apiKey !== apiKey) {
    defaultAIService = { apiKey, instance: new AIService({ apiKey }) };
  }

  return defaultAIService.instance;
}

export function createAIService(config: AIServiceConfig): AIService {
  return new AIService(config);
}
