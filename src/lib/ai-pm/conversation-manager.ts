import { createClient } from '@/lib/supabase/client';
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

export class ConversationManager {
  private supabase = createClient();
  private config: Required<ConversationManagerConfig>;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private pendingMessages: Map<string, AIChatMessage[]> = new Map();

  constructor(config: ConversationManagerConfig = {}) {
    this.config = {
      maxMessagesPerConversation: config.maxMessagesPerConversation || 100,
      autoSaveInterval: config.autoSaveInterval || 30000, // 30 seconds
    };
  }

  /**
   * Load conversation history for a project and workflow step
   */
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

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (!data) {
        return null;
      }

      // Parse messages from JSONB
      const messages: AIChatMessage[] = Array.isArray(data.messages) 
        ? data.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        : [];

      return {
        ...data,
        messages
      };
    } catch (error) {
      console.error('Error loading conversation:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Save conversation to database
   */
  async saveConversation(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string,
    messages: AIChatMessage[]
  ): Promise<AIConversation> {
    try {
      // Limit messages to prevent database bloat
      const limitedMessages = messages.slice(-this.config.maxMessagesPerConversation);
      
      // Convert messages to JSON-serializable format
      const serializedMessages = limitedMessages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString()
      }));

      const conversationData = {
        project_id: projectId,
        workflow_step: workflowStep,
        user_id: userId,
        messages: serializedMessages,
        updated_at: new Date().toISOString()
      };

      // Try to update existing conversation first
      const { data: existingData, error: selectError } = await this.supabase
        .from('ai_conversations')
        .select('id')
        .eq('project_id', projectId)
        .eq('workflow_step', workflowStep)
        .eq('user_id', userId)
        .single();

      let result;
      
      if (existingData && !selectError) {
        // Update existing conversation
        const { data, error } = await this.supabase
          .from('ai_conversations')
          .update(conversationData)
          .eq('id', existingData.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new conversation
        const { data, error } = await this.supabase
          .from('ai_conversations')
          .insert([conversationData])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      // Parse messages back to proper format
      const parsedMessages: AIChatMessage[] = Array.isArray(result.messages)
        ? result.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        : [];

      return {
        ...result,
        messages: parsedMessages
      };
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Add message to conversation and optionally auto-save
   */
  async addMessage(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string,
    message: Omit<AIChatMessage, 'id' | 'timestamp'>
  ): Promise<AIChatMessage> {
    const conversationKey = `${projectId}-${workflowStep}-${userId}`;
    
    // Create new message with ID and timestamp
    const newMessage: AIChatMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      ...message
    };

    // Add to pending messages
    const pendingMessages = this.pendingMessages.get(conversationKey) || [];
    pendingMessages.push(newMessage);
    this.pendingMessages.set(conversationKey, pendingMessages);

    // Schedule auto-save
    this.scheduleAutoSave(projectId, workflowStep, userId);

    return newMessage;
  }

  /**
   * Get current conversation messages (including pending)
   */
  async getCurrentMessages(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string
  ): Promise<AIChatMessage[]> {
    const conversationKey = `${projectId}-${workflowStep}-${userId}`;
    
    // Load saved conversation
    const savedConversation = await this.loadConversation(projectId, workflowStep, userId);
    const savedMessages = savedConversation?.messages || [];
    
    // Get pending messages
    const pendingMessages = this.pendingMessages.get(conversationKey) || [];
    
    // Combine and sort by timestamp
    const allMessages = [...savedMessages, ...pendingMessages];
    allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return allMessages;
  }

  /**
   * Force save pending messages
   */
  async forceSave(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string
  ): Promise<void> {
    const conversationKey = `${projectId}-${workflowStep}-${userId}`;
    const pendingMessages = this.pendingMessages.get(conversationKey);
    
    if (!pendingMessages || pendingMessages.length === 0) {
      return;
    }

    // Get all current messages
    const allMessages = await this.getCurrentMessages(projectId, workflowStep, userId);
    
    // Save to database
    await this.saveConversation(projectId, workflowStep, userId, allMessages);
    
    // Clear pending messages
    this.pendingMessages.delete(conversationKey);
    
    // Clear auto-save timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Clear conversation history
   */
  async clearConversation(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string
  ): Promise<void> {
    try {
      const conversationKey = `${projectId}-${workflowStep}-${userId}`;
      
      // Clear pending messages
      this.pendingMessages.delete(conversationKey);
      
      // Delete from database
      const { error } = await this.supabase
        .from('ai_conversations')
        .delete()
        .eq('project_id', projectId)
        .eq('workflow_step', workflowStep)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error clearing conversation:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string
  ): Promise<{
    messageCount: number;
    lastActivity: Date | null;
    userMessageCount: number;
    assistantMessageCount: number;
  }> {
    const messages = await this.getCurrentMessages(projectId, workflowStep, userId);
    
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const lastActivity = messages.length > 0 
      ? messages[messages.length - 1].timestamp 
      : null;

    return {
      messageCount: messages.length,
      lastActivity,
      userMessageCount: userMessages.length,
      assistantMessageCount: assistantMessages.length
    };
  }

  /**
   * Export conversation as markdown
   */
  async exportConversation(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string
  ): Promise<string> {
    const messages = await this.getCurrentMessages(projectId, workflowStep, userId);
    
    let markdown = `# AI 대화 기록 - ${workflowStep}단계\n\n`;
    markdown += `프로젝트 ID: ${projectId}\n`;
    markdown += `생성일: ${new Date().toLocaleString('ko-KR')}\n\n`;
    markdown += '---\n\n';

    messages.forEach((message, index) => {
      const role = message.role === 'user' ? '사용자' : 'AI 어시스턴트';
      const timestamp = message.timestamp.toLocaleString('ko-KR');
      
      markdown += `## ${index + 1}. ${role} (${timestamp})\n\n`;
      markdown += `${message.content}\n\n`;
      markdown += '---\n\n';
    });

    return markdown;
  }

  /**
   * Schedule auto-save for pending messages
   */
  private scheduleAutoSave(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string
  ): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(async () => {
      try {
        await this.forceSave(projectId, workflowStep, userId);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, this.config.autoSaveInterval);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle database errors
   */
  private handleDatabaseError(error: any): AIpmError {
    if (error.code === '23503') { // Foreign key violation
      return {
        error: AIpmErrorType.PROJECT_NOT_FOUND,
        message: '프로젝트를 찾을 수 없습니다.',
        details: error
      };
    }

    if (error.code === '42501') { // Insufficient privilege
      return {
        error: AIpmErrorType.UNAUTHORIZED,
        message: '대화 기록에 접근할 권한이 없습니다.',
        details: error
      };
    }

    return {
      error: AIpmErrorType.DATABASE_ERROR,
      message: error.message || '데이터베이스 오류가 발생했습니다.',
      details: error
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    this.pendingMessages.clear();
  }
}

// Default conversation manager instance
let defaultConversationManager: ConversationManager | null = null;

export function getConversationManager(): ConversationManager {
  if (!defaultConversationManager) {
    defaultConversationManager = new ConversationManager();
  }
  return defaultConversationManager;
}

export function createConversationManager(config?: ConversationManagerConfig): ConversationManager {
  return new ConversationManager(config);
}