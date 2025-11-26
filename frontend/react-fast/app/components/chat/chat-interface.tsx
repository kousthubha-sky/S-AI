// components/chat/chat-interface.tsx
import { useState, useRef, useEffect, useCallback, type JSX } from "react"
import { AlertCircle, Copy, Check, MessageSquare, Brain, AlertTriangle, Zap, ChevronDown } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import { cn } from "~/lib/utils"
import { useAuthApi } from "~/hooks/useAuthApi"
import { useAuth0 } from "@auth0/auth0-react"
import { AI_MODELS } from "~/lib/models"
import { ChatService } from '~/services/chatService'
import { NewsService } from '~/services/newsService'
import { useToast } from "~/components/ui/toast"
import { HeroGeometric } from "../ui/shape-landing-hero"
import { PromptInputBox } from "~/components/ai-prompt-box"
import { TextShimmer } from "~/components/ui/text-shimmer"
import DigitalSerenity from "~/components/digital-serenity-animated-landing-page"

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
  userTier: 'free' | 'starter' | 'pro' | 'pro_plus';
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
  isAuthed?: boolean;
}

// Skeleton loader for chat messages
const ChatMessageSkeleton = () => (
  <div className="space-y-3 max-w-4xl mx-auto w-full">
    {[...Array(3)].map((_, i) => (
      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs sm:max-w-sm md:max-w-md lg:max-w-2xl px-4 py-3 rounded-lg space-y-2 ${i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700/40'}`}>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    ))}
  </div>
);

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
      'function': '#FF6692', 'const': '#FF6692', 'let': '#FF6692', 'var': '#FF6692',
      'return': '#FF6692', 'if': '#FF6692', 'else': '#FF6692', 'for': '#FF6692',
      'while': '#FF6692', 'import': '#FF6692', 'export': '#FF6692', 'default': '#FF6692',
      'async': '#FF6692', 'await': '#FF6692',
      'def': '#FF6692', 'class': '#FF6692', 'from': '#FF6692', 'as': '#FF6692',
      'True': '#1ABC9C', 'False': '#1ABC9C', 'None': '#1ABC9C', 'self': '#FFD700',
      'true': '#1ABC9C', 'false': '#1ABC9C', 'null': '#1ABC9C', 'undefined': '#1ABC9C',
      'in': '#FF6692', 'range': '#FFD700',
    };

    const highlightLine = (line: string): JSX.Element[] => {
      const parts: JSX.Element[] = [];
      let lastIndex = 0;
      const regex = /\b(\w+)\b|'([^']*)\'|"([^"]*)"|`([^`]*)`|#.*$|\/\/.*$|\d+/gm;
      let match;

      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(
            <span key={`text-${lastIndex}`} style={{ color: '#E5E7EB' }}>
              {line.substring(lastIndex, match.index)}
            </span>
          );
        }

        let color = '#E5E7EB';
        if (match[2]) {
          color = '#A8E6CF';
        } else if (match[3]) {
          color = '#A8E6CF';
        } else if (match[4]) {
          color = '#A8E6CF';
        } else if (match[0].startsWith('#') || match[0].startsWith('//')) {
          color = '#6B7280';
        } else if (/^\d+$/.test(match[0])) {
          color = '#1ABC9C';
        } else if (keywordColors[match[0]]) {
          color = keywordColors[match[0]];
        }

        parts.push(
          <span key={`match-${match.index}`} style={{ color }}>
            {match[0]}
          </span>
        );
        lastIndex = regex.lastIndex;
      }

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

