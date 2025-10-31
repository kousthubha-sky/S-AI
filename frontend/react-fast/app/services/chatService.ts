// services/chatService.ts
import apiClient from '../../api'
import type { ChatSession, ChatMessage } from '~/lib/database.types'

export class ChatService {
  static async createChatSession(userId: string, title: string = 'New Chat'): Promise<ChatSession> {
    try {
      const response = await apiClient.post('/api/chat/sessions', {
        title,
        user_id: userId
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create chat session: ${error.message}`);
    }
  }

  static async getUserChatSessions(userId: string): Promise<ChatSession[]> {
    try {
      const response = await apiClient.get('/api/chat/sessions');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      return [];
    }
  }

  static async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const response = await apiClient.get(`/api/chat/sessions/${sessionId}/messages`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
  }

  static async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    modelUsed?: string,
    tokensUsed?: number
  ): Promise<ChatMessage> {
    try {
      const response = await apiClient.post(`/api/chat/sessions/${sessionId}/messages`, {
        role,
        content,
        model_used: modelUsed,
        tokens_used: tokensUsed
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to save message: ${error.message}`);
    }
  }

  static async deleteChatSession(sessionId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/chat/sessions/${sessionId}`);
    } catch (error: any) {
      throw new Error(`Failed to delete chat session: ${error.message}`);
    }
  }

  static async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    try {
      await apiClient.patch(`/api/chat/sessions/${sessionId}`, {
        title,
        updated_at: new Date().toISOString()
      });
    } catch (error: any) {
      throw new Error(`Failed to update session title: ${error.message}`);
    }
  }
}