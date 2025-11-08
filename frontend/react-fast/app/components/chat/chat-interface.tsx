// components/chat/chat-interface.tsx
import { useState, useRef, useEffect, type JSX } from "react"
import { Send, Paperclip,Share, X, AlertCircle, Plus, Menu, Copy, Check, Brain } from "lucide-react"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { useAuthApi } from "~/hooks/useAuthApi"
import { useAuth0 } from "@auth0/auth0-react"
import { PaymentDialog } from "./payment-dialog"
import { ModelSelector } from "./model-selector"
import { AI_MODELS } from "~/lib/models"
import { ChatService } from '~/services/chatService'
import { motion, AnimatePresence } from "framer-motion"
import React from "react"
import { useDynamicModel } from "~/hooks/useDynamicModel"
import ColorBends from '~/components/ui/ColorBends'
import { useToast } from "~/components/ui/toast"

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

const PROMPT_CATEGORIES = {
  write: ["Write executive summaries", "Compare my writing style to famous authors", "Write compelling CTAs", "Improve my writing style", "Help me develop a unique voice for an audience"],
  learn: ["Explain complex concepts simply", "Create a study plan", "Summarize research papers", "Generate quiz questions", "Help with homework"],
  code: ["Debug this code", "Explain programming concepts", "Write documentation", "Optimize performance", "Code review"],
  life: ["Plan my weekly schedule", "Relationship advice", "Financial planning tips", "Health and wellness advice", "Travel recommendations"],
  claudes: ["Creative brainstorming", "Philosophical discussions", "Book recommendations", "Career guidance", "Personal growth tips"]
}


