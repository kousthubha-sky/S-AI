// services/chatService.ts - REPLACE ENTIRE FILE

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// Type for the fetchWithAuth function
type FetchWithAuth = (url: string, options?: RequestInit) => Promise<any>;

export class ChatService {
  static async getUserChatSessions(
    userId: string,
    fetchWithAuth: FetchWithAuth
  ): Promise<ChatSession[]> {
    try {
      const sessions = await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/api/chat/sessions`
      );
      return sessions || [];
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error);
      return [];
    }
  }

  static async getChatMessages(
    sessionId: string,
    fetchWithAuth: FetchWithAuth
  ): Promise<ChatMessage[]> {
    try {
      const messages = await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/api/chat/sessions/${sessionId}/messages`
      );
      return messages || [];
    } catch (error) {
      console.error('Failed to fetch chat messages:', error);
      return [];
    }
  }

  static async deleteChatSession(
    sessionId: string,
    fetchWithAuth: FetchWithAuth
  ): Promise<void> {
    try {
      await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/api/chat/sessions/${sessionId}`,
        {
          method: 'DELETE',
        }
      );
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      throw error;
    }
  }

  static async createChatSession(
    title: string,
    fetchWithAuth: FetchWithAuth
  ): Promise<ChatSession> {
    try {
      const session = await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/api/chat/sessions`,
        {
          method: 'POST',
          body: JSON.stringify({ title }),
        }
      );
      return session;
    } catch (error) {
      console.error('Failed to create chat session:', error);
      throw error;
    }
  }
  static async saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  model: string,
  tokens?: number,
  fetchWithAuth?: FetchWithAuth
): Promise<void> {
  if (!fetchWithAuth) {
    console.error('fetchWithAuth is required but not provided');
    return;
  }
  
  try {
    await fetchWithAuth(
      `${import.meta.env.VITE_API_BASE_URL}/api/chat/sessions/${sessionId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          role,
          content,
          model,
          tokens
        }),
      }
    );
  } catch (error) {
    console.error('Failed to save message:', error);
    throw error;
  }
}

static async updateSessionTitle(
  sessionId: string,
  title: string,
  fetchWithAuth: FetchWithAuth
): Promise<void> {
  try {
    await fetchWithAuth(
      `${import.meta.env.VITE_API_BASE_URL}/api/chat/sessions/${sessionId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }
    );
  } catch (error) {
    console.error('Failed to update session title:', error);
    throw error;
  }
}
}
