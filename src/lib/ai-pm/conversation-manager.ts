import { SupabaseClient } from '@supabase/supabase-js';
import {
  AIChatMessage,
  AIConversation,
  WorkflowStep,
  AIpmError,
  AIpmErrorType
} from '@/types/ai-pm';

export interface ConversationManagerConfig {
  maxMessagesPerConversation?: number;
  autoSaveInterval?: number;
}

// Define a global symbol to store our manager instances
const CONVERSATION_MANAGER_SYMBOL = Symbol.for('app.ai-pm.conversationManager');

// Augment the NodeJS.Global interface to include our symbol
declare global {
  namespace NodeJS {
    interface Global {
      [CONVERSATION_MANAGER_SYMBOL]?: Map<string, ConversationManager>;
    }
  }
}

function getManagerInstances(): Map<string, ConversationManager> {
  if (!global[CONVERSATION_MANAGER_SYMBOL]) {
    global[CONVERSATION_MANAGER_SYMBOL] = new Map<string, ConversationManager>();
  }
  return global[CONVERSATION_MANAGER_SYMBOL]!;
}


export class ConversationManager {
  private supabase: SupabaseClient;
  private config: Required<ConversationManagerConfig>;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private pendingMessages: Map<string, AIChatMessage[]> = new Map();

  constructor(supabaseClient: SupabaseClient, config: ConversationManagerConfig = {}) {
    this.supabase = supabaseClient;
    this.config = {
      maxMessagesPerConversation: config.maxMessagesPerConversation || 100,
      autoSaveInterval: config.autoSaveInterval || 30000, // 30 seconds
    };
  }

  // NOTE: All other methods of ConversationManager like `loadConversation`, `addMessage`, etc.
  // should be included here. They are omitted for brevity in this example,
  // but they must be present in the actual file.

  async loadConversation(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string
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
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) return null;

      const messages: AIChatMessage[] = Array.isArray(data.messages)
        ? data.messages.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp) }))
        : [];

      return { ...data, messages };
    } catch (error) {
      console.error('Error loading conversation:', error);
      throw this.handleDatabaseError(error);
    }
  }

  async addMessage(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string,
    message: AIChatMessage
  ): Promise<void> {
    const conversationKey = `${projectId}-${workflowStep}-${userId}`;
    if (!this.pendingMessages.has(conversationKey)) {
        this.pendingMessages.set(conversationKey, []);
    }
    this.pendingMessages.get(conversationKey)!.push({
        ...message,
        timestamp: new Date()
    });
  }

  async getCurrentMessages(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string
  ): Promise<AIChatMessage[]> {
    const conversation = await this.loadConversation(projectId, workflowStep, userId);
    return conversation?.messages || [];
  }

  async forceSave(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string
  ): Promise<void> {
    const conversationKey = `${projectId}-${workflowStep}-${userId}`;
    const messagesToSave = this.pendingMessages.get(conversationKey);
    if (!messagesToSave || messagesToSave.length === 0) return;

    const conversation = await this.loadConversation(projectId, workflowStep, userId);
    const existingMessages = conversation?.messages || [];
    const updatedMessages = [...existingMessages, ...messagesToSave].slice(-this.config.maxMessagesPerConversation);

    const { error } = await this.supabase
      .from('ai_conversations')
      .upsert({
        project_id: projectId,
        workflow_step: workflowStep,
        user_id: userId,
        messages: updatedMessages,
        updated_at: new Date().toISOString()
      }, { onConflict: 'project_id, workflow_step, user_id' });

    if (error) {
        throw this.handleDatabaseError(error);
    }
    this.pendingMessages.delete(conversationKey);
  }

  async updateConversationMessages(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string,
    messages: AIChatMessage[]
  ): Promise<void> {
    const updatedMessages = messages.slice(-this.config.maxMessagesPerConversation);

    const { error } = await this.supabase
      .from('ai_conversations')
      .upsert({
        project_id: projectId,
        workflow_step: workflowStep,
        user_id: userId,
        messages: updatedMessages,
        updated_at: new Date().toISOString()
      }, { onConflict: 'project_id, workflow_step, user_id' });

    if (error) {
        throw this.handleDatabaseError(error);
    }
    // Clear any pending messages for this conversation as we have just overwritten them
    this.pendingMessages.delete(`${projectId}-${workflowStep}-${userId}`);
  }

  async clearConversation(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string
    ): Promise<void> {
    try {
        const { error } = await this.supabase
            .from('ai_conversations')
            .delete()
            .eq('project_id', projectId)
            .eq('workflow_step', workflowStep)
            .eq('user_id', userId);

        if (error) throw error;
    } catch(error) {
        console.error('Error clearing conversation:', error);
        throw this.handleDatabaseError(error);
    }
  }

  private handleDatabaseError(error: any): AIpmError {
    console.error("Database operation failed:", error);
    return {
      error: AIpmErrorType.DATABASE_ERROR,
      message: "A database error occurred.",
      details: error.message,
    };
  }
}


export function getConversationManager(supabaseClient: SupabaseClient): ConversationManager {
  const managerInstances = getManagerInstances();
  const instanceKey = supabaseClient.supabaseUrl;

  if (!managerInstances.has(instanceKey)) {
    console.log(`Creating new ConversationManager instance for ${instanceKey}`);
    managerInstances.set(instanceKey, new ConversationManager(supabaseClient));
  }
  
  return managerInstances.get(instanceKey)!;
}
