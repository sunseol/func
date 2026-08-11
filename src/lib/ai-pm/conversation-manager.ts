import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AIChatMessage,
  AIConversation,
  AIpmError,
  WorkflowStep,
} from '@/types/ai-pm';
import { AIpmErrorType } from '@/types/ai-pm';

type ConversationManagerStore = WeakMap<SupabaseClient, ConversationManager>;
const managerInstances: ConversationManagerStore = new WeakMap();

type MessageInput = Pick<AIChatMessage, 'role' | 'content'> &
  Partial<Pick<AIChatMessage, 'id' | 'timestamp'>>;
type UserMessageInput = MessageInput & { readonly role: 'user' };
type AssistantMessageInput = MessageInput & { readonly role: 'assistant' };
type ConversationPair = readonly [UserMessageInput, AssistantMessageInput];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWorkflowStep(value: unknown): value is WorkflowStep {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 9;
}

function parseMessage(value: unknown): AIChatMessage | null {
  if (!isRecord(value)) return null;
  const { id, role, content, timestamp } = value;
  if (
    typeof id !== 'string' ||
    (role !== 'user' && role !== 'assistant') ||
    typeof content !== 'string' ||
    (typeof timestamp !== 'string' && !(timestamp instanceof Date))
  ) {
    return null;
  }
  return { id, role, content, timestamp: new Date(timestamp) };
}

function parseConversation(value: unknown): AIConversation | null {
  if (!isRecord(value)) return null;
  const { id, project_id, workflow_step, user_id, messages, created_at, updated_at } = value;
  if (
    typeof id !== 'string' ||
    typeof project_id !== 'string' ||
    !isWorkflowStep(workflow_step) ||
    typeof user_id !== 'string' ||
    !Array.isArray(messages) ||
    typeof created_at !== 'string' ||
    typeof updated_at !== 'string'
  ) {
    return null;
  }
  const parsedMessages = messages.map(parseMessage);
  if (parsedMessages.some((message) => message === null)) return null;
  const validMessages = parsedMessages.filter((message): message is AIChatMessage => message !== null);
  return {
    id,
    project_id,
    workflow_step,
    user_id,
    messages: validMessages,
    created_at,
    updated_at,
  };
}

function parseRpcConversation(value: unknown): AIConversation {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Conversation append RPC returned no conversation row');
  }
  const conversation = parseConversation(value[0]);
  if (!conversation) {
    throw new Error('Conversation append RPC returned an invalid conversation row');
  }
  return conversation;
}

function createMessageId(): string {
  const randomUuid = globalThis.crypto?.randomUUID;
  return typeof randomUuid === 'function'
    ? randomUuid.call(globalThis.crypto)
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeMessage(message: MessageInput): AIChatMessage {
  return {
    id: message.id ?? createMessageId(),
    role: message.role,
    content: message.content,
    timestamp: (message.timestamp ? new Date(message.timestamp) : new Date()).toISOString(),
  };
}

export class ConversationManager {
  private readonly supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async loadConversation(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string,
  ): Promise<AIConversation | null> {
    try {
      const { data, error } = await this.supabase
        .from('ai_conversations')
        .select('*')
        .eq('project_id', projectId)
        .eq('workflow_step', workflowStep)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      const conversation = parseConversation(data);
      if (data !== null && !conversation) {
        throw new Error('Conversation row contains invalid history');
      }
      return conversation;
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  async appendMessages(
    projectId: string,
    workflowStep: WorkflowStep,
    messages: ConversationPair,
  ): Promise<AIConversation> {
    if (messages.length !== 2 || messages[0].role !== 'user' || messages[1].role !== 'assistant') {
      throw this.handleDatabaseError(new Error('Conversation append requires a user/assistant pair'));
    }
    const normalizedMessages = messages.map(normalizeMessage);
    try {
      const { data, error } = await this.supabase.rpc('append_ai_conversation_messages', {
        p_project_id: projectId,
        p_workflow_step: workflowStep,
        p_messages: normalizedMessages,
      });
      if (error) throw error;
      return parseRpcConversation(data);
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  async getCurrentMessages(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string,
  ): Promise<AIChatMessage[]> {
    const conversation = await this.loadConversation(projectId, workflowStep, userId);
    return conversation?.messages ?? [];
  }

  async clearConversation(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_conversations')
        .delete()
        .eq('project_id', projectId)
        .eq('workflow_step', workflowStep)
        .eq('user_id', userId);
      if (error) throw error;
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  private handleDatabaseError(error: unknown): AIpmError {
    const details = isRecord(error) && typeof error.message === 'string' ? error.message : undefined;
    return {
      error: AIpmErrorType.DATABASE_ERROR,
      message: 'A database error occurred.',
      ...(details ? { details } : {}),
    };
  }
}

export function getConversationManager(supabaseClient: SupabaseClient): ConversationManager {
  const existing = managerInstances.get(supabaseClient);
  if (existing) return existing;
  const created = new ConversationManager(supabaseClient);
  managerInstances.set(supabaseClient, created);
  return created;
}