// Improved CodeBlock with mobile responsiveness and better colors
const CodeBlock = ({ code, language = 'text' }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightCode = (code: string, lang: string): JSX.Element[] => {
    const lines = code.split('\n');
    
    return lines.map((line, idx) => {
      if (!line.trim()) {
        return <div key={idx} className="font-mono text-sm h-5 select-text">&nbsp;</div>;
      }

      const parts: (string | JSX.Element)[] = [];
      let remaining = line;
      let partIndex = 0;

      // Programming keywords to highlight
      const keywords = [
        'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 
        'switch', 'case', 'break', 'continue', 'class', 'extends', 'import', 'export',
        'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'this',
        'public', 'private', 'protected', 'static', 'void', 'int', 'string', 'boolean',
        'number', 'any', 'interface', 'type', 'enum', 'namespace', 'module'
      ];
      
      // Common programming patterns
      const patterns = [
        // Strings
        { regex: /("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/, className: "text-green-400" },
        // Numbers
        { regex: /\b(\d+\.?\d*|\.\d+)\b/, className: "text-orange-400" },
        // Comments
        { regex: /(\/\/.*$|\/\*[\s\S]*?\*\/)/, className: "text-gray-500 italic" },
        // Functions
        { regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/, className: "text-yellow-300" },
        // HTML tags
        { regex: /(<\/?[a-zA-Z][^>]*>)/, className: "text-pink-400" },
        // CSS properties
        { regex: /([a-zA-Z-]+)\s*:/, className: "text-blue-300" }
      ];

      while (remaining.length > 0) {
        let matched = false;

        // Try patterns first
        for (const pattern of patterns) {
          const match = pattern.regex.exec(remaining);
          if (match && match.index === 0) {
            const matchedText = match[0];
            parts.push(
              <span key={partIndex++} className={pattern.className}>
                {matchedText}
              </span>
            );
            remaining = remaining.substring(matchedText.length);
            matched = true;
            break;
          }
        }

        if (matched) continue;

        // Check for keywords
        for (const kw of keywords) {
          if (remaining.startsWith(kw) && (remaining.length === kw.length || !/[a-zA-Z0-9_]/.test(remaining[kw.length]))) {
            parts.push(<span key={partIndex++} className="text-purple-400 font-semibold">{kw}</span>);
            remaining = remaining.substring(kw.length);
            matched = true;
            break;
          }
        }

        if (!matched) {
          // Add single character
          parts.push(remaining[0]);
          remaining = remaining.substring(1);
        }
      }

      return (
        <div key={idx} className="font-mono text-sm text-gray-100 whitespace-pre select-text">
          {parts}
        </div>
      );
    });
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
        <pre className="p-3 sm:p-4 max-w-full">
          <code className="block min-w-0 overflow-x-auto">
            {highlightCode(code, language)}
          </code>
        </pre>
      </div>
    </div>
  );
};

// Improved FormattedMessage with mobile-optimized code blocks
const FormattedMessage = ({ content }: { content: string }) => {
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

    const formatTextWithBold = (line: string): (string | JSX.Element)[] => {
      const parts: (string | JSX.Element)[] = [];
      const boldRegex = /\*\*([^*]+?)\*\*/g;
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.slice(lastIndex, match.index));
        }
        parts.push(
          <strong key={`bold-${parts.length}`} className="font-bold">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
      }

      return parts.length > 0 ? parts : [line];
    };

    lines.forEach((line, idx) => {
      // Handle code blocks
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

      // Handle headings - make them responsive
     if (line.match(/^#{1,6}/)) {
        const level = line.match(/^(#{1,6})/)?.[1].length || 1;
        // Remove all leading #'s and optional spaces — handles ###🌍Global and ### Global both
        const text = line.replace(/^#{1,6}\s*/, '');
        const Tag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;

        
        elements.push(
          React.createElement(Tag, {
            key: idx,
            className: cn(
              "font-bold my-3 break-words",
              level === 1 && "text-xl sm:text-2xl",
              level === 2 && "text-lg sm:text-xl", 
              level === 3 && "text-base sm:text-lg"
            )
          }, formatTextWithBold(text))
        );
        return;
      }

      // Handle lists
      if (line.trim().match(/^[-*•]\s/) || line.trim().match(/^\d+\.\s/)) {
        const text = line.replace(/^[-*•]\s/, '').replace(/^\d+\.\s/, '');
        elements.push(
          <li key={idx} className="ml-4 my-1 break-words">{formatTextWithBold(text)}</li>
        );
        return;
      }

      // Regular text with proper line breaks and word wrapping
      if (line.trim()) {
        elements.push(
          <p key={idx} className="my-2 leading-relaxed break-words whitespace-pre-wrap">
            {formatTextWithBold(line)}
          </p>
        );
      } else {
        elements.push(<br key={idx} />);
      }
    });

    addCodeBlock();
    return elements;
  };

  return <div className="space-y-1 break-words">{formatContent(content)}</div>;
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
  const [tempMessage, setTempMessage] = useState<Message | null>(null)
  const [isLimitReached, setIsLimitReached] = useState(false)
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false)
  const [inputPosition, setInputPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [inputStartPos, setInputStartPos] = useState({ x: 0, y: 0 });
  const [isInputPositioned, setIsInputPositioned] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [hasCalculatedPosition, setHasCalculatedPosition] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const promptCategoriesRef = useRef<HTMLDivElement>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");

  
  // Dynamic model selection hook
  const { selectModel } = useDynamicModel();
  
  // Track dynamic model selection for UI feedback
  const [dynamicModelSelection, setDynamicModelSelection] = useState<{
    isAutoSelected: boolean;
    reason?: string;
    suggestedModel?: string;
  }>({ isAutoSelected: false });

  // Track if user has manually selected a model (vs using default)
  const [userManuallySelected, setUserManuallySelected] = useState(false);

  // Helper function to explain why a model was selected
  const getSelectionReason = (message: string, contextLength: number): string => {
    const msg = message.toLowerCase();
    
    if (/\b(code|debug|function|class|script|python|java|js|c\+\+|error|programming)\b/.test(msg)) {
      return 'Optimized for coding tasks';
    }
    if (/\b(reason|why|analyze|explain|logic|compare|evaluate|complex)\b/.test(msg)) {
      return 'Selected for complex reasoning';
    }
    if (/\b(news|latest|today|headline|update|current)\b/.test(msg)) {
      return 'Fast model for current information';
    }
    if (/[áàâäãåæçéèêëíìîïñóòôöõøúùûüýÿœ]/.test(msg)) {
      return 'Multilingual support';
    }
    if (contextLength > 1000) {
      return 'Large context window needed';
    }
    return 'Best model for your query';
  };

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

  // ✅ ADD THIS: Check if user is authenticated
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

  // Detect mobile device and handle viewport changes
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                            window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Handle virtual keyboard on mobile
    const handleViewportChange = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const isKeyboardOpen = viewportHeight < window.innerHeight * 0.75;
      setIsKeyboardOpen(isKeyboardOpen);
    };
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
    };
  }, []);

  // FIXED: Simplified initial positioning logic
  useEffect(() => {
    if (hasCalculatedPosition || isMobile || hasStartedChat) return;
    
    const calculateInitialPosition = () => {
      requestAnimationFrame(() => {
        if (promptCategoriesRef.current && containerRef.current) {
          try {
            const categoriesRect = promptCategoriesRef.current.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();
            
            if (categoriesRect.height > 0 && containerRect.height > 0) {
              // Calculate position below categories with proper offset
              const categoriesBottom = categoriesRect.bottom;
              const containerTop = containerRect.top;
              const offsetTop = categoriesBottom - containerTop + 40; // Increased gap for better spacing
              
              // Center horizontally
              const inputWidth = 500; // Approximate input width
              const centerX = (containerRect.width / 2) - (inputWidth / 2);
              
              const finalPosition = { 
                x: Math.max(20, centerX), 
                y: Math.max(100, offsetTop) 
              };
              

              
              setInitialPosition(finalPosition);
              setInputPosition(finalPosition);
              setIsInputPositioned(true);
              setHasCalculatedPosition(true);
              setIsInitialLoad(false);
            }
          } catch (error) {
            
            // More reliable fallback position
            const fallbackPosition = { x: 100, y: 400 };
            setInitialPosition(fallbackPosition);
            setInputPosition(fallbackPosition);
            setIsInputPositioned(true);
            setHasCalculatedPosition(true);
            setIsInitialLoad(false);
          }
        } else {
          // Retry if elements aren't ready yet
          setTimeout(calculateInitialPosition, 100);
        }
      });
    };

    // Use a longer timeout to ensure everything is rendered
    const timer = setTimeout(calculateInitialPosition, 500);
    return () => clearTimeout(timer);
  }, [isMobile, hasStartedChat, hasCalculatedPosition]);

  // Handle window resize for recalculation
  useEffect(() => {
    if (hasCalculatedPosition || isMobile || hasStartedChat) return;
    
    const handleResize = () => {
      setHasCalculatedPosition(false); // Reset to recalculate
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hasCalculatedPosition, isMobile, hasStartedChat]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging on desktop or when explicitly touching the drag handle
    if (isMobile) return;
    if (e.target === inputRef.current || (e.target as Element).closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setInputStartPos(inputPosition);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const newX = Math.max(-150, Math.min(inputStartPos.x + deltaX, window.innerWidth - 250));
    const newY = Math.max(0, Math.min(inputStartPos.y + deltaY, window.innerHeight - 200));
    setInputPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsInputPositioned(true);
  };

  // Enhanced touch handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as Element;
    const isDragHandle = target.closest('.drag-handle');
    
    // Allow touch on drag handle or input on mobile
    if (isDragHandle || (isMobile && target === inputRef.current)) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX, 
        y: e.touches[0].clientY 
      });
      setInputStartPos(inputPosition);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const deltaX = e.touches[0].clientX - dragStart.x;
    const deltaY = e.touches[0].clientY - dragStart.y;
    
    // More restrictive bounds for mobile
    const maxX = isMobile ? window.innerWidth - 200 : window.innerWidth - 250;
    const maxY = isMobile ? window.innerHeight - 150 : window.innerHeight - 200;
    const minX = isMobile ? -100 : -150;
    const minY = 0;
    
    const newX = Math.max(minX, Math.min(inputStartPos.x + deltaX, maxX));
    const newY = Math.max(minY, Math.min(inputStartPos.y + deltaY, maxY));
    setInputPosition({ x: newX, y: newY });
  };
  const handleShareChat = async () => {
  try {
    const textToShare = messages
      .map(msg => `${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content}`)
      .join('\n\n')

    if (navigator.share) {
      await navigator.share({
        title: "SkyGPT Chat",
        text: textToShare,
      })
    } else {
      await navigator.clipboard.writeText(textToShare)
      alert("Chat copied to clipboard! You can share it manually.")
    }
  } catch (err) {
    console.error("Share failed:", err)
  }
}

  const handleCopyMessage = async (content: string, messageId: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditedContent(message.content);
  };

  const handleSaveEdit = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, content: editedContent } : msg
    ));
    setEditingMessageId(null);
    setEditedContent("");
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditedContent("");
  };
  const handleTouchEnd = () => {
    setIsDragging(false);
    if (isMobile) {
      // Don't persist positioning on mobile by default
      setIsInputPositioned(false);
    } else {
      setIsInputPositioned(true);
    }
  };

  // Add global mouse and touch listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragStart, inputStartPos, isMobile]);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getWelcomeMessage = () => {
    const userName = auth0User?.name || auth0User?.email?.split('@')[0] || 'there';
    const isNewChat = !hasStartedChat;
    const greeting = getGreeting();
    
    if (isNewChat) {
      return {
        title: `${greeting}, ${userName}!`,
        subtitle: 'Welcome back! How can I assist you today?',
        showWelcome: true
      };
    }
    return {
      title: 'Welcome back!',
      subtitle: 'Continue your conversation or start a new one.',
      showWelcome: false
    };
  };

  // Enhanced mobile keyboard handling and focus management
  useEffect(() => {
    if (isMobile) {
      // Prevent zoom on input focus for better mobile experience
      const inputs = containerRef.current?.querySelectorAll('input, textarea, select');
      inputs?.forEach(input => {
        input.addEventListener('focus', () => {
          (input as HTMLElement).style.fontSize = '16px'; // Prevent zoom on iOS
        });
        
        input.addEventListener('blur', () => {
          (input as HTMLElement).style.fontSize = '';
        });
      });

      // Handle viewport changes for mobile
      const handleViewportChange = () => {
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const documentHeight = document.documentElement.clientHeight;
        const isKeyboardOpen = viewportHeight < documentHeight * 0.75;
        setIsKeyboardOpen(isKeyboardOpen);
        
        // Adjust layout when keyboard opens/closes
        if (containerRef.current) {
          if (isKeyboardOpen) {
            containerRef.current.style.paddingBottom = '20px';
          } else {
            containerRef.current.style.paddingBottom = '';
          }
        }
      };

      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportChange);
      }

      return () => {
        inputs?.forEach(input => {
          input.removeEventListener('focus', () => {
            (input as HTMLElement).style.fontSize = '16px';
          });
          input.removeEventListener('blur', () => {
            (input as HTMLElement).style.fontSize = '';
          });
        });
        
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleViewportChange);
        }
      };
    }
  }, [isMobile]);

  useEffect(() => {
    if (currentSessionId) {
      loadSession(currentSessionId);
      setActiveSessionId(currentSessionId);
    } else {
      // No session selected - start fresh
      setMessages([]);
      setHasStartedChat(false);
      setIsInitializing(false);
      setActiveSessionId(null);
    }
  }, [currentSessionId]);

  const loadSession = async (sessionId: string) => {
  try {
    setIsInitializing(true);
    // ✅ Add fetchWithAuth as second parameter
    const sessionMessages = await ChatService.getChatMessages(sessionId, fetchWithAuth);
    const formattedMessages: Message[] = sessionMessages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: new Date(msg.created_at)
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && pendingAttachments.length === 0) || isLoading) return

    setHasStartedChat(true);
    setActiveCategory(null);
    setIsGenerating(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // Calculate context length for model selection
    const contextLength = messages.reduce((acc, msg) => acc + msg.content.length, 0);

    // Get intelligent model suggestion based on query
    const suggestedModel = selectModel({
      userTier,
      message: newMessage,
      contextLength
    });

    // Show AI suggestion if there's a better model for this query type
    const shouldShowSuggestion = selectedModel !== suggestedModel;

    // Update UI feedback for suggestions
    if (shouldShowSuggestion && suggestedModel) {
      setDynamicModelSelection({
        isAutoSelected: false,
        reason: `💡 Better for this: ${getSelectionReason(newMessage, contextLength)}`,
        suggestedModel: suggestedModel
      });
    } else {
      setDynamicModelSelection({ isAutoSelected: false });
    }

    // Model selection logic
    let modelToUse = selectedModel;
    
    if (!userManuallySelected && !selectedModel) {
      modelToUse = suggestedModel;
     
    } else if (userManuallySelected) {
      console.log('Using user-selected model:', selectedModel);
    }

    // ====== NEW SESSION CREATION LOGIC ======
    let sessionIdToUse = currentSessionId;
    
    // If no current session exists, create one NOW (when user sends first message)
    if (!sessionIdToUse && user) {
  try {
    showToast('Creating new chat session...', 'info', 2000);
    // ✅ Pass title first, then fetchWithAuth
    const newSession = await ChatService.createChatSession('New Chat', fetchWithAuth);
    sessionIdToUse = newSession.id;
    
    // Update the sessions list in parent component
    onSessionUpdate([newSession, ...sessions]);
    
    // Store the new session ID temporarily
    setActiveSessionId(newSession.id);
    
    console.log('New session created:', newSession.id);
  } catch (error) {
    console.error('Failed to create chat session:', error);
    setIsLoading(false);
    setIsGenerating(false);
    // Show error to user
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Sorry, I couldn\'t create a new chat session. Please try again.',
      timestamp: new Date(),
      isLoading: false
    }]);
    if (error === 402) {
        showToast('Daily limit reached. Upgrade to continue.','error');
        setShowPaymentDialog(true);
      } else if (error === 403) {
        showToast('This model requires Pro subscription', 'error');
      } else if (error === 'AbortError') {
        showToast('Response stopped','info');
      } else {
        showToast('Failed to send message. Please try again.','error');
      }
    return;
  }
}
    // ====== END SESSION CREATION LOGIC ======

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: newMessage,
      timestamp: new Date(),
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined
    }

    setMessages(prev => [...prev, userMessage])
    setNewMessage("")
    setPendingAttachments([])
    setIsLoading(true)

    // Use the session ID (either existing or newly created)
    if (sessionIdToUse && user) {
      try {
        await ChatService.saveMessage(sessionIdToUse, 'user', newMessage, modelToUse, undefined, fetchWithAuth)
        
        // Update session title with first message
        if (messages.length === 0) {
          const title = newMessage.slice(0, 50) + (newMessage.length > 50 ? '...' : '')
          // ✅ Add fetchWithAuth as last parameter
          await ChatService.updateSessionTitle(sessionIdToUse, title, fetchWithAuth)
          
          // Update the session title in the list
          onSessionUpdate(sessions.map(s => 
            s.id === sessionIdToUse ? { ...s, title } : s
          ))
        }
      } catch (error) {
        console.error('Failed to save user message:', error)
      }
    }

    const tempAssistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    }
    setMessages(prev => [...prev, tempAssistantMessage])

    try {
      const apiMessages = [...messages, userMessage]
        .filter(msg => msg.role !== 'assistant' || !msg.isLoading)
        .map(msg => ({ role: msg.role, content: msg.content }))

      if (pendingAttachments.length > 0) {
        apiMessages[apiMessages.length - 1].content += '\n' + pendingAttachments.map(a => `[Attachment: ${a.name}]`).join('\n')
      }

      const response = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/chat`, {
        method: 'POST',
        body: JSON.stringify({ messages: apiMessages, model: modelToUse, temperature: 0.7, max_tokens: 1000 }),
        signal: abortControllerRef.current.signal
      })

      

      const messageContent = response.message || response.data?.message || response.content || response.choices?.[0]?.message?.content || response.result;
      
      if (!messageContent) {
       
        throw new Error('No message content received from API');
      }

      setMessages(prev => prev.map(msg => 
        msg.id === tempAssistantMessage.id ? { ...msg, content: messageContent, isLoading: false } : msg
      ))

      setDynamicModelSelection({ isAutoSelected: false });

      // Save assistant message using the session ID
      if (sessionIdToUse && user) {
        await ChatService.saveMessage(sessionIdToUse, 'assistant', messageContent, modelToUse, response.usage?.total_tokens, fetchWithAuth)
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prev => prev.map(msg => 
          msg.id === tempAssistantMessage.id ? { ...msg, content: 'Response stopped by user.', isLoading: false } : msg
        ))
        return;
      }

     
      if (error.status === 402 || error?.message?.includes('limit reached')) {
        setTempMessage(tempAssistantMessage)
        if (error?.message?.includes('Daily limit reached')) {
          setMessages(prev => prev.filter(msg => msg.id !== tempAssistantMessage.id));
          setIsLimitReached(true);
        }
        setShowPaymentDialog(true)
        return
      }
      setMessages(prev => prev.map(msg => 
        msg.id === tempAssistantMessage.id ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isLoading: false } : msg
      ))
    } finally {
      setIsLoading(false)
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }

 const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    
    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        showToast(`File "${file.name}" is too large (max 10MB)`, 'error');
        return;
      }
      
      setPendingAttachments(prev => [...prev, {
        id: Date.now().toString() + Math.random(),
        type: file.type,
        url: URL.createObjectURL(file),
        name: file.name,
        file
      }]);
      
      showToast(`File "${file.name}" attached`, 'success');
    });
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments(prev => prev.filter(a => {
      if (a.id === id) { URL.revokeObjectURL(a.url); return false; }
      return true;
    }))
  }

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

  // RETURN SECTION - Everything below this stays exactly the same as your original
  return (
    <div className="flex flex-col h-full relative">
      


      {onMenuClick && (
        <div className="lg:hidden fixed top-4 left-4 z-30">
          <Button onClick={onMenuClick} variant="ghost" size="icon" className="bg-background/80 backdrop-blur-sm border">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      )}

      {showPaymentDialog && (
        <PaymentDialog
          onClose={() => {
            setShowPaymentDialog(false)
            setIsLimitReached(false)
            if (tempMessage) {
              setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
              setTempMessage(null)
            }
          }}
          onSuccess={() => {
            setShowPaymentDialog(false)
            if (tempMessage) {
              const lastUserMsg = messages[messages.length - 2];
              if (lastUserMsg?.role === 'user') setNewMessage(lastUserMsg.content)
            }
            setTempMessage(null)
          }}
          showLimitReachedMessage={isLimitReached}
        />
      )}

      {/* Mobile Responsive Messages Area */}
      <div 
        className="flex-1 overflow-y-auto" 
        ref={containerRef}
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}
      >
        
  
        
<div className={cn(
  "min-h-full transition-colorsx duration-500",
  hasStartedChat ? (
    isMobile ? "pb-20 px-3 space-y-4" : "bg-[#0f0f0f] px-4 sm:px-8 py-6 space-y-6"
  ) : (
    isMobile ? "pb-28 flex items-center justify-center px-3" : "pb-32 flex items-center justify-center px-4"
  )
)}>
         {!hasStartedChat ? (
            <div className="relative w-full max-w-4xl mx-auto">
              {/* ColorBends background */}
              <div className="absolute inset-0 rounded-4xl overflow-hidden z-10">
                <ColorBends
                  colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
                  rotation={37}
                  speed={0.2}
                  scale={2}
                  frequency={3}
                  warpStrength={1.2}
                  mouseInfluence={0.8}
                  parallax={0.9}
                  noise={0.1}
                  transparent
                />
              </div>
              
              {/* Welcome content */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="relative p-10 rounded-4xl text-center space-y-8 px-4 bg-[#0f0f0f]/80 backdrop-blur-sm border-2 border-white/10 "
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-400 bg-clip-text text-transparent">
                      {getWelcomeMessage().title}
                    </h1>
                    <p className="text-lg sm:text-xl text-muted-foreground">
                      {getWelcomeMessage().subtitle}
                    </p>
                  </div>
                </div>
                
                {/* FIXED: Prompt categories with proper ref and min-height */}
                <div 
                  className="flex flex-wrap justify-center gap-2" 
                  ref={!hasStartedChat ? promptCategoriesRef : null}
                  style={{ minHeight: '40px' }}
                >
                  {Object.keys(PROMPT_CATEGORIES).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                      className={cn("px-4 py-2 rounded-full border text-sm font-bold transition-all ",
                        activeCategory === cat ? "bg-[#0f0f0f] text-primary-foreground" : "bg-card/80 hover:bg-card"
                      )}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
                
                <AnimatePresence>
                  {activeCategory && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="grid md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                        {(PROMPT_CATEGORIES as any)[activeCategory]?.map((p: string, i: number) => (
                          <button key={i} onClick={() => { setNewMessage(p); setActiveCategory(null); inputRef.current?.focus(); }}
                            className="text-left p-3 rounded-lg border bg-card/50 hover:bg-card text-sm">
                            {p}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Show input position hint for desktop users */}
                {!isInputPositioned && !isMobile && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground/50 italic"
                  >
                    💡 Drag the input box anywhere you like!
                  </motion.div>
                )}
              </motion.div>
            </div>
          ) : (
            
            <div className="max-w-full mx-auto w-full space-y-4 px-2 sm:px-4 pb-24 ">
              <div className="absolute top-4 left-1 z-20">
                <Button size="icon" onClick={handleShareChat} className="bg-transparent hover:bg-white/10 "> 
                  <Share className="h-6 w-6 text-white" />
                </Button>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-card/90 border rounded-lg text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex w-full gap-3 items-start group",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* User Message with Actions */}
                    {msg.role === "user" ? (
                      <div className="flex flex-col items-end max-w-full sm:max-w-[85%]">
                        {/* Action Buttons - Only show on hover for desktop, always show on mobile */}
                        <div className={cn(
                          "flex items-center gap-1 transition-all duration-200",
                          isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}>
                          {editingMessageId === msg.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(msg.id)}
                                className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                                title="Save changes"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                title="Cancel edit"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditMessage(msg)}
                                className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                title="Edit message"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleCopyMessage(msg.content, msg.id)}
                                className="p-1.5 text-gray-400 hover:bg-gray-400/10 rounded-lg transition-colors"
                                title="Copy message"
                              >
                                {copiedMessageId === msg.id ? (
                                  <Check className="h-3.5 w-3.5 text-green-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                        
                        {/* Message Content */}
                        <div
                          className={cn(
                            "px-4 rounded-2xl leading-relaxed text-sm sm:text-base whitespace-pre-wrap break-words overflow-hidden",
                            "text-white relative"
                          )}
                        >
                          {msg.isLoading ? (
                            <div className="flex gap-2">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                            </div>
                          ) : editingMessageId === msg.id ? (
                            <textarea
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              className="w-full bg-transparent text-white outline-none resize-none min-h-[80px]"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                  handleSaveEdit(msg.id);
                                }
                                if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                            />
                          ) : (
                            <FormattedMessage content={msg.content} />
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Assistant Message (unchanged) */
                      <div
                        className={cn(
                          "max-w-full sm:max-w-[85%] px-4 py-2 rounded-2xl leading-relaxed text-sm sm:text-base whitespace-pre-wrap break-words overflow-hidden",
                          "text-white backdrop-blur-lg rounded-bl-none"
                        )}
                      >
                        {msg.isLoading ? (
                          <div className="flex gap-2">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                          </div>
                        ) : (
                          <FormattedMessage content={msg.content} />
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* FIXED: Mobile Input Always Fixed to Bottom */}
      <div 
        className={cn(
          "fixed z-30 ",
          // Mobile: Always fixed to bottom, no drag functionality
          isMobile ? "bottom-0 left-0 right-0 px-4 p-0" : "",
          // Desktop: Positioning based on calculated position
          !isMobile ? (
            hasCalculatedPosition ? "cursor-move transition-all duration-300" : ""
          ) : "",
          isDragging && !isMobile && "cursor-grabbing scale-105"
        )}
        style={{
          // Mobile: Completely fixed to bottom with safe area
          left: isMobile ? '0' : (isInputPositioned && !isMobile && hasCalculatedPosition) ? `${inputPosition.x}px` : '50%',
          top: isMobile ? 'auto' : (isInputPositioned && !isMobile && hasCalculatedPosition) ? `${inputPosition.y}px` : 'auto',
          bottom: isMobile ? '0' : 'auto',
          right: isMobile ? '0' : (isInputPositioned && !isMobile && hasCalculatedPosition) ? 'auto' : 'auto',
          transform: isMobile ? 'none' : (isInputPositioned && !isMobile && hasCalculatedPosition) ? 'none' : 'translateX(-50%)',
          transition: isDragging && !isMobile ? 'none' : isMobile ? 'none' : 'all 0.3s ease'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className={cn(
          isMobile ? "w-full max-w-none" : "max-w-md sm:max-w-lg",
          isInputPositioned && !isMobile ? "mx-0" : isMobile ? "mx-auto" : "mx-auto"
        )}>
          {pendingAttachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {pendingAttachments.map((a) => (
                <div key={a.id} className="relative group bg-card/90 border rounded-lg p-2 pr-8">
                  <div className="flex items-center gap-2">
                    {a.type.startsWith("image/") ? (
                      <img src={a.url} alt={a.name} className="w-8 h-8 object-cover rounded" />
                    ) : (
                      <Paperclip className="w-4 h-4" />
                    )}
                    <span className="text-xs truncate max-w-[150px]">{a.name}</span>
                  </div>
                  <button type="button" onClick={() => removeAttachment(a.id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleSendMessage}>
            {/* Input Container */}
            <div className="relative group">
              {/* Drag Handle - only show on desktop and when positioned */}
              {!isMobile && hasCalculatedPosition && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1 drag-handle">
                  <span>↕</span>
                  <span>Drag me</span>
                </div>
              )}
              
              <div className={cn(
                "flex flex-col items-end  bg-[#0f0f0f]  rounded-2xl border-3 inset[shadow(255,255,255,00.5)] backdrop-blur-sm shadow[0_4px_30px_rgba(0,0,0,0.5)] inset[0_4px_30px_rgba(0,0,0,0.5)]",
                // Mobile: Optimized for bottom positioning with proper padding and safe areas
                isMobile ? (
                  isKeyboardOpen 
                    ? "p-3 max-h-[150px] rounded-t-2xl rounded-b-none" 
                    : "p-3 max-h-[200px] "
                ) : "p-3 sm:p-4"
              )}>
                <textarea
                  ref={inputRef as any}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Ask anything..."
                  disabled={isLoading}
                  rows={1}
                  className={cn(
                    "flex-1 w-full bg-transparent outline-none resize-none overflow-hidden placeholder:text-muted-foreground/60 leading-relaxed",
                    "touch-manipulation",
                    isMobile ? "text-base min-h-[44px] max-h-[120px] text-white" : "text-white text-sm sm:text-base min-h-[32px] max-h-[200px]"
                  )}
                  style={{
                    minHeight: isMobile ? '44px' : '32px',
                    maxHeight: isMobile ? '120px' : '200px',
                    fontSize: isMobile ? '16px' : '14px',
                    lineHeight: '1.5'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    const maxHeight = isMobile ? 120 : 200;
                    const minHeight = isMobile ? 44 : 32;
                    target.style.height = `${minHeight}px`;
                    target.style.height = `${Math.min(target.scrollHeight, maxHeight)}px`;
                  }}
                  onFocus={() => {
                    // Small delay to allow keyboard to appear before scrolling
                    if (isMobile) {
                      setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ 
                          behavior: "auto",
                          block: "end"
                        });
                      }, 500);
                    }
                  }}
                />

                <div className={cn(
                  "flex items-center justify-between gap-2 w-full",
                  isMobile ? "flex-wrap" : "flex-nowrap"
                )}>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    multiple
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("file-upload")?.click()}
                    disabled={isLoading}
                    className={cn(
                      "rounded-lg text-stone-50 flex-shrink-0",
                      isMobile ? "p-3" : "p-2"
                    )}
                  >
                    <Plus className={cn(isMobile ? "w-6 h-6" : "w-5 h-5")} />
                  </button>

                  <ModelSelector 
                    selectedModel={selectedModel} 
                    onModelChange={(model) => {
                      setSelectedModel(model);
                      setUserManuallySelected(true);
                    }} 
                    userTier={userTier} 
                  />
                  
                  {/* AI Model Suggestion Indicator */}
                  {dynamicModelSelection.suggestedModel && selectedModel !== dynamicModelSelection.suggestedModel && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-2 px-3 py-1.5 "
                    >
                      <Brain className="w-3 h-3 text-green-300" />
                      <span className="text-xs text-green-200 font-medium">AI Suggestion</span>
                      <div className="w-1 h-1 bg-green-300 rounded-full"></div>
                      <span className="text-xs text-green-300 truncate max-w-[80px]" title={dynamicModelSelection.reason}>
                        {dynamicModelSelection.reason}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedModel(dynamicModelSelection.suggestedModel!);
                          setUserManuallySelected(true);
                        }}
                        className="text-xs text-green-300 hover:text-green-200 underline ml-1"
                      >
                        Use
                      </button>
                    </motion.div>
                  )}

                  {isGenerating ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className={cn(
                        "text-white rounded-lg transition-colors flex-shrink-0",
                        isMobile ? "p-3" : "p-2"
                      )}
                      aria-label="Stop generation"
                    >
                      <X className={cn(isMobile ? "w-6 h-6" : "w-5 h-5")} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading || (!newMessage.trim() && pendingAttachments.length === 0)}
                      className={cn(
                        "text-white rounded-lg transition-colors disabled:opacity-70 flex-shrink-0",
                        isMobile ? "p-3" : "p-2"
                      )}
                    >
                      <Send className={cn(isMobile ? "w-6 h-6" : "w-5 h-5")} />
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 border-t border-white/5 pt-2 flex justify-between">
                  <span>
                    Upgrade to Student Starter to unlock all features and more credits
                  </span>
                  
                </div>
              </div>
            </div>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-3">
            {isMobile ? "AI can make mistakes. Check  info." : "AI can make mistakes. Check important info."}
            {!isMobile && hasCalculatedPosition && (
              <span className="block mt-1 text-[10px] opacity-60">
                💡 Positioned  drag to move
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}


