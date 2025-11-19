import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { ChatInterface } from "~/components/chat/chat-interface";
import { PaymentDialog } from "~/components/chat/payment-dialog";
import { useAuthApi } from "~/hooks/useAuthApi";
import { useLimitWarnings } from "~/hooks/useLimitWarnings";
import { useToast } from "~/components/ui/toast";
import CardNav from "~/components/CardNav";
import PricingSection4 from "~/components/chat/pricing-section-3";
import { 
  MessageSquare, 
  Plus, 
  User, 
  LogOut, 
  Crown, 
  Trash2,
  History,
  Star,
  Settings,
  BookOpen,
  Menu,
  X,
  HistoryIcon,
  Pointer
} from "lucide-react";
import { ChatService } from '~/services/chatService';
import { UserService } from '~/services/userService';
import { motion, AnimatePresence } from "framer-motion";
import TiltedCard from "~/components/ui/TiltedCard";
import { cn } from "~/lib/utils";
import ProfileSettingsPage from "~/components/profile/profile-page";
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "~/components/ui/sidebar";

import "@fontsource/inter"

// 🔧 SESSION STORAGE KEY
const SESSION_STORAGE_KEY = 'xcore-ai_current_session';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Auth0User {
  sub?: string;
  email: string;
  name?: string;
  picture?: string;
  [key: string]: any;
}

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Sidebar components that use useSidebar hook
function SidebarLogoSection() {
  const { shouldShowText } = useSidebar();
  return (
    <div className="flex items-center gap-2 px-2 py-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
        <MessageSquare className="h-4 w-4 text-white" />
      </div>
      <motion.span
        animate={{
          display: shouldShowText ? "inline-block" : "none",
          opacity: shouldShowText ? 1 : 0,
        }}
        className="text-lg font-bold text-neutral-800 dark:text-neutral-100 whitespace-pre"
      >
        Xcore-ai <span className="text-[10px] bg-yellow-400 text-black px-1 py-0.5 rounded font-semibold ml-1">Beta</span>
      </motion.span>
    </div>
  );
}

function SidebarNewChatButton({ onClick }: { onClick: () => void }) {
  const { shouldShowText, open } = useSidebar();
  return (
    <div className="mb-4">
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors",
          "text-white font-medium shadow-lg hover:shadow-xl",
          !open && "justify-center"
        )}
      >
        <Plus className="h-5 w-5 rounded-2xl flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700" />
        <motion.span
          animate={{
            display: shouldShowText ? "inline-block" : "none",
            opacity: shouldShowText ? 1 : 0,
          }}
          className="whitespace-pre"
        >
          New Chat
        </motion.span>
      </button>
    </div>
  );
}

function SidebarSettingsButton({ onClick }: { onClick: () => void }) {
  const { shouldShowText } = useSidebar();
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg transition-colors text-left"
    >
      <Settings className="h-5 w-5 text-neutral-700 dark:text-neutral-200 flex-shrink-0" />
      <motion.span
        animate={{
          display: shouldShowText ? "inline-block" : "none",
          opacity: shouldShowText ? 1 : 0,
        }}
        className="text-neutral-700 dark:text-neutral-200 text-sm whitespace-pre"
      >
        Settings
      </motion.span>
    </button>
  );
}

