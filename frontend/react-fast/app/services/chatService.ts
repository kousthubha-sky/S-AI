// frontend/react-fast/app/services/chatService.ts
// REPLACE ENTIRE FILE with image support

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ImageData {
  url: string;
  type: string;
  width?: number;
  height?: number;
  alt_text?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  images?: ImageData[];  // ✅ NEW: Images field
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
      
      // ✅ Ensure images are properly parsed
      return (messages || []).map((msg: any) => ({
        ...msg,
        images: this.parseImages(msg.images)
      }));
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

  // ✅ UPDATED: Save message with optional images
  static async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    model: string,
    tokens?: number,
    images?: ImageData[],  // ✅ NEW: Optional images parameter
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
            tokens,
            images: images || []  // ✅ Include images in save
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

  // ✅ NEW: Helper to parse images from database
  private static parseImages(images: any): ImageData[] | undefined {
    if (!images) return undefined;
    
    try {
      // If it's already an array, return it
      if (Array.isArray(images)) {
        return images;
      }
      
      // If it's a string, try to parse it as JSON
      if (typeof images === 'string') {
        return JSON.parse(images);
      }
      
      return undefined;
    } catch (error) {
      console.error('Failed to parse images:', error);
      return undefined;
    }
  }

  // ✅ NEW: Get session statistics including image count
  static async getSessionStats(
    sessionId: string,
    fetchWithAuth: FetchWithAuth
  ): Promise<{
    messageCount: number;
    imageCount: number;
    lastActivity: string;
  } | null> {
    try {
      const messages = await this.getChatMessages(sessionId, fetchWithAuth);
      
      const imageCount = messages.reduce((count, msg) => {
        return count + (msg.images?.length || 0);
      }, 0);

      return {
        messageCount: messages.length,
        imageCount,
        lastActivity: messages.length > 0 
          ? messages[messages.length - 1].created_at 
          : new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get session stats:', error);
      return null;
    }
  }

  // ✅ NEW: Get all images from a session
  static async getSessionImages(
    sessionId: string,
    fetchWithAuth: FetchWithAuth
  ): Promise<ImageData[]> {
    try {
      const messages = await this.getChatMessages(sessionId, fetchWithAuth);
      
      const allImages: ImageData[] = [];
      messages.forEach(msg => {
        if (msg.images && msg.images.length > 0) {
          allImages.push(...msg.images);
        }
      });

      return allImages;
    } catch (error) {
      console.error('Failed to get session images:', error);
      return [];
    }
  }

  // ✅ NEW: Export chat with images
  static async exportChatWithImages(
    sessionId: string,
    fetchWithAuth: FetchWithAuth
  ): Promise<string> {
    try {
      const messages = await this.getChatMessages(sessionId, fetchWithAuth);
      
      let exportContent = '# Chat Export\n\n';
      
      messages.forEach((msg, index) => {
        exportContent += `## Message ${index + 1} (${msg.role})\n`;
        exportContent += `${msg.content}\n\n`;
        
        if (msg.images && msg.images.length > 0) {
          exportContent += `### Generated Images (${msg.images.length})\n`;
          msg.images.forEach((img, imgIndex) => {
            exportContent += `![Image ${imgIndex + 1}](${img.url})\n`;
          });
          exportContent += '\n';
        }
      });

      return exportContent;
    } catch (error) {
      console.error('Failed to export chat:', error);
      throw error;
    }
  }
}