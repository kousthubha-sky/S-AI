// components/chat/chat-interface.tsx
import { useState, useRef, useEffect, type JSX } from "react"
import { AlertCircle, Copy, Check } from "lucide-react"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { useAuthApi } from "~/hooks/useAuthApi"
import { useAuth0 } from "@auth0/auth0-react"
import { AI_MODELS } from "~/lib/models"
import { ChatService } from '~/services/chatService'
import { NewsService } from '~/services/newsService'
import { useToast } from "~/components/ui/toast"
import { PromptInputBox } from "~/components/ai-prompt-box"
import React from "react"

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface Attachment {
  id: string;
  type: string;
  url: string;
  name: string;
  file?: File;
}

interface ImageData {
  url: string;
  type: string;
  width?: number;
  height?: number;
  alt_text?: string;
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  attachments?: Attachment[]
  isLoading?: boolean
  images?: ImageData[]
}

interface ChatInterfaceProps {
  userTier: 'free' | 'pro';
  messageCount?: number;
  maxDailyMessages?: number;
  nextResetTime?: string;
  currentSessionId: string | null;
  sessions: ChatSession[];
  onSessionUpdate: (sessions: ChatSession[]) => void;
  onNewChat: () => void;
  user: any | null;
  showPaymentDialog: boolean;
  setShowPaymentDialog: (show: boolean) => void;
  onMenuClick?: () => void;
  isSidebarCollapsed?: boolean;
}