function SidebarChatHistorySection({ sessions, currentSessionId, onSelect, onDelete, formatTime, isLoading = false }: any) {
  const { shouldShowText, open } = useSidebar();
  return (
    <div className="flex-1 overflow-y-auto px-2">
      <div className="flex items-center justify-between mb-2 px-2">
        <motion.span
          animate={{
            display: shouldShowText ? "inline-block" : "none",
            opacity: shouldShowText ? 1 : 0,
          }}
          className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide"
        >
          Recent Chats
        </motion.span>
      </div>

      {isLoading ? (
        <div className="space-y-2 px-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <motion.div
          animate={{
            display: shouldShowText ? "block" : "none",
            opacity: shouldShowText ? 1 : 0,
          }}
          className="text-center py-8 px-2"
        >
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No chats yet. Start a new conversation!
          </p>
        </motion.div>
      ) : (
        <div className="space-y-1">
          {sessions.map((session: any) => (
            <div
              key={session.id}
              onClick={() => onSelect(session.id)}
              className={cn(
                "group relative flex items-center gap-2 px-2 py-2.5 rounded-lg cursor-pointer transition-all",
                currentSessionId === session.id
                  ? "bg-neutral-200 dark:bg-neutral-700"
                  : "hover:bg-neutral-200 dark:hover:bg-neutral-700",
                !open && "justify-center"
              )}
            >
              <motion.div
                animate={{
                  display: shouldShowText ? "flex" : "none",
                  opacity: shouldShowText ? 1 : 0,
                }}
                className="flex-1 min-w-0 flex flex-col"
              >
                <span className={cn(
                  "text-sm font-medium truncate",
                  currentSessionId === session.id
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-700 dark:text-neutral-300"
                )}>
                  {session.title}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {formatTime(session.updated_at)}
                </span>
              </motion.div>
              
              <motion.button
                animate={{
                  opacity: shouldShowText ? 1 : 0,
                }}
                onClick={(e) => onDelete(session.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </motion.button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarUserSection({ auth0User, userTier, onProfileClick, onLogout }: any) {
  const { shouldShowText } = useSidebar();
  return (
    <div className=" pb-2">
      <button
        onClick={onProfileClick}
        className={cn(
          "w-full flex items-center gap-2 py-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors",
          !shouldShowText && "justify-center"
        )}
      >
        {auth0User?.picture ? (
          <img
            src={auth0User.picture}
            alt="Profile"
            className="h-8 w-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-white" />
          </div>
        )}
        <motion.div
          animate={{
            display: shouldShowText ? "flex" : "none",
            opacity: shouldShowText ? 1 : 0,
          }}
          className="flex-1 min-w-0 flex flex-col items-start"
        >
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate w-full">
            {auth0User?.name || 'User'}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate w-full">
            {userTier === 'free' ? 'Free Plan' : userTier.replace('_', ' ').toUpperCase() + ' Plan'}
          </span>
        </motion.div>
      </button>

      <button
        onClick={onLogout}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-2 mt-1 rounded-lg hover:bg-red-500/10 transition-colors text-red-600 dark:text-red-400",
          !shouldShowText && "justify-center"
        )}
      >
        <LogOut className="h-5 w-5 flex-shrink-0" />
        <motion.span
          animate={{
            display: shouldShowText ? "inline-block" : "none",
            opacity: shouldShowText ? 1 : 0,
          }}
          className="text-sm font-medium whitespace-pre"
        >
          Logout
        </motion.span>
      </button>
    </div>
  );
}

function UpgradeButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  const { shouldShowText } = useSidebar();
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2.5 mb-2 rounded-lg transition-colors",
        "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
        "text-white font-medium shadow-lg hover:shadow-xl",
        !open && "justify-center"
      )}
    >
      <Crown className="h-4 w-4 flex-shrink-0" />
      <motion.span
        animate={{
          display: shouldShowText ? "inline-block" : "none",
          opacity: shouldShowText ? 1 : 0,
        }}
        className="whitespace-pre"
      >
        Upgrade to Pro
      </motion.span>
    </button>
  );
}

function DashboardContent() {
  const { user: auth0User, logout, getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0<Auth0User>();
  const navigate = useNavigate();
  const { fetchWithAuth } = useAuthApi();
  const [userTier, setUserTier] = useState<'free' | 'starter' | 'pro' | 'pro_plus'>('free');
  const [messageCount, setMessageCount] = useState<number>(0);
  const [nextResetTime, setNextResetTime] = useState<string>('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  
  // 🔧 FIX: Initialize from sessionStorage
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(SESSION_STORAGE_KEY);
    }
    return null;
  });
  
  const [user, setUser] = useState<User | null>(null);
  const [showPricingSection, setShowPricingSection] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState<boolean>(false);
  const [showV0Clone, setShowV0Clone] = useState<boolean>(false);
  const { showToast } = useToast();
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState<boolean>(true);
  const [open, setOpen] = useState(false);

  // 🔧 Setup limit warnings hook - checks for limit thresholds every 60 seconds
  useLimitWarnings(isAuthenticated, 60000);

  // 🔧 FIX: Persist currentSessionId to sessionStorage
  useEffect(() => {
    if (currentSessionId) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, currentSessionId);
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [currentSessionId]);

  // CardNav configuration
  const cardNavItems = [
    {
      label: "Features",
      bgColor: "#6366f1",
      textColor: "#fff",
      links: [
        { label: "AI Chat", href: "/features", ariaLabel: "Learn about AI Chat" },
        { label: "Code Generation", href: "/features", ariaLabel: "Code Generation" },
        { label: "Multi-model", href: "/features", ariaLabel: "Multi-model Support" },
      ]
    },
    {
      label: "Pricing",
      bgColor: "#8b5cf6",
      textColor: "#fff",
      links: [
        { label: "Free Plan", href: "/pricing", ariaLabel: "Free Plan" },
        { label: "Pro Plans", href: "/pricing", ariaLabel: "Pro Plans" },
        { label: "Enterprise", href: "/pricing", ariaLabel: "Enterprise" },
      ]
    },
    {
      label: "Resources",
      bgColor: "#ec4899",
      textColor: "#fff",
      links: [
        { label: "Documentation", href: "/about", ariaLabel: "Documentation" },
        { label: "About Us", href: "/about", ariaLabel: "About Us" },
        { label: "Support", href: "/about", ariaLabel: "Support" },
      ]
    }
  ];

  useEffect(() => {
    if (isAuthenticated && auth0User) {
      initializeUser();
      checkUserSubscription();
      
      const pollInterval = setInterval(checkUserSubscription, 60000);
      
      const handlePaymentSuccess = () => {
        console.log('💳 Payment success event received');
        setTimeout(forceRefreshSubscription, 2000);
      };
      
      window.addEventListener('paymentSuccess', handlePaymentSuccess);
      
      return () => {
        clearInterval(pollInterval);
        window.removeEventListener('paymentSuccess', handlePaymentSuccess);
      };
    }
  }, [isAuthenticated, auth0User]);

  useEffect(() => {
    const handleOpenProfileSettings = () => {
      setShowProfileSettings(true);
    };

    const handleNewChat = () => {
      handleNewChatFunc();
    };

    window.addEventListener('openProfileSettings', handleOpenProfileSettings);
    window.addEventListener('newChat', handleNewChat);
    
    return () => {
      window.removeEventListener('openProfileSettings', handleOpenProfileSettings);
      window.removeEventListener('newChat', handleNewChat);
    };
  }, [user]);

  // 🔧 FIX: Improved new chat handler
  const handleNewChatFunc = async () => {
    if (!user) {
      showToast('Session loading, please wait', 'info');
      return;
    }

    try {
      // Clear the current session completely
      setCurrentSessionId(null);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      
      showToast('Starting new chat', 'success', 1500);
    } catch (error) {
      console.error('Failed to create new chat:', error);
      showToast('Failed to start new chat', 'error');
    }
  };

  const initializeUser = async () => {
    if (!auth0User?.email) {
      console.error('No valid auth0User available');
      return;
    }
    
    try {
      setIsLoadingSessions(true);
      const auth0UserData: Auth0User = {
        sub: auth0User.sub,
        email: auth0User.email,
        name: auth0User.name,
        picture: auth0User.picture
      };
      
      if (!isAuthenticated) {
        console.error('User not authenticated, redirecting to login...');
        logout({ logoutParams: { returnTo: window.location.origin } });
        return;
      }
      
      const getToken = async () => {
        try {
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_API_AUDIENCE,
              scope: 'openid profile email'
            }
          });
          return token;
        } catch (error) {
          console.error('Failed to get access token:', error);
          throw error;
        }
      };
      
      const dbUser = await UserService.getOrCreateUser(auth0UserData, getToken);
      if (!dbUser?.id) {
        console.error('API returned user without ID:', dbUser);
        return;
      }
      
      setUser(dbUser);
      
      const userSessions = await ChatService.getUserChatSessions(dbUser.id, fetchWithAuth);
      setSessions(userSessions);
      
      // 🔧 FIX: Check if stored session still exists
      const storedSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSessionId) {
        const sessionExists = userSessions.some(s => s.id === storedSessionId);
        if (!sessionExists) {
          // Stored session doesn't exist anymore, clear it
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setCurrentSessionId(null);
        }
      }
      
      showToast('Welcome back!', 'success', 2000);
    } catch (error: any) {
      showToast('Failed to load user data', 'error');
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout({ logoutParams: { returnTo: window.location.origin } });
      }
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const checkUserSubscription = async () => {
    try {
      setIsLoadingSubscription(true);
      const usage = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/usage`);
      
      let tier: 'free' | 'starter' | 'pro' | 'pro_plus' = 'free';
      
      if (usage.is_paid === true) {
        if (usage.tier === 'starter') {
          tier = 'starter';
        } else if (usage.tier === 'pro') {
          tier = 'pro';
        } else if (usage.tier === 'pro_plus') {
          tier = 'pro_plus';
        }
      }
        
      setUserTier(tier);
      
      if (usage.daily_message_count !== undefined) {
        setMessageCount(usage.daily_message_count);
      }
      
      // Enhanced limit warnings
      if (tier === 'free') {
        const limit = 50;
        const current = usage.daily_message_count || 0;
        const remaining = limit - current;
        const percentageUsed = (current / limit) * 100;
        
        if (current >= limit) {
          showToast('🚫 Daily limit reached! (50 requests/day) Upgrade to continue.', 'error', 6000);
        } else if (percentageUsed >= 90) {
          showToast(`⚠️ You\'re almost out of requests! Only ${remaining} left today.`, 'warning', 5000);
        } else if (percentageUsed >= 75) {
          showToast(`💡 You have ${remaining} messages remaining today. Consider upgrading!`, 'info', 4000);
        }
      } else if (tier === 'starter') {
        const limit = 500;
        const current = usage.monthly_message_count || usage.prompt_count || 0;
        const remaining = limit - current;
        const percentageUsed = (current / limit) * 100;
        
        if (current >= limit) {
          showToast('🚫 Monthly limit reached! (500 requests/month) Upgrade to Pro.', 'error', 6000);
        } else if (percentageUsed >= 90) {
          showToast(`⚠️ Almost at monthly limit! Only ${remaining} requests left.`, 'warning', 5000);
        } else if (percentageUsed >= 75) {
          showToast(`💡 You\'ve used ${percentageUsed.toFixed(0)}% of your monthly quota.`, 'info', 4000);
        }
      } else if (tier === 'pro') {
        const limit = 2000;
        const current = usage.monthly_message_count || usage.prompt_count || 0;
        const remaining = limit - current;
        const percentageUsed = (current / limit) * 100;
        
        if (current >= limit) {
          showToast('🚫 Monthly limit reached! (2000 requests/month) Upgrade to Pro Plus.', 'error', 6000);
        } else if (percentageUsed >= 90) {
          showToast(`⚠️ Almost at monthly limit! Only ${remaining} requests left.`, 'warning', 5000);
        } else if (percentageUsed >= 75) {
          showToast(`💡 You\'ve used ${percentageUsed.toFixed(0)}% of your monthly quota.`, 'info', 4000);
        }
      }
      // Pro Plus has no limits, no warning needed
      
      // Subscription expiring warning
      if (usage.subscription && usage.subscription.days_remaining !== undefined) {
        const daysRemaining = usage.subscription.days_remaining;
        if (daysRemaining <= 7 && daysRemaining > 0) {
          showToast(`⏰ Your subscription expires in ${daysRemaining} day(s). Renew now!`, 'warning', 5000);
        } else if (daysRemaining <= 0) {
          showToast('🔔 Your subscription has expired. Renew to continue!', 'warning', 5000);
        }
      }
      
      if (usage.last_reset_date) {
        const resetTime = new Date(usage.last_reset_date);
        resetTime.setDate(resetTime.getDate() + 1);
        setNextResetTime(`at ${resetTime.toLocaleTimeString()}`);
      }
      
    } catch (error) {
      console.error('Failed to check subscription:', error);
      setUserTier('free');
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  const forceRefreshSubscription = async () => {
    console.log('🔄 Force refreshing subscription status...');
    await checkUserSubscription();
    
    if (user) {
      try {
        const userSessions = await ChatService.getUserChatSessions(user.id, fetchWithAuth);
        setSessions(userSessions);
      } catch (error) {
        console.error('Failed to reload sessions:', error);
      }
    }
  };

  // 🔧 FIX: Update session selection
  const handleSessionSelect = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    setOpen(false);
  };

  const handleSessionUpdate = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
  };

  const handleDeleteSession = async (sessionId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      await ChatService.deleteChatSession(sessionId, fetchWithAuth);
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
      showToast('Chat deleted', 'success', 1500);
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      showToast('Failed to delete chat', 'error');
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleGetStartedClick = () => {
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-blue-950">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full  flex-col md:flex-row relative">
      {/* CardNav - Only visible when not authenticated */}
      {!isAuthenticated && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <CardNav
            logo="/favicon.ico"
            logoAlt="Xcore-ai Logo"
            items={cardNavItems}
            baseColor="#ffffff"
            menuColor="#000000"
            buttonBgColor="#6366f1"
            buttonTextColor="#ffffff"
            onGetStartedClick={handleGetStartedClick}
          />
        </div>
      )}

      {/* Sidebar - Only show when authenticated */}
      {isAuthenticated && (
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarBody className="justify-between gap-10 md:flex-col">
            <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
              <SidebarLogoSection />
              <SidebarNewChatButton onClick={handleNewChatFunc} />

              <div className="flex flex-col gap-1 mb-4">
                <SidebarLink
                  link={{
                    label: "Starred",
                    href: "#",
                    icon: <Star className="h-5 w-5 text-neutral-700 dark:text-neutral-200 flex-shrink-0" />,
                  }}
                />
                <SidebarLink
                  link={{
                    label: "Documentation",
                    href: "#",
                    icon: <BookOpen className="h-5 w-5 text-neutral-700 dark:text-neutral-200 flex-shrink-0" />,
                  }}
                />
                <SidebarSettingsButton onClick={() => setShowProfileSettings(true)} />
                <SidebarLink
                  link={{
                    label: "History",
                    href: "#",
                    icon: <History className="h-5 w-5 text-neutral-700 dark:text-neutral-200 flex-shrink-0" />,
                  }}
                />
              </div>

              <div className="border-t border-neutral-300 dark:border-neutral-700 my-2 mx-2" />

              <SidebarChatHistorySection 
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelect={handleSessionSelect}
                onDelete={handleDeleteSession}
                formatTime={formatRelativeTime}
                isLoading={isLoadingSessions}
              />

              <div className="border-t border-neutral-300 dark:border-neutral-700 my-2 mx-2" />

              <div className="pb-2">
                {!isLoadingSubscription && userTier === 'free' && (
                  <UpgradeButton open={open} onClick={() => setShowPricingSection(true)} />
                )}
                <SidebarUserSection 
                  auth0User={auth0User}
                  userTier={userTier}
                  onProfileClick={() => setShowProfileCard(true)}
                  onLogout={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                />
              </div>
            </div>
          </SidebarBody>
        </Sidebar>
      )}

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 relative overflow-hidden w-full md:w-auto",
      )}>
        {showProfileSettings && isAuthenticated ? (
          <ProfileSettingsPage
            onClose={() => setShowProfileSettings(false)}
            auth0User={auth0User}
            getAccessTokenSilently={getAccessTokenSilently}
          />
        ) : (
          <ChatInterface 
            userTier={userTier}
            messageCount={messageCount}
            maxDailyMessages={500}
            nextResetTime={nextResetTime}
            currentSessionId={currentSessionId}
            sessions={sessions}
            onSessionUpdate={handleSessionUpdate}
            onNewChat={handleNewChatFunc}
            user={user}
            showPaymentDialog={showPricingSection}
            setShowPaymentDialog={setShowPricingSection}
            isSidebarCollapsed={!open}
            isAuthed={isAuthenticated}
          />
        )}
      </div>

      {/* Profile Card Overlay - Only for authenticated users */}
      {isAuthenticated && (
        <AnimatePresence>
          {showProfileCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowProfileCard(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative max-w-full w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowProfileCard(false)}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <TiltedCard
                  imageSrc={auth0User?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(auth0User?.email || 'User')}&background=6366f1&color=fff&size=300`}
                  altText="Profile Picture"
                  captionText={auth0User?.name || 'User Profile'}
                  containerHeight="100%"
                  containerWidth="100%"
                  imageHeight="270px"
                  imageWidth="275px"
                  scaleOnHover={1.05}
                  rotateAmplitude={8}
                  showMobileWarning={false}
                  showTooltip={true}
                  displayOverlayContent={true}
                  overlayContent={
                    <div className="bg-black/50 border-2 backdrop-blur-sm rounded-[15px] p-6 text-white space-y-4 w-full h-full flex flex-col justify-end">
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold truncate">{auth0User?.name || 'User'}</h3>
                        <p className="text-sm text-gray-300">{auth0User?.email}</p>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            userTier === 'pro_plus' ? 'bg-orange-500/20 text-orange-300' :
                            userTier === 'pro' ? 'bg-purple-500/20 text-purple-300' :
                            userTier === 'starter' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {userTier === 'free' ? 'FREE' : userTier.replace('_', ' ').toUpperCase()} Plan
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-white/20">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Messages Today</p>
                            <p className="font-medium text-white">{messageCount}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Next Reset</p>
                            <p className="font-medium text-white">{nextResetTime || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        {userTier === 'free' ? (
                          <Button
                            onClick={() => {
                              setShowProfileCard(false);
                              setShowPricingSection(true);
                            }}
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg"
                          >
                            <Crown className="h-3 w-3 mr-1" />
                            Upgrade
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              setShowProfileCard(false);
                              setShowPricingSection(true);
                            }}
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg"
                          >
                            <Crown className="h-3 w-3 mr-1" />
                            Upgrade Plan
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            setShowProfileCard(false);
                            logout({ logoutParams: { returnTo: window.location.origin } });
                          }}
                          size="sm"
                          variant="ghost"
                          className="text-white hover:bg-white/10 rounded-lg"
                        >
                          <LogOut className="h-3 w-3 mr-1" />
                          Logout
                        </Button>
                      </div>
                    </div>
                  }
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
      
      {showPricingSection && (
        <div className="fixed inset-0 z-[9999] bg-white overflow-y-auto">
          <PricingSection4 />
          <Button
            onClick={() => setShowPricingSection(false)}
            className="fixed top-4 right-4 z-[10000]"
            variant="outline"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}