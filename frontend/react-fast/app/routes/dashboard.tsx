import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { ProtectedRoute } from "~/components/protected-route";
import { Button } from "~/components/ui/button";
import { ChatInterface } from "~/components/chat/chat-interface";
import { PaymentDialog } from "~/components/chat/payment-dialog";
import { useAuthApi } from "~/hooks/useAuthApi";
import { useToast } from "~/components/ui/toast";
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
        SkyGPT
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

function SidebarChatHistorySection({ sessions, currentSessionId, onSelect, onDelete, formatTime }: any) {
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

      {sessions.length === 0 ? (
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
    <div className="px-2 pb-2">
      <button
        onClick={onProfileClick}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors",
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
            {userTier === 'pro' ? 'Pro Plan' : 'Free Plan'}
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
  const { user: auth0User, logout, getAccessTokenSilently, isAuthenticated } = useAuth0<Auth0User>();
  const { fetchWithAuth } = useAuthApi();
  const [userTier, setUserTier] = useState<'free' | 'pro'>('free');
  const [messageCount, setMessageCount] = useState<number>(0);
  const [nextResetTime, setNextResetTime] = useState<string>('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState<boolean>(false);
  const [showV0Clone, setShowV0Clone] = useState<boolean>(false);
  const { showToast } = useToast();
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (auth0User) {
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
  }, [auth0User]);

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

  const handleNewChatFunc = async () => {
    if (!user) {
      showToast('Session loading, please wait', 'info');
      return;
    }

    try {
      setCurrentSessionId(null); 
      showToast('Starting new chat', 'success', 1500);
    } catch (error) {
      console.error('Failed to create new chat:', error);
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
      
      setCurrentSessionId(null);
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
      const usage = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/usage`);
      
      let tier: 'free' | 'pro' = 'free';
      
      if (usage.is_paid === true && usage.subscription_tier === 'pro') {
        tier = 'pro';
      }
      
      setUserTier(tier);
      
      if (usage.daily_message_count !== undefined) {
        setMessageCount(usage.daily_message_count);
      }
      
      if (tier === 'free' && usage.daily_message_count >= 20) {
        const remaining = 25 - usage.daily_message_count;
        showToast(`You have ${remaining} messages remaining today`, 'warning');
      }
      
      if (usage.last_reset_date) {
        const resetTime = new Date(usage.last_reset_date);
        resetTime.setDate(resetTime.getDate() + 1);
        setNextResetTime(`at ${resetTime.toLocaleTimeString()}`);
      }
      
    } catch (error) {
      console.error('Failed to check subscription:', error);
      setUserTier('free');
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

  const handleSessionSelect = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setOpen(false); // Close mobile sidebar on selection
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

  return (
    <div className="flex h-screen w-full bg-gradient-to-b from-sky-300 to-pink-300  flex-col md:flex-row">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10 md:flex-col">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {/* Logo */}
            <SidebarLogoSection />

            {/* New Chat Button */}
            <SidebarNewChatButton onClick={handleNewChatFunc} />

            {/* Navigation Links */}
            <div className="flex flex-col gap-1 mb-4 ">
              
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
              
              <SidebarSettingsButton
                              
              onClick={() => setShowProfileSettings(true)} />
              <SidebarLink
                link={{
                  label: "History",
                  href: "#",
                  icon: <History className="h-5 w-5 text-neutral-700 dark:text-neutral-200 flex-shrink-0" />,
                }}
              />
            </div>

            {/* Divider */}
            <div className="border-t border-neutral-300 dark:border-neutral-700 my-2 mx-2" />

            {/* Chat History */}
            <SidebarChatHistorySection 
              sessions={sessions}
              currentSessionId={currentSessionId}
              onSelect={handleSessionSelect}
              onDelete={handleDeleteSession}
              formatTime={formatRelativeTime}
            />

            {/* Divider before user section */}
            <div className="border-t border-neutral-300 dark:border-neutral-700 my-2 mx-2" />

            {/* User Profile Section */}
            <div className=" pb-2">
              {/* Upgrade Button */}
              {userTier === 'free' && (
                <UpgradeButton open={open} onClick={() => setShowPaymentDialog(true)} />
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden w-full md:w-auto">
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
            showPaymentDialog={showPaymentDialog}
            setShowPaymentDialog={setShowPaymentDialog}
            isSidebarCollapsed={!open}
          />
        )}
      </div>

      {/* Profile Card Overlay */}
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
                          userTier === 'pro' ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {userTier.toUpperCase()} Plan
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
                      {userTier === 'free' && (
                        <Button
                          onClick={() => {
                            setShowProfileCard(false);
                            setShowPaymentDialog(true);
                          }}
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg"
                        >
                          <Crown className="h-3 w-3 mr-1" />
                          Upgrade
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
      
      {showPaymentDialog && (
        <PaymentDialog
          onClose={() => setShowPaymentDialog(false)}
          onSuccess={() => {
            setShowPaymentDialog(false);
            forceRefreshSubscription();
          }}
        />
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}