const GeneratedImages = ({ images }: { images: ImageData[] }) => {
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageLoad = (url: string) => {
    setLoadingImages(prev => ({ ...prev, [url]: false }));
  };

  const handleImageError = (url: string) => {
    setLoadingImages(prev => ({ ...prev, [url]: false }));
    setImageErrors(prev => ({ ...prev, [url]: true }));
  };

  useEffect(() => {
    const loading: Record<string, boolean> = {};
    images.forEach(img => {
      loading[img.url] = true;
    });
    setLoadingImages(loading);
  }, [images]);

  return (
    <div className="flex flex-col gap-3 mt-3">
      {images.map((image, index) => (
        <div 
          key={index} 
          className="relative rounded-xl overflow-hidden border border-white/10 bg-white/5 max-w-full"
        >
          {loadingImages[image.url] && !imageErrors[image.url] && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-xs text-white/60">Loading image...</span>
              </div>
            </div>
          )}
          
          {imageErrors[image.url] ? (
            <div className="flex items-center justify-center p-8 text-red-400">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="text-sm">Failed to load image</span>
            </div>
          ) : (
            <img
              src={image.url}
              alt={image.alt_text || `Generated image ${index + 1}`}
              onLoad={() => handleImageLoad(image.url)}
              onError={() => handleImageError(image.url)}
              className={cn(
                "w-full h-auto object-contain max-h-[500px] transition-opacity duration-300",
                loadingImages[image.url] ? "opacity-0" : "opacity-100"
              )}
              style={{
                display: loadingImages[image.url] ? 'none' : 'block'
              }}
            />
          )}
          
          {!loadingImages[image.url] && !imageErrors[image.url] && (
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = image.url;
                  link.download = `generated-image-${Date.now()}.png`;
                  link.click();
                }}
                className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg transition-colors"
                title="Download image"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const CodeBlock = ({ code, language = 'text' }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const syntaxHighlight = (code: string, lang: string): JSX.Element => {
    const lines = code.split('\n');
    const keywordColors: Record<string, string> = {
      // JavaScript/TypeScript
      'function': '#FF6692', 'const': '#FF6692', 'let': '#FF6692', 'var': '#FF6692',
      'return': '#FF6692', 'if': '#FF6692', 'else': '#FF6692', 'for': '#FF6692',
      'while': '#FF6692', 'import': '#FF6692', 'export': '#FF6692', 'default': '#FF6692',
      'async': '#FF6692', 'await': '#FF6692',
      // Python
      'def': '#FF6692', 'class': '#FF6692', 'from': '#FF6692', 'as': '#FF6692',
      'True': '#1ABC9C', 'False': '#1ABC9C', 'None': '#1ABC9C', 'self': '#FFD700',
      'true': '#1ABC9C', 'false': '#1ABC9C', 'null': '#1ABC9C', 'undefined': '#1ABC9C',
      'in': '#FF6692', 'range': '#FFD700',
    };

    const highlightLine = (line: string): JSX.Element[] => {
      const parts: JSX.Element[] = [];
      let lastIndex = 0;
      // Updated regex to capture numbers separately
      const regex = /\b(\w+)\b|'([^']*)\'|"([^"]*)"|`([^`]*)`|#.*$|\/\/.*$|\d+/gm;
      let match;

      while ((match = regex.exec(line)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
          parts.push(
            <span key={`text-${lastIndex}`} style={{ color: '#E5E7EB' }}>
              {line.substring(lastIndex, match.index)}
            </span>
          );
        }

        // Determine color based on match type
        let color = '#E5E7EB';
        if (match[2]) {
          color = '#A8E6CF'; // Single-quoted string
        } else if (match[3]) {
          color = '#A8E6CF'; // Double-quoted string
        } else if (match[4]) {
          color = '#A8E6CF'; // Backtick string
        } else if (match[0].startsWith('#') || match[0].startsWith('//')) {
          color = '#6B7280'; // Comment
        } else if (/^\d+$/.test(match[0])) {
          color = '#1ABC9C'; // Numbers (all languages)
        } else if (keywordColors[match[0]]) {
          color = keywordColors[match[0]]; // Keyword
        }

        parts.push(
          <span key={`match-${match.index}`} style={{ color }}>
            {match[0]}
          </span>
        );
        lastIndex = regex.lastIndex;
      }

      // Add remaining text
      if (lastIndex < line.length) {
        parts.push(
          <span key={`text-end-${lastIndex}`} style={{ color: '#E5E7EB' }}>
            {line.substring(lastIndex)}
          </span>
        );
      }

      return parts;
    };

    return (
      <>
        {lines.map((line, idx) => (
          <div key={`line-${idx}`} className="flex">
            <span className="select-none pr-3 text-gray-600 min-w-[3rem] text-right">{idx + 1}</span>
            <span className="flex-1">{highlightLine(line)}</span>
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="relative my-3 rounded-lg border border-gray-700 bg-gray-900 overflow-hidden max-w-full">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs font-mono text-gray-300 uppercase truncate flex-1 mr-2">
          {language}
        </span>
        <button 
          onClick={handleCopy} 
          className="flex items-center gap-1 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded flex-shrink-0"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-3 sm:p-4 max-w-full m-0">
          <code className="block min-w-0 overflow-x-auto text-sm font-mono" style={{ color: '#E5E7EB' }}>
            {syntaxHighlight(code, language)}
          </code>
        </pre>
      </div>
    </div>
  );
};

const FormattedMessage = ({ content, images }: { content: string; images?: ImageData[] }) => {
  const formatContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let inCodeBlock = false;
    let currentCodeBlock: string[] = [];
    let currentCodeLanguage = 'text';

    const addCodeBlock = () => {
      if (currentCodeBlock.length > 0) {
        elements.push(
          <CodeBlock 
            key={`code-${elements.length}`} 
            code={currentCodeBlock.join('\n')} 
            language={currentCodeLanguage}
          />
        );
        currentCodeBlock = [];
      }
    };

    const parseMarkdown = (line: string) => {
      // Handle markdown links [text](url) - MUST be before other replacements
      line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline cursor-pointer">$1</a>');
      
      // Handle code inline
      line = line.replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
      
      // Handle bold
      line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      line = line.replace(/__([^_]+)__/g, '<strong>$1</strong>');
      
      // Handle italic
      line = line.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      line = line.replace(/_([^_]+)_/g, '<em>$1</em>');
      
      return line;
    };

    lines.forEach((line, idx) => {
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          addCodeBlock();
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          currentCodeLanguage = line.replace(/```/g, '').trim() || 'text';
        }
        return;
      }

      if (inCodeBlock) {
        currentCodeBlock.push(line);
        return;
      }

      // Headers (### or ## or #)
      if (line.match(/^#{1,6}\s/)) {
        const levelMatch = line.match(/^#+/);
        const level = levelMatch ? levelMatch[0].length : 3;
        const headerText = line.replace(/^#+\s/, '').trim();
        const headingClasses: Record<number, string> = {
          1: "text-2xl font-bold mt-4 mb-2",
          2: "text-xl font-bold mt-3 mb-2",
          3: "text-lg font-bold mt-2 mb-1",
          4: "text-base font-bold mt-2 mb-1",
          5: "text-sm font-bold mt-1 mb-1",
          6: "text-sm font-bold mt-1 mb-1"
        };
        
        elements.push(
          React.createElement(
            `h${level}` as any,
            { 
              key: `header-${idx}`, 
              className: `${headingClasses[level]} text-white`,
              dangerouslySetInnerHTML: { __html: parseMarkdown(headerText) }
            }
          )
        );
        return;
      }

      // Unordered lists (-, *, +)
      if (line.match(/^[\s]*[-*+]\s/)) {
        const indentMatch = line.match(/^[\s]*/);
        const indent = indentMatch ? indentMatch[0].length : 0;
        const listText = line.replace(/^[\s]*[-*+]\s/, '').trim();
        elements.push(
          <div 
            key={`list-${idx}`} 
            className="ml-4 my-1 flex gap-2 text-gray-100"
            style={{ marginLeft: `${indent + 16}px` }}
          >
            <span className="text-gray-400">•</span>
            <span dangerouslySetInnerHTML={{ __html: parseMarkdown(listText) }} />
          </div>
        );
        return;
      }

      // Ordered lists (1., 2., etc)
      if (line.match(/^[\s]*\d+\.\s/)) {
        const indentMatch = line.match(/^[\s]*/);
        const indent = indentMatch ? indentMatch[0].length : 0;
        const match = line.match(/^[\s]*(\d+)\.\s(.+)$/);
        if (match) {
          const number = match[1];
          const listText = match[2].trim();
          elements.push(
            <div 
              key={`ordered-list-${idx}`} 
              className="ml-4 my-1 flex gap-2 text-gray-100"
              style={{ marginLeft: `${indent + 16}px` }}
            >
              <span className="text-gray-400">{number}.</span>
              <span dangerouslySetInnerHTML={{ __html: parseMarkdown(listText) }} />
            </div>
          );
          return;
        }
      }

      // Blockquotes
      if (line.trim().startsWith('>')) {
        const quoteText = line.replace(/^>\s?/, '').trim();
        elements.push(
          <div 
            key={`quote-${idx}`} 
            className="border-l-4 border-gray-600 pl-3 py-1 my-2 text-gray-300 italic"
          >
            <span dangerouslySetInnerHTML={{ __html: parseMarkdown(quoteText) }} />
          </div>
        );
        return;
      }

      // Regular paragraphs
      if (line.trim()) {
        elements.push(
          <p 
            key={`p-${idx}`} 
            className="my-2 leading-relaxed break-words text-gray-100"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(line) }}
          />
        );
      } else {
        elements.push(<br key={`br-${idx}`} />);
      }
    });

    addCodeBlock();
    return elements;
  };

  return (
    <div className="space-y-1 break-words">
      {formatContent(content)}
      {images && images.length > 0 && (
        <GeneratedImages images={images} />
      )}
    </div>
  );
};

export function ChatInterface({ 
  userTier, messageCount = 0, maxDailyMessages = 500, nextResetTime,
  currentSessionId, sessions, onSessionUpdate, onNewChat, user,
  showPaymentDialog, setShowPaymentDialog, onMenuClick,
  isSidebarCollapsed = false
}: ChatInterfaceProps) {
  const { user: auth0User, isLoading: auth0Loading, isAuthenticated } = useAuth0();
  const { fetchWithAuth } = useAuthApi();
  const { showToast } = useToast();
  
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
  const [newMessage, setNewMessage] = useState("")
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [tempMessage, setTempMessage] = useState<Message | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  if (auth0Loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Please log in to continue</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (currentSessionId) {
      loadSession(currentSessionId);
      setActiveSessionId(currentSessionId);
    } else {
      setMessages([]);
      setHasStartedChat(false);
      setIsInitializing(false);
      setActiveSessionId(null);
    }
  }, [currentSessionId]);

  const loadSession = async (sessionId: string) => {
    try {
      setIsInitializing(true);
      const sessionMessages = await ChatService.getChatMessages(sessionId, fetchWithAuth);
      
      const formattedMessages: Message[] = sessionMessages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        images: msg.images || undefined
      }));
      
      setMessages(formattedMessages);
      setHasStartedChat(formattedMessages.length > 0);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load session:', error);
      setError('Failed to load chat session');
      setMessages([]);
      setHasStartedChat(false);
    } finally {
      setIsInitializing(false);
    }
  }

  const handleSendMessage = async (messageText: string, files?: File[]) => {
    if ((!messageText.trim() && (!files || files.length === 0)) || isLoading) return;

    setHasStartedChat(true);

    abortControllerRef.current = new AbortController();

    // Process files into attachments
    const attachments: Attachment[] = files ? files.map(file => ({
      id: Date.now().toString() + Math.random(),
      type: file.type,
      url: URL.createObjectURL(file),
      name: file.name,
      file
    })) : [];

    // Parse special prefixes from PromptInputBox
    let actualMessage = messageText;
    let modelToUse = selectedModel;
    let isSearchRequest = false;
    
    if (messageText.startsWith('[Search:')) {
      isSearchRequest = true;
      actualMessage = messageText.replace('[Search:', '').replace(/\]$/, '').trim();
    } else if (messageText.startsWith('[Think:')) {
      actualMessage = messageText.replace('[Think:', '').replace(/\]$/, '').trim();
      // Use a reasoning-focused model
      modelToUse = AI_MODELS.find(m => m.name.includes('Opus'))?.id || selectedModel;
    } else if (messageText.startsWith('[Canvas:')) {
      actualMessage = messageText.replace('[Canvas:', '').replace(/\]$/, '').trim();
      // Use canvas/code generation model
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: actualMessage,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined
    }

    setMessages(prev => [...prev, userMessage])
    setNewMessage("")
    setPendingAttachments([])
    setIsLoading(true)

    const tempAssistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    }
    setMessages(prev => [...prev, tempAssistantMessage])

    let sessionIdToUse = currentSessionId || activeSessionId;
    let sessionCreationPromise: Promise<void> = Promise.resolve();

    if (!sessionIdToUse && user && messages.length === 0) {
      sessionCreationPromise = (async () => {
        try {
          showToast('Creating new chat...', 'info', 1000);
          const newSession = await ChatService.createChatSession('New Chat', fetchWithAuth);
          sessionIdToUse = newSession.id;
          setActiveSessionId(newSession.id);
          onSessionUpdate([newSession, ...sessions]);
        } catch (error) {
          console.error('Failed to create chat session:', error);
        }
      })();
    }

    try {
      let messageContent: string;
      let responseImages: ImageData[] = [];
      let totalTokens: number | undefined = undefined;

      // Handle search request separately
      if (isSearchRequest) {
        try {
          const newsResponse = await NewsService.fetchLiveNews(actualMessage, fetchWithAuth);
          messageContent = newsResponse.message;
          // No images from news API, but we could add them if needed
        } catch (error) {
          messageContent = `Failed to fetch news: ${error instanceof Error ? error.message : 'Unknown error'}\n\nTry searching for different keywords or check your internet connection.`;
        }
      } else {
        // Regular AI API call
        const apiMessages = [...messages, userMessage]
          .filter(msg => msg.role !== 'assistant' || !msg.isLoading)
          .map(msg => ({ role: msg.role, content: msg.content }))

        if (attachments.length > 0) {
          apiMessages[apiMessages.length - 1].content += '\n' + 
            attachments.map(a => `[Attachment: ${a.name}]`).join('\n')
        }

        const response = await fetchWithAuth(
          `${import.meta.env.VITE_API_BASE_URL}/api/chat`, 
          {
            method: 'POST',
            body: JSON.stringify({ 
              messages: apiMessages, 
              model: modelToUse, 
              temperature: 0.7, 
              max_tokens: 1000 
            }),
            signal: abortControllerRef.current.signal
          }
        )

        messageContent = response.message || response.data?.message || 
                                 response.content || response.choices?.[0]?.message?.content || 
                                 response.result;
        
        if (!messageContent) {
          throw new Error('No message content received from API');
        }

        responseImages = response.images || [];
        totalTokens = response.usage?.total_tokens;
      }

      setMessages(prev => prev.map(msg => 
        msg.id === tempAssistantMessage.id 
          ? { 
              ...msg, 
              content: messageContent, 
              isLoading: false, 
              images: responseImages 
            } 
          : msg
      ))

      await sessionCreationPromise;

      if (sessionIdToUse && user) {
        setTimeout(async () => {
          try {
            await ChatService.saveMessage(
              sessionIdToUse!, 
              'user', 
              actualMessage, 
              isSearchRequest ? 'live_news_api' : modelToUse, 
              undefined,
              undefined,
              fetchWithAuth
            )
            
            if (messages.length === 0) {
              const title = actualMessage.slice(0, 50) + (actualMessage.length > 50 ? '...' : '')
              await ChatService.updateSessionTitle(sessionIdToUse!, title, fetchWithAuth)
              
              onSessionUpdate(sessions.map(s => 
                s.id === sessionIdToUse ? { ...s, title } : s
              ))
            }
            
            await ChatService.saveMessage(
              sessionIdToUse!, 
              'assistant', 
              messageContent, 
              isSearchRequest ? 'live_news_api' : modelToUse, 
              totalTokens,
              responseImages,
              fetchWithAuth
            )
          } catch (error) {
            console.error('Failed to save messages:', error)
          }
        }, 0);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prev => prev.map(msg => 
          msg.id === tempAssistantMessage.id ? { ...msg, content: 'Response stopped by user.', isLoading: false } : msg
        ))
        return;
      }

      if (error.status === 402 || error?.message?.includes('limit reached')) {
        setTempMessage(tempAssistantMessage);
        setIsLimitReached(error?.message?.includes('Daily limit reached') || false);
        if (error?.message?.includes('Daily limit reached')) {
          setMessages(prev => prev.filter(msg => msg.id !== tempAssistantMessage.id));
        }
        setShowPaymentDialog(true)
        return
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === tempAssistantMessage.id ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isLoading: false } : msg
      ))
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isInitializing) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muted-foreground mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full w-full flex-1 bg-[radial-gradient(125%_125%_at_50%_101%,rgba(245,87,2,1)_10.5%,rgba(245,120,2,1)_16%,rgba(245,140,2,1)_17.5%,rgba(245,170,100,1)_25%,rgba(238,174,202,1)_40%,rgba(202,179,214,1)_65%,rgba(148,201,233,1)_100%)]"
    >
      {messages.length === 0 ? (
        /* Welcome Screen - Centered */
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-3xl space-y-8">
            {/* Welcome Header */}
            <div className="text-center space-y-4 mb-12">
              <h1 className="text-5xl md:text-6xl font-bold text-white drop-shadow-lg">
                Welcome to SkyGPT
              </h1>
              <p className="text-xl md:text-2xl text-white/90 drop-shadow">
                Start a conversation by typing a message below
              </p>
            </div>
            
            {/* Centered Prompt Input */}
            <div className="w-full">
              <PromptInputBox
                onSend={handleSendMessage}
                isLoading={isLoading}
                placeholder="Type your message here..."
                selectedModel={selectedModel}
                onModelChange={(model) => {
                  setSelectedModel(model);
                }}
                userTier={userTier}
              />
            </div>

            {/* Quick Suggestions (Optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
              {[
                { icon: "💡", text: "Explain a complex concept" },
                { icon: "✍️", text: "Help me write something" },
                { icon: "🔍", text: "Search for information" },
                { icon: "💻", text: "Help me with code" },
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(suggestion.text, [])}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all duration-200 text-white text-left group"
                >
                  <span className="text-2xl">{suggestion.icon}</span>
                  <span className="text-sm font-medium group-hover:translate-x-1 transition-transform">
                    {suggestion.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Chat Messages View */
        <>
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 shadow-lg",
                    message.role === 'user'
                      ? 'bg-[#b0b0b0] text-gray-900'
                      : ' text-white border border-white/10'
                  )}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <FormattedMessage content={message.content} images={message.images} />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Fixed at bottom when chat started */}
          <div className=" pb-6">
            <div className="max-w-3xl mx-auto">
              <PromptInputBox
                onSend={handleSendMessage}
                isLoading={isLoading}
                placeholder="Type your message here..."
                selectedModel={selectedModel}
                onModelChange={(model) => {
                  setSelectedModel(model);
                }}
                userTier={userTier}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}