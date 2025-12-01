// components/chat/chat-interface.tsx - REDESIGNED VERSION
// Clean document-style layout with centered content, horizontal rules, and distinctive typography
// Removed Digital Serenity background for clean, professional appearance

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
import { PromptInputBox } from "~/components/ai-prompt-box"
import { TextShimmer } from "~/components/ui/text-shimmer"
import Loader from "~/components/loader-12"

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
  <div className="space-y-8 max-w-5xl mx-auto w-full">
    {[...Array(2)].map((_, i) => (
      <div key={i} className="space-y-4">
        <div className="py-8 px-6">
          <Skeleton className="h-6 w-32 mx-auto mb-4" />
          <Skeleton className="h-8 w-3/4 mx-auto" />
        </div>
        <div className="py-8 px-6">
          <Skeleton className="h-4 w-full mb-3" />
          <Skeleton className="h-4 w-5/6 mb-3" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <hr className="border-gray-800 max-w-3xl mx-auto" />
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
    <div className="flex flex-col gap-4 mt-6">
      {images.map((image, index) => (
        <div 
          key={index} 
          className="relative rounded-xl overflow-hidden border border-gray-700/50 bg-gray-900/30 max-w-full shadow-xl"
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
    <div className="relative my-6 rounded-xl border border-gray-700/50 bg-[#0d1117] overflow-hidden shadow-2xl max-w-full">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-[#161b22] border-b border-gray-700/50">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide truncate flex-1 mr-2">
          {language}
        </span>
        <button 
          onClick={handleCopy} 
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors flex-shrink-0"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4 sm:p-5 max-w-full m-0">
          <code className="block min-w-0 overflow-x-auto text-sm md:text-base font-mono" style={{ color: '#E5E7EB' }}>
            {syntaxHighlight(code, language)}
          </code>
        </pre>
      </div>
    </div>
  );
};

const ThinkingIndicator = () => {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <style>{`
        @keyframes brain-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-1px); }
        }
        .thinking-brain {
          animation: brain-float 3s ease-in-out infinite;
        }
      `}</style>
      <Brain className="w-6 h-6 text-white thinking-brain flex-shrink-0" />
      <TextShimmer
        duration={1.2}
        className="text-base font-medium [--base-color:theme(colors.gray.300)] [--base-gradient-color:theme(colors.black)] dark:[--base-color:theme(colors.gray.300)] dark:[--base-gradient-color:theme(colors.black)]"
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
            <div key={`table-${elements.length}`} className="my-6 overflow-x-auto rounded-lg border border-gray-700">
              <table className="min-w-full border-collapse text-sm md:text-base">
                <tbody>
                  {dataRows.map((row, rowIndex) => {
                    const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
                    if (cells.length === 0) return null;

                    return (
                      <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-800' : 'bg-gray-900/30'}>
                        {cells.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border border-gray-700 px-4 py-3 text-gray-200">
                            {rowIndex === 0 ? (
                              <strong className="text-white font-semibold">{cell}</strong>
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
      line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline underline-offset-2 cursor-pointer transition-colors">$1</a>');
      line = line.replace(/`([^`]+)`/g, '<code class="bg-gray-800/60 px-2 py-0.5 rounded text-sm font-mono text-blue-300 border border-gray-700/30">$1</code>');
      line = line.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
      line = line.replace(/__([^_]+)__/g, '<strong class="font-semibold text-white">$1</strong>');
      line = line.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
      line = line.replace(/_([^_]+)_/g, '<em class="italic">$1</em>');
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
        if (cells.length >= 2) {
          if (!inTable) {
            inTable = true;
            tableRows = [];
          }
          tableRows.push(line);
          return;
        }
      }

      if (inTable && (!line.trim().startsWith('|') || !line.includes('|'))) {
        addTable();
      }

      if (line.match(/^#{1,6}\s/)) {
        const levelMatch = line.match(/^#+/);
        const level = levelMatch ? levelMatch[0].length : 3;
        const headerText = line.replace(/^#+\s/, '').trim();
        const headingClasses: Record<number, string> = {
          1: "text-3xl md:text-4xl font-bold mt-8 mb-4 text-white tracking-tight",
          2: "text-2xl md:text-3xl font-semibold mt-6 mb-3 text-gray-100",
          3: "text-xl md:text-2xl font-semibold mt-5 mb-2 text-gray-200",
          4: "text-lg md:text-xl font-medium mt-4 mb-2 text-gray-300",
          5: "text-base md:text-lg font-medium mt-3 mb-2 text-gray-400",
          6: "text-sm md:text-base font-medium mt-2 mb-1 text-gray-400"
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
            className="ml-6 my-2 flex gap-3 text-base md:text-lg text-gray-300 font-light"
            style={{ marginLeft: `${indent + 24}px` }}
          >
            <span className="text-blue-400 font-semibold">•</span>
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
              className="ml-6 my-2 flex gap-3 text-base md:text-lg text-gray-300 font-light"
              style={{ marginLeft: `${indent + 24}px` }}
            >
              <span className="text-blue-400 font-semibold min-w-[1.5rem]">{number}.</span>
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
            className="border-l-4 border-blue-500 pl-6 py-3 my-4 text-gray-300 italic text-base md:text-lg bg-gray-900/30 rounded-r-lg"
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
            className="my-3 leading-loose text-base md:text-lg text-gray-300 font-light"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(line) }}
          />
        );
      } else {
        elements.push(<div key={`br-${idx}`} className="h-4" />);
      }
    });

    addCodeBlock();

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
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [tempMessage, setTempMessage] = useState<Message | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const authTokenCache = useRef<{ token: string; expires: number } | null>(null)

  const getCachedAuthToken = async (): Promise<string> => {
    const now = Date.now();
    const cacheExpiry = 5 * 60 * 1000;

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
      setMessagesLoaded(true);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load session:', error);
      setError('Failed to load chat session');
      setMessages([]);
      setHasStartedChat(false);
      setMessagesLoaded(true);
    } finally {
      setIsInitializing(false);
    }
  }

  const handleSendMessage = async (messageText: string, files?: File[]) => {
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
            streamingContent += token;
            setMessages(prev => prev.map(msg =>
              msg.id === tempAssistantMessage.id
                ? { ...msg, content: streamingContent, isLoading: false }
                : msg
            ));
          },
          (usage?: any, images?: ImageData[]) => {
            streamingUsage = usage;
            streamingImages = images || [];
            setMessages(prev => prev.map(msg =>
              msg.id === tempAssistantMessage.id
                ? { ...msg, content: streamingContent, isLoading: false, images: streamingImages }
                : msg
            ));
          },
          (error: string) => {
            console.error('Streaming error:', error);
            setMessages(prev => prev.map(msg =>
              msg.id === tempAssistantMessage.id
                ? { ...msg, content: `Error: ${error}`, isLoading: false }
                : msg
            ));
          },
          async () => {
            return await getCachedAuthToken();
          }
        );

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
      
      showToast('❌ An error occurred. Please try again.', 'error');
      
      setMessages(prev => prev.map(msg => 
        msg.id === tempAssistantMessage.id ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isLoading: false } : msg
      ))
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
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
    if (!userScrolledUp) {
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        if (isNearBottom) {
          setTimeout(scrollToBottom, 50);
        }
      }
    }
  }, [messages, scrollToBottom, userScrolledUp]);

  if (auth0Loading || (isAuthed && isInitializing)) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1a1a1a]">
        <div className="text-center">
          <Loader />
          <p className="text-sm text-gray-400 mt-4">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full w-full flex-1 pt-16 md:pt-0 relative overflow-hidden bg-[#1a1a1a]"
    >
      <div className="relative z-10 flex flex-col h-full w-full">
        {!isAuthed ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#0a0a0a]">
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-center space-y-6 max-w-3xl">
                <div className="inline-block px-4 py-1.5 bg-gray-800/50 rounded-full border border-gray-700/50 mb-4">
                  <span className="text-sm font-medium text-gray-400">Xcore-ai (Beta)</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
                  Elevate Your<br />
                  <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    AI Experience
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
                  Sign in to unlock powerful AI capabilities and start meaningful conversations
                </p>
              </div>
            </div>
            
            <div className="px-4 pb-8 flex justify-center">
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
          <div className="flex flex-col h-full w-full bg-[#1a1a1a]">
            {!hasStartedChat ? (
              <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                 <img src="/favicon.ico" alt="Xcore AI" className="h-60 w-60 flex-shrink-0" />

                <div className="w-full max-w-2xl text-center space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                      How can I help you today?
                    </h2>
                    <p className="text-lg text-gray-400">
                      Ask me anything - from creative writing to code assistance
                    </p>
                  </div>
                  
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
              <div className="flex flex-col h-full">
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative" style={{ height: 'calc(100vh - 200px)' }}>
                  <div className="min-h-full px-4 py-8">
                    {isInitializing ? (
                      <ChatMessageSkeleton />
                    ) : (
                      <div className="space-y-0 max-w-5xl mx-auto w-full">
                        {messages.map((message, index) => (
                          <div key={message.id} className="w-full">
                            {message.role === 'user' && (
                              <div className="px-6">
                                <div className="text-center space-y-2">
                                  <p className="text-xl md:text-3xl border-[#2a2a2a] border-t-1 ml-0 md:ml-10 slide-in-from-bottom-translate-full text-gray-200 leading-relaxed max-w-4xl flex justify-start">
                                    {message.content}
                                  </p>
                                  {message.attachments && message.attachments.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                      {message.attachments.map(att => (
                                        <span key={att.id} className="text-xs px-3 py-1 bg-gray-800 rounded-full text-gray-400">
                                          📎 {att.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {message.role === 'assistant' && (
                              <div className="py-2 px-6 bg-gradient-to-b from-transparent via-gray-900/20 to-transparent">
                                <div className="max-w-4xl mx-auto">
                                  {message.isLoading ? (
                                    <div className="flex justify-start">
                                      <ThinkingIndicator />
                                    </div>
                                  ) : (
                                    <div className="prose prose-invert prose-lg max-w-none">
                                      <FormattedMessage content={message.content} images={message.images} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}


                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                </div>

                {userScrolledUp && (
                  <button
                    onClick={() => {
                      scrollToBottom();
                      setUserScrolledUp(false);
                    }}
                    className="absolute bottom-24 right-8 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-2xl transition-all duration-200 z-20 border border-gray-700"
                    title="Scroll to bottom"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                )}

                <div className="flex-shrink-0 px-4 py-6">
                  <div className="max-w-4xl mx-auto">
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