const ThinkingIndicator = () => {
  return (
    <div className="flex items-center gap-2">
      <style>{`
        @keyframes brain-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-1px); }
        }
        .thinking-brain {
          animation: brain-float 3s ease-in-out infinite;
        }
      `}</style>
      <Brain className="w-5 h-5 text-white thinking-brain flex-shrink-0" />
      <TextShimmer
        duration={1.2}
        className="text-sm font-medium [--base-color:theme(colors.gray.300)] [--base-gradient-color:theme(colors.black)] dark:[--base-color:theme(colors.gray.300)] dark:[--base-gradient-color:theme(colors.black)]"
      >
        Thinking...
      </TextShimmer>
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
    let tableRows: string[] = [];
    let inTable = false;

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

    const addTable = () => {
      if (tableRows.length > 0) {
        // Filter out separator rows (rows that contain only dashes and colons)
        const dataRows = tableRows.filter(row => {
          const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
          return !cells.every(cell => /^:?-+:?$/.test(cell) || /^-+$/.test(cell));
        });

        if (dataRows.length > 0) {
          elements.push(
            <div key={`table-${elements.length}`} className="my-3 overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-600 text-sm">
                <tbody>
                  {dataRows.map((row, rowIndex) => {
                    const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
                    if (cells.length === 0) return null;

                    return (
                      <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-700' : ''}>
                        {cells.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border border-gray-600 px-3 py-2 text-gray-100">
                            {rowIndex === 0 ? (
                              <strong className="text-white">{cell}</strong>
                            ) : (
                              <span dangerouslySetInnerHTML={{ __html: parseMarkdown(cell) }} />
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }
        tableRows = [];
        inTable = false;
      }
    };

    const parseMarkdown = (line: string) => {
      line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline cursor-pointer">$1</a>');
      line = line.replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
      line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      line = line.replace(/__([^_]+)__/g, '<strong>$1</strong>');
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

      // Handle markdown tables
      if (line.trim().startsWith('|') && line.includes('|')) {
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
        if (cells.length >= 2) { // Only consider it a table if there are at least 2 columns
          if (!inTable) {
            inTable = true;
            tableRows = [];
          }
          tableRows.push(line);
          return;
        }
      }

      // If we were in a table but this line doesn't continue it, finish the table
      if (inTable && (!line.trim().startsWith('|') || !line.includes('|'))) {
        addTable();
      }

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

    // Handle any remaining table
    if (inTable) {
      addTable();
    }

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

// components/chat/chat-interface.tsx (updated section)
export function ChatInterface({ 
  userTier, messageCount = 0, maxDailyMessages = 500, nextResetTime,
  currentSessionId, sessions, onSessionUpdate, onNewChat, user,
  showPaymentDialog, setShowPaymentDialog, onMenuClick, isAuthed,
  isSidebarCollapsed = false
}: ChatInterfaceProps) {
  const { getAccessTokenSilently, user: auth0User, isLoading: auth0Loading, isAuthenticated } = useAuth0();
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
   const [messagesLoaded, setMessagesLoaded] = useState(false); // Track if messages are loaded
   const [userScrolledUp, setUserScrolledUp] = useState(false); // Track if user manually scrolled up
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [tempMessage, setTempMessage] = useState<Message | null>(null);
   const abortControllerRef = useRef<AbortController | null>(null)
   const messagesEndRef = useRef<HTMLDivElement>(null)
   const containerRef = useRef<HTMLDivElement>(null)
   const scrollContainerRef = useRef<HTMLDivElement>(null)  // Ref for the scrolling messages container
   const authTokenCache = useRef<{ token: string; expires: number } | null>(null)  // Cache auth token for 5 minutes

   // Cached auth token function to avoid repeated token fetches
   const getCachedAuthToken = async (): Promise<string> => {
     const now = Date.now();
     const cacheExpiry = 5 * 60 * 1000; // 5 minutes

     if (authTokenCache.current && authTokenCache.current.expires > now) {
       return authTokenCache.current.token;
     }

     const token = await getAccessTokenSilently({
       authorizationParams: {
         audience: import.meta.env.VITE_AUTH0_API_AUDIENCE,
         scope: 'openid profile email'
       }
     });

     authTokenCache.current = {
       token,
       expires: now + cacheExpiry
     };

     return token;
   };

   useEffect(() => {
    if (currentSessionId && isAuthed) {
      loadSession(currentSessionId);
      setActiveSessionId(currentSessionId);
    } else {
      setMessages([]);
      setHasStartedChat(false);
      setIsInitializing(false);
      setActiveSessionId(null);
    }
  }, [currentSessionId, isAuthed]);

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
       setMessagesLoaded(true); // Mark messages as loaded
       setError(null);
     } catch (error: any) {
       console.error('Failed to load session:', error);
       setError('Failed to load chat session');
       setMessages([]);
       setHasStartedChat(false);
       setMessagesLoaded(true); // Even on error, loading is complete
     } finally {
       setIsInitializing(false);
     }
   }

  const handleSendMessage = async (messageText: string, files?: File[]) => {
    // Don't send if not authenticated
    if (!isAuthed || (!messageText.trim() && (!files || files.length === 0)) || isLoading) return;

    setHasStartedChat(true);

    abortControllerRef.current = new AbortController();

    const attachments: Attachment[] = files ? files.map(file => ({
      id: Date.now().toString() + Math.random(),
      type: file.type,
      url: URL.createObjectURL(file),
      name: file.name,
      file
    })) : [];

    let actualMessage = messageText;
    let modelToUse = selectedModel;
    let isSearchRequest = false;
    let isThinkingRequest = false;
    
    if (messageText.startsWith('[Search:')) {
      isSearchRequest = true;
      actualMessage = messageText.replace('[Search:', '').replace(/\]$/, '').trim();
    } else if (messageText.startsWith('[Think:')) {
      isThinkingRequest = true;
      actualMessage = messageText.replace('[Think:', '').replace(/\]$/, '').trim();
      modelToUse = 'qwen/qwen3-235b-a22b:free';
    } else if (messageText.startsWith('[Canvas:')) {
      actualMessage = messageText.replace('[Canvas:', '').replace(/\]$/, '').trim();
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

      if (isSearchRequest) {
        try {
          const newsResponse = await NewsService.fetchLiveNews(actualMessage, fetchWithAuth);
          messageContent = newsResponse.message;
        } catch (error) {
          messageContent = `Failed to fetch news: ${error instanceof Error ? error.message : 'Unknown error'}\n\nTry searching for different keywords or check your internet connection.`;
        }
       } else {
         // Use streaming for real-time token display
         const apiMessages = [...messages, userMessage]
           .filter(msg => msg.role !== 'assistant' || !msg.isLoading)
           .map(msg => ({ role: msg.role, content: msg.content }))

         if (attachments.length > 0) {
           apiMessages[apiMessages.length - 1].content += '\n' +
             attachments.map(a => `[Attachment: ${a.name}]`).join('\n')
         }

         let streamingContent = '';
         let streamingUsage: any = null;
         let streamingImages: ImageData[] = [];

         const cleanup = await ChatService.streamChat(
           apiMessages,
           modelToUse,
           0.7,
           1000,
           isThinkingRequest,
           (token: string) => {
             // Accumulate tokens and update the message in real-time
             streamingContent += token;
             setMessages(prev => prev.map(msg =>
               msg.id === tempAssistantMessage.id
                 ? { ...msg, content: streamingContent, isLoading: false }
                 : msg
             ));
           },
           (usage?: any, images?: ImageData[]) => {
             // Stream completed
             streamingUsage = usage;
             streamingImages = images || [];
             setMessages(prev => prev.map(msg =>
               msg.id === tempAssistantMessage.id
                 ? { ...msg, content: streamingContent, isLoading: false, images: streamingImages }
                 : msg
             ));
           },
           (error: string) => {
             // Handle streaming error
             console.error('Streaming error:', error);
             setMessages(prev => prev.map(msg =>
               msg.id === tempAssistantMessage.id
                 ? { ...msg, content: `Error: ${error}`, isLoading: false }
                 : msg
             ));
           },
            async () => {
              // Get cached auth token to improve performance
              return await getCachedAuthToken();
            }
         );



         // Wait for streaming to complete (this will be resolved when onComplete is called)
         await new Promise<void>((resolve) => {
           const checkComplete = () => {
             if (!streamingContent.includes('Error:') && streamingUsage !== null) {
               resolve();
             } else {
               setTimeout(checkComplete, 100);
             }
           };
           checkComplete();
         });

         messageContent = streamingContent;
         responseImages = streamingImages;
         totalTokens = streamingUsage?.total_tokens;
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
        
        // Show toast notifications for different limit types
        const errorMessage = error?.message || '';
        if (errorMessage.includes('Daily limit reached')) {
          showToast('🚫 Daily limit reached (50 requests/day). Upgrade to continue!', 'warning', 5000);
        } else if (errorMessage.includes('Monthly limit reached')) {
          if (errorMessage.includes('2000')) {
            showToast('🚫 Monthly limit reached (2000 requests). Upgrade to Pro Plus!', 'warning', 5000);
          } else {
            showToast('🚫 Monthly limit reached (500 requests). Upgrade to Pro for more!', 'warning', 5000);
          }
        } else if (errorMessage.includes('not available')) {
          showToast('🔒 This feature requires a higher tier plan', 'warning', 5000);
        } else {
          showToast('💳 Upgrade required to continue using this feature', 'warning', 5000);
        }
        
        setShowPaymentDialog(true)
        return
      }
      
      // Show generic error toast
      showToast('❌ An error occurred. Please try again.', 'error');
      
      setMessages(prev => prev.map(msg => 
        msg.id === tempAssistantMessage.id ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isLoading: false } : msg
      ))
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  // Improved scrolling logic to prevent glitches during streaming
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  // Handle scroll events to detect user scrolling
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      // Debounce scroll events for better performance
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setUserScrolledUp(!isNearBottom);
      }, 100);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  useEffect(() => {
    // Only auto-scroll if user hasn't scrolled up and is near bottom
    if (!userScrolledUp) {
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        if (isNearBottom) {
          // Small delay to ensure DOM has updated during streaming
          setTimeout(scrollToBottom, 50);
        }
      }
    }
  }, [messages, scrollToBottom, userScrolledUp]);

  // Show loading only when authenticated and initializing
  if (auth0Loading || (isAuthed && isInitializing)) {
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
      className="flex flex-col h-full w-full flex-1 pt-16 md:pt-0 relative overflow-hidden"
    >
      {/* Digital Serenity Background - Only show before chat starts */}
      {!hasStartedChat && (
        <div className="absolute inset-0 z-0">
          
          <DigitalSerenity username={auth0User?.given_name || auth0User?.name || 'there'} hasStartedChat={hasStartedChat} />
        </div>
      )}

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col h-full w-full">
        {!isAuthed ? (
          /* HeroGeometric Welcome Screen for Unauthenticated Users */
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <div className="absolute inset-0">
              <HeroGeometric 
                badge="Xcore-ai(Beta)"
                title1="Elevate Your"
                title2="AI experience"
              />
            </div>
            
            {/* Prompt Input positioned at bottom */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 flex justify-center z-20">
              <div className="w-full max-w-4xl">
                <PromptInputBox
                  onSend={handleSendMessage}
                  isLoading={false}
                  placeholder="Sign in to start chatting..."
                  selectedModel={selectedModel}
                  onModelChange={(model) => {
                    setSelectedModel(model);
                  }}
                  userTier={userTier}
                  isAuthenticated={isAuthed}
                />
              </div>
            </div>
          </div>
        ) : (
                /* Authenticated Chat Interface - UNCHANGED */
              /* Authenticated Chat Interface - FIXED SCROLL */
        <div className="flex flex-col h-full w-full">
          {!hasStartedChat ? (
            // Before chat starts - just prompt box at bottom
            <div className="flex-1 flex flex-col items-center justify-center pt-48 md:pt-64 px-4 py-8">
              <div className="w-full max-w-2xl">
                <PromptInputBox
                  onSend={handleSendMessage}
                  isLoading={isLoading}
                  placeholder="Ask me anything..."
                  selectedModel={selectedModel}
                  onModelChange={(model) => {
                    setSelectedModel(model);
                  }}
                  userTier={userTier}
                  isAuthenticated={isAuthed}
                />
              </div>
            </div>
          ) : (
            // After chat starts - FIXED SCROLL LAYOUT
            <div className="flex flex-col h-full">
              {/* Messages Container - PROPER SCROLLING */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative" style={{ height: 'calc(100vh - 200px)' }}>
                 <div className="min-h-full px-4 py-4">
                  {isInitializing ? (
                    <ChatMessageSkeleton />
                  ) : (
                    <div className="space-y-4 max-w-4xl mx-auto w-full">
                      {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs sm:max-w-sm md:max-w-md lg:max-w-2xl px-4 py-1 rounded-lg ${message.role === 'user' ? 'bg-gray-950 text-white' : 'text-gray-100'}`}>
                             {message.isLoading ? (
                               <ThinkingIndicator />
                             ) : (
                               <>
                                 <FormattedMessage content={message.content} images={message.images} />
                                 {message.attachments && message.attachments.length > 0 && (
                                   <div className="mt-2 space-y-1">
                                     {message.attachments.map(att => (
                                       <div key={att.id} className="text-xs opacity-75">{att.name}</div>
                                     ))}
                                   </div>
                                 )}
                               </>
                             )}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                 </div>
               </div>

               {/* Scroll to Bottom Button */}
               {userScrolledUp && (
                 <button
                   onClick={() => {
                     scrollToBottom();
                     setUserScrolledUp(false);
                   }}
                   className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-20"
                   title="Scroll to bottom"
                 >
                   <ChevronDown className="w-5 h-5" />
                 </button>
               )}

               {/* Input Area - Fixed at bottom */}
              <div className="flex-shrink-0 px-4 py-4 bg-gradient-to-t from-[#030303] to-transparent">
                <div className="max-w-4xl mx-auto w-full">
                  <PromptInputBox
                    onSend={handleSendMessage}
                    isLoading={isLoading}
                    placeholder="Type your message..."
                    selectedModel={selectedModel}
                    onModelChange={(model) => {
                      setSelectedModel(model);
                    }}
                    userTier={userTier}
                    isAuthenticated={isAuthed}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}