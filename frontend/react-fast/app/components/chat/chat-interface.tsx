import { useState, useRef, useEffect } from "react"
import { Send, Paperclip, X, Bot, User } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Separator } from "~/components/ui/separator"
import { useAuthState } from "~/components/auth/AuthInitializer"
import { cn } from "~/lib/utils"
import { useAuthApi } from "~/hooks/useAuthApi"
import { useAuth0 } from "@auth0/auth0-react"
import { PaymentDialog } from "./payment-dialog"
import { ModelSelector } from "./model-selector"
import { AI_MODELS } from "~/lib/models"
import { ChatHistory } from './chat-history'
import { ChatService } from '~/services/chatService'
import { UserService } from '~/services/userService'


interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface ChatHistoryProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => Promise<void>;
  onNewChat: () => Promise<void>;
}

// Export the ChatHistoryProps interface for use in ChatHistory component
export type { ChatHistoryProps };

interface Attachment {
  id: string;
  type: string;
  url: string;
  name: string;
  file?: File;
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  attachments?: Attachment[]
  isLoading?: boolean
}

interface ChatInterfaceProps {
  userTier: 'free' | 'pro';
  messageCount?: number;
  maxDailyMessages?: number;
  nextResetTime?: string;
}

export function ChatInterface({ 
  userTier, 
  messageCount = 0,
  maxDailyMessages = 500,
  nextResetTime
}: ChatInterfaceProps) {
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("")
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [tempMessage, setTempMessage] = useState<Message | null>(null)
  const [isLimitReached, setIsLimitReached] = useState(false)
  const { fetchWithAuth } = useAuthApi()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user: auth0User } = useAuth0();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const { isInitialized, hasValidToken, getToken } = useAuthState();

  // Load user and sessions when auth is initialized
  useEffect(() => {
    const initializeChat = async () => {
      if (!isInitialized || !hasValidToken || !auth0User) {
        return;
      }

      try {
        const token = await getToken();
        if (!token) {
          console.error('No valid token available');
          return;
        }

        await loadUserAndSessions();
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      }
    };

    initializeChat();
  }, [isInitialized, hasValidToken, auth0User]);

  // In chat-interface.tsx, update the loadUserAndSessions function
  const loadUserAndSessions = async () => {
    try {
      if (auth0User) {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.error('No auth token available');
          return;
        }

        try {
          const dbUser = await UserService.getOrCreateUser(auth0User);
          setUser(dbUser);
          
          // Load chat sessions
          const userSessions = await ChatService.getUserChatSessions(dbUser.id);
          setSessions(userSessions);
          
          // Load the most recent session if exists
          if (userSessions.length > 0) {
            await loadSession(userSessions[0].id);
          } else {
            // Create first session
            await createNewSession();
          }
        } catch (userError: any) {
          console.error('User loading failed:', userError);
          
          // Check for auth errors specifically
          if (userError.message === 'Authentication required') {
            console.error('Authentication error - redirecting to login');
            window.location.href = '/login';
            return;
          }
          
          // For other errors, continue with basic functionality
          await createNewSession();
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Don't throw, just log and continue
    }
  }
  const createNewSession = async () => {
    if (!user) return
    
    try {
      const newSession = await ChatService.createChatSession(user.id, 'New Chat')
      setCurrentSessionId(newSession.id)
      setSessions(prev => [newSession, ...prev])
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'Hello! How can I help you today?',
        timestamp: new Date()
      }])
    } catch (error) {
      console.error('Failed to create new session:', error)
    }
  }

  const loadSession = async (sessionId: string) => {
    try {
      const sessionMessages = await ChatService.getChatMessages(sessionId)
      const formattedMessages: Message[] = sessionMessages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at)
      }))
      
      setCurrentSessionId(sessionId)
      setMessages(formattedMessages)
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && pendingAttachments.length === 0) || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: newMessage,
      timestamp: new Date(),
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined
    }

    // Add user message immediately
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setNewMessage("")
    setPendingAttachments([])
    setIsLoading(true)

    // Save user message to database
    if (currentSessionId && user) {
      try {
        await ChatService.saveMessage(
          currentSessionId,
          'user',
          newMessage,
          selectedModel
        )
        
        // Update session title if it's the first user message
        if (messages.length === 1) { // Only assistant welcome message
          const title = newMessage.slice(0, 50) + (newMessage.length > 50 ? '...' : '')
          await ChatService.updateSessionTitle(currentSessionId, title)
        }
      } catch (error) {
        console.error('Failed to save user message:', error)
      }
    }

    // Add temporary assistant message for loading state
    const tempAssistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    }
    setMessages(prev => [...prev, tempAssistantMessage])

    try {
      // Prepare messages for API
      const apiMessages = [...messages, userMessage]
        .filter(msg => msg.role !== 'assistant' || !msg.isLoading)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))

      // If there are attachments, add them to the last user message content
      if (pendingAttachments.length > 0) {
        const attachmentText = pendingAttachments.map(att => 
          `[Attachment: ${att.name}]`
        ).join('\n')
        apiMessages[apiMessages.length - 1].content += `\n${attachmentText}`
      }

      const response = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/chat`, {
        method: 'POST',
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
          temperature: 0.7,
          max_tokens: 1000
        })
      })

      // Replace the temporary loading message with the actual response
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempAssistantMessage.id 
            ? {
                ...msg,
                content: response.message,
                isLoading: false
              }
            : msg
        )
      )

      // Save assistant message to database
      if (currentSessionId && user) {
        try {
          await ChatService.saveMessage(
            currentSessionId,
            'assistant',
            response.message,
            selectedModel,
            response.usage?.total_tokens
          )
        } catch (error) {
          console.error('Failed to save assistant message:', error)
        }
      }
    } catch (error: any) {
      console.error('Failed to send message:', error)
      
      // Check if payment required or daily limit reached
      if (error.status === 402 || error?.message?.includes('Free trial limit reached') || error?.message?.includes('Daily limit reached')) {
        setTempMessage(tempAssistantMessage)
        
        if (error?.message?.includes('Daily limit reached')) {
          // Remove the temporary loading message
          setMessages(prev => prev.filter(msg => msg.id !== tempAssistantMessage.id));
          // Set limit reached flag and show payment dialog
          setIsLimitReached(true);
          setShowPaymentDialog(true);
          return
        }
        
        setShowPaymentDialog(true)
        return
      }
      
      // Update the loading message with error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempAssistantMessage.id 
            ? {
                ...msg,
                content: 'Sorry, I encountered an error. Please try again.',
                isLoading: false
              }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    Array.from(files).forEach(file => {
      const fileUrl = URL.createObjectURL(file)
      const attachment: Attachment = {
        id: Date.now().toString() + Math.random(),
        type: file.type,
        url: fileUrl,
        name: file.name,
        file: file
      }
      setPendingAttachments(prev => [...prev, attachment])
    })

    // Reset the input
    e.target.value = ''
  }

  const removeAttachment = (attachmentId: string) => {
    setPendingAttachments(prev => 
      prev.filter(attachment => {
        if (attachment.id === attachmentId) {
          URL.revokeObjectURL(attachment.url) // Clean up object URL
          return false
        }
        return true
      })
    )
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  const clearChat = async () => {
    await createNewSession();
  }

  const retryLastMessage = async () => {
    const lastUserMessage = messages[messages.length - 2];
    if (!lastUserMessage || lastUserMessage.role !== 'user') return;

    // Add temporary assistant message for loading state
    const tempAssistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    }
    setMessages(prev => [...prev.filter(msg => msg.id !== tempMessage?.id), tempAssistantMessage])

    try {
      // Prepare messages for API
      const apiMessages = messages
        .slice(0, -1) // Remove the last message (which was the error)
        .filter(msg => msg.role !== 'assistant' || !msg.isLoading)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))

      const response = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/chat`, {
        method: 'POST',
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
          temperature: 0.7,
          max_tokens: 1000
        })
      })

      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempAssistantMessage.id 
            ? {
                ...msg,
                content: response.message,
                isLoading: false
              }
            : msg
        )
      )
    } catch (error: any) {
      console.error('Failed to retry message:', error)
      setMessages(prev => 
        prev.filter(msg => msg.id !== tempAssistantMessage.id)
      )
    }
  }

  const handlePaymentSuccess = async () => {
    setShowPaymentDialog(false)
    if (tempMessage) {
      await retryLastMessage()
    }
    setTempMessage(null)
  }

  return (
    <div className="flex h-[600px] rounded-lg border bg-background">
      {/* Chat History Sidebar */}
      <ChatHistory
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={loadSession}
        onNewChat={createNewSession}
      />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {showPaymentDialog && (
          <PaymentDialog
            onClose={() => {
              setShowPaymentDialog(false)
              setIsLimitReached(false)
              // Remove the loading message if payment was cancelled
              if (tempMessage) {
                setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
                setTempMessage(null)
              }
            }}
            onSuccess={handlePaymentSuccess}
            showLimitReachedMessage={isLimitReached}
          />
        )}
      
      {/* Header */}
      <div className="flex flex-col gap-2 p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">AI Assistant</h3>
          </div>
          <div className="flex items-center gap-2">
            {userTier === 'free' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPaymentDialog(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Upgrade to Pro
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={clearChat}>
              Clear Chat
            </Button>
          </div>
        </div>
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          userTier={userTier}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 animate-slideIn",
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              message.role === "user" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted"
            )}>
              {message.role === "user" ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>

            {/* Message Content */}
            <div className={cn(
              "flex flex-col space-y-2 max-w-[70%]",
              message.role === "user" ? "items-end" : "items-start"
            )}>
              <div
                className={cn(
                  "rounded-lg px-4 py-2",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.isLoading ? (
                  <div className="flex space-x-2 items-center">
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </div>
              
              {/* Attachments */}
              {message.attachments?.map((attachment, index) => (
                <div key={index} className="rounded-lg overflow-hidden border">
                  {attachment.type.startsWith("image/") ? (
                    <img
                      src={attachment.url}
                      alt="Attachment"
                      className="max-w-xs max-h-32 object-cover"
                    />
                  ) : (
                    <div className="bg-muted p-3 rounded flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      <span className="text-sm">{attachment.name}</span>
                    </div>
                  )}
                </div>
              ))}
              
              <span className="text-xs text-muted-foreground">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <Separator />
      
      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4">
        {pendingAttachments.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {pendingAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group bg-muted rounded-lg p-2 pr-8"
              >
                <div className="flex items-center gap-2">
                  {attachment.type.startsWith("image/") ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <Paperclip className="w-5 h-5" />
                  )}
                  <span className="text-sm truncate max-w-[200px]">
                    {attachment.name}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeAttachment(attachment.id)}
                >
                  <span className="sr-only">Remove attachment</span>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx,.txt"
              multiple
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={isLoading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button 
              type="submit" 
              size="icon"
              disabled={isLoading || (!newMessage.trim() && pendingAttachments.length === 0)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
}