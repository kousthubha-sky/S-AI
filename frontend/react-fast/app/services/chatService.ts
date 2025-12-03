// frontend/react-fast/app/services/chatService.ts
// FIXED VERSION WITH PROPER TYPING

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ImageData {
  url: string;
  type: string;
  width?: number;
  height?: number;
  alt_text?: string;
}

// ✅ UPDATED: Added optional github_files field
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  images?: ImageData[];
  github_files?: Array<{
    repo: string;
    path: string;
    name: string;
  }>;
}

// Type for message metadata
export interface MessageMetadata {
  github_files?: Array<{
    repo: string;
    path: string;
    name: string;
  }>;
  [key: string]: any;
}

// Type for the fetchWithAuth function
export type FetchWithAuth = (url: string, options?: RequestInit) => Promise<any>;

// Streaming callbacks interface
export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (usage?: any, images?: ImageData[]) => void;
  onError: (error: string) => void;
}

export class ChatService {
  // ✅ PUBLIC: Get user chat sessions
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

  // ✅ PUBLIC: Get chat messages
  static async getChatMessages(
    sessionId: string,
    fetchWithAuth: FetchWithAuth
  ): Promise<ChatMessage[]> {
    try {
      const messages = await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/api/chat/sessions/${sessionId}/messages`
      );
      
      // ✅ Use parseMessageData which handles both images and metadata
      return (messages || []).map((msg: any) => this.parseMessageData(msg));
    } catch (error) {
      console.error('Failed to fetch chat messages:', error);
      return [];
    }
  }

  // ✅ PUBLIC: Delete chat session
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

  // ✅ PUBLIC: Create chat session
  static async createChatSession(
    title: string,
    fetchWithAuth: FetchWithAuth
  ): Promise<ChatSession> {
    try {
      const response = await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/api/chat/sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title }),
        }
      );
      return response;
    } catch (error) {
      console.error('Failed to create chat session:', error);
      throw error;
    }
  }

  // ✅ PUBLIC: Save message with optional images and metadata
  static async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    model: string,
    tokens?: number,
    images?: ImageData[],
    fetchWithAuth?: FetchWithAuth,
    metadata?: MessageMetadata
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
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role,
            content,
            model,
            tokens,
            images: images || [],
            metadata: metadata || {}
          }),
        }
      );
    } catch (error) {
      console.error('Failed to save message:', error);
      throw error;
    }
  }

  // ✅ PUBLIC: Update session title
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
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title }),
        }
      );
    } catch (error) {
      console.error('Failed to update session title:', error);
      throw error;
    }
  }

  // ✅ PUBLIC: Streaming chat method
  static async streamChat(
    messages: Array<{ role: string; content: string }>,
    model: string,
    temperature: number = 0.7,
    maxTokens: number = 1000,
    thinking: boolean = false,
    onToken: (token: string) => void,
    onComplete: (usage?: any, images?: ImageData[]) => void,
    onError: (error: string) => void,
    getAuthToken: () => Promise<string>
  ): Promise<() => void> {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages,
          model,
          temperature,
          max_tokens: maxTokens,
          thinking
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';
      let isDone = false;

      const readStream = async () => {
        try {
          while (!isDone) {
            const { done, value } = await reader.read();

            if (done) {
              isDone = true;
              onComplete();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // Keep the last incomplete line in buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);

                if (data === '[DONE]') {
                  isDone = true;
                  onComplete();
                  break;
                }

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.type === 'content' && parsed.content) {
                    onToken(parsed.content);
                  } else if (parsed.type === 'usage') {
                    // Usage data will be handled in onComplete
                  // Note: We no longer truncate responses - users get full content
                  } else if (parsed.type === 'done') {
                    isDone = true;
                    onComplete();
                    break;
                  } else if (parsed.type === 'error') {
                    throw new Error(parsed.error);
                  }
                } catch (parseError) {
                  // Skip invalid JSON
                  console.warn('Failed to parse SSE data:', data);
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream reading error:', error);
          onError(error instanceof Error ? error.message : 'Unknown streaming error');
        }
      };

      readStream();

      // Return cleanup function
      return () => {
        isDone = true;
        reader.cancel();
      };

    } catch (error) {
      console.error('Failed to start streaming chat:', error);
      onError(error instanceof Error ? error.message : 'Failed to start streaming');
      return () => {}; // Return empty cleanup function
    }
  }

  // ✅ PUBLIC: Get session statistics including image count
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

  // ✅ PUBLIC: Get all images from a session
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

  // ✅ PUBLIC: Export chat with images
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

  // ✅ PRIVATE: Helper to parse message data from database
  private static parseMessageData(message: any): ChatMessage {
    try {
      const parsed: ChatMessage = {
        id: message.id,
        role: message.role,
        content: message.content,
        created_at: message.created_at
      };

      // Parse images
      if (message.images) {
        if (Array.isArray(message.images)) {
          parsed.images = message.images;
        } else if (typeof message.images === 'string') {
          parsed.images = JSON.parse(message.images);
        }
      }

      // Parse metadata for github_files
      if (message.metadata) {
        let metadata: MessageMetadata;
        if (typeof message.metadata === 'string') {
          metadata = JSON.parse(message.metadata);
        } else {
          metadata = message.metadata;
        }

        if (metadata.github_files) {
          parsed.github_files = metadata.github_files;
        }
      }

      return parsed;
    } catch (error) {
      console.error('Failed to parse message data:', error);
      return {
        id: message.id,
        role: message.role,
        content: message.content,
        created_at: message.created_at
      };
    }
  }
}