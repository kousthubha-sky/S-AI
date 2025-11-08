// routes/dashboard.tsx
import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { ProtectedRoute } from "~/components/protected-route";
import { Button } from "~/components/ui/button";
import { ChatInterface } from "~/components/chat/chat-interface";
import { useAuthApi } from "~/hooks/useAuthApi";
import { useToast } from "~/components/ui/toast";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar
} from "~/components/ui/sidebar";
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
  ChevronDown,
  X,
  ArrowRight,
  Menu
} from "lucide-react";
import { ChatService } from '~/services/chatService';
import { UserService } from '~/services/userService';
import { motion, AnimatePresence } from "framer-motion";
import TiltedCard from "~/components/ui/TiltedCard";
import { cn } from "~/lib/utils";
import ProfileSettingsPage from "~/components/profile/profile-page";

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

// Navigation sections
const navigationSections = [
  {
    id: 'playground',
    label: 'Playground',
    icon: MessageSquare,
    items: [
      { id: 'history', label: 'History', icon: History },
      { id: 'starred', label: 'Starred', icon: Star },
    ]
  },
  {
    id: 'documentation',
    label: 'Documentation',
    icon: BookOpen,
    items: []
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    items: []
  }
];

function DashboardContent() {
  const { user: auth0User, logout, getAccessTokenSilently,isAuthenticated } = useAuth0<Auth0User>();
  const { fetchWithAuth } = useAuthApi();
  const { state: sidebarState } = useSidebar();
  const [userTier, setUserTier] = useState<'free' | 'pro'>('free');
  const [messageCount, setMessageCount] = useState<number>(0);
  const [nextResetTime, setNextResetTime] = useState<string>('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('playground');
  const [activeNav, setActiveNav] = useState<string>('history');
  const [showProfileSettings, setShowProfileSettings] = useState<boolean>(false);
  const [showV0Clone, setShowV0Clone] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isCollapsed = sidebarState === 'collapsed';
  const { showToast } = useToast();
  
  useEffect(() => {
    if (auth0User) {
      
      initializeUser();
      checkUserSubscription();
      
      const pollInterval = setInterval(checkUserSubscription, 60000);
      return () => clearInterval(pollInterval);
    }
  }, [auth0User]);

  useEffect(() => {
    // Add event listener for profile settings from command palette
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
      showToast('session loading please wait','info');
      return;
    }

    try {
      setCurrentSessionId(null); 
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  // In dashboard.tsx - REPLACE the initializeUser function with this:

const initializeUser = async () => {
  if (!auth0User?.email) {
    console.error('No valid auth0User available');
    return;
  }
  
  try {
    const auth0UserData: Auth0User = {
      sub: auth0User.sub,
      email: auth0User.email,
      name: auth0User.name,
      picture: auth0User.picture
    };
    
    // ✅ Check authentication status
    if (!isAuthenticated) {
      console.error('User not authenticated, redirecting to login...');
      logout({ logoutParams: { returnTo: window.location.origin } });
      return;
    }
    
    // ✅ Create token getter function that Auth0 SDK will use
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
    
    // ✅ Pass the token getter to UserService
    const dbUser = await UserService.getOrCreateUser(auth0UserData, getToken);
    if (!dbUser?.id) {
      console.error('API returned user without ID:', dbUser);
      return;
    }
    
    setUser(dbUser);
    
    // Get user sessions using fetchWithAuth
    const userSessions = await ChatService.getUserChatSessions(dbUser.id, fetchWithAuth);
    setSessions(userSessions);
    
    // Don't auto-select first session - let user choose
    setCurrentSessionId(null);
     showToast('Welcome back!', 'success');
  } catch (error: any) {
    showToast('Failed to load user data', 'error');
    
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      logout({ logoutParams: { returnTo: window.location.origin } });
    }
  }
};

  const checkUserSubscription = async () => {
    try {
      const usage = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/usage`);
      
      let tier: 'free' | 'pro' = 'free';
      if (usage.is_paid && usage.subscription_tier === 'pro') {
        tier = 'pro';
      }
      
      setUserTier(tier);
      
      if (usage.daily_message_count !== undefined) {
        setMessageCount(usage.daily_message_count);
      }
      if (usage.daily_message_count >= 20 && !usage.is_paid) {
        showToast('You have 5 messages remaining today', 'warning');
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

  const handleSessionSelect = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
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
        // FIXED: When deleting current session, go to welcome screen instead of auto-selecting
        setCurrentSessionId(null);
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error);
    }
  };

const toggleSection = (sectionId: string) => {
  if (sectionId === 'settings') {
    setShowProfileSettings(true);
    setActiveNav('settings');
    setIsMobileSidebarOpen(false); // Close sidebar for settings
  } else if (sectionId === 'documentation') {
    setShowV0Clone(true);
    setActiveNav('documentation');
    setIsMobileSidebarOpen(false); // Close sidebar for documentation
  } else {
    setExpandedSection(expandedSection === sectionId ? '' : sectionId);
    // Don't close sidebar for playground section to keep session list visible
  }
};

  return (
    <div className="min-h-screen text-foreground flex w-full ">
      {/* Left Sidebar - Always Accessible */}
    
        <Sidebar 
          side="left"
          variant="sidebar"
          collapsible="icon" 
          className={cn(
            "bg-[#0f0f0f] border-r-4 backdrop-blur-xl transition-all duration-300",
            // Add this line to hide on mobile:
            "hidden lg:flex",
            isCollapsed ? "w-16 opacity-100" : "w-64 opacity-100"
          )}
          data-sidebar
        >

        <SidebarHeader className={cn(
          "border-b-2 flex items-center",
          isCollapsed ? "p-2 h-12" : "p-3 h-16"
        )}>
          {/* Always show toggle button and logo */}
          <div className="flex items-center gap-3 px-2 w-full">
            
            {!isCollapsed ? (
              <>
                <div className="w-9 h-9 rounded-lg border-b-2 border-r-2 flex items-center justify-center ">
                  <SidebarTrigger className="h-4 w-4 text-white" data-sidebar-trigger />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold font-mono truncate text-white" >SkyGPT</h2>
                </div>
              </>
            ) : (
              <div className="w-8 h-8 flex items-center justify-center">
                <SidebarTrigger className="h-4 w-4 text-white hover:bg-black" />
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className={cn(
          "p-2 flex-1 overflow-hidden",
          // FIXED: Keep icons visible when collapsed, only hide text
          isCollapsed ? "opacity-100 " : "opacity-100"
        )}>
          <SidebarMenu className={cn(
            "space-y-1",
            !isCollapsed && "space-y-2"
          )}>
            {/* New Chat Button - Always Visible */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleNewChatFunc}
                tooltip={isCollapsed ? "New Chat" : undefined}
                className={cn(
                  "w-full bg-[#0f0f0f] hover:bg-[#0f0f0f] hover:text-white border-2 border-transparent hover:border-transparent",
                  isCollapsed && "px-2 justify-center"
                )}
              >
                <Plus className={cn("h-4 w-4", isCollapsed ? "text-white" : "mr-2 text-white")} />
                {!isCollapsed && <span className="text-primary font-medium">New Chat</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            {navigationSections.map((section) => (
              <SidebarMenuItem key={section.id}>
                <SidebarMenuButton
                  onClick={() => toggleSection(section.id)}
                  isActive={activeNav === section.id}
                  variant="default"
                  className={cn(
                    "w-full text-white",
                    isCollapsed && "px-2 justify-center"
                  )}
                  tooltip={isCollapsed ? section.label : undefined}
                >
                  <section.icon className={cn("h-4 w-4 text-white", isCollapsed ? "" : "mr-2")} />
                  {!isCollapsed && <span className="text-white">{section.label}</span>}
                  {!isCollapsed && section.items.length > 0 && (
                    <ChevronDown 
                      className={cn(
                        "h-4 w-4 ml-auto transition-transform",
                        expandedSection === section.id && "rotate-180"
                      )}
                    />
                  )}
                </SidebarMenuButton>
                
                {section.items.length > 0 && expandedSection === section.id && !isCollapsed && (
                  <SidebarMenuSub>
                    {section.id === 'playground' ? (
                      // Show chat sessions for playground
                      sessions.slice(0, 10).map((session) => (
                        <SidebarMenuSubItem key={session.id}>
                          <SidebarMenuSubButton
                            onClick={() => {
                              handleSessionSelect(session.id);
                              setActiveNav('history');
                            }}
                            isActive={currentSessionId === session.id}
                            className="pr-8 text-white hover:bg-[#0f0f0f]"
                          >
                            <ArrowRight className="h-3 w-3 text-white bg-white rounded-3xl" />
                            <span className="truncate text-white">{session.title}</span>
                          </SidebarMenuSubButton>
                          <SidebarMenuAction
                            onClick={(e) => handleDeleteSession(session.id, e)}
                          >
                            <Trash2 className="h-3 w-3 text-red-700 hover:glow" />
                          </SidebarMenuAction>
                        </SidebarMenuSubItem>
                      ))
                    ) : (
                      // Show regular sub-items
                      section.items.map((item) => (
                        <SidebarMenuSubItem key={item.id}>
                          <SidebarMenuSubButton
                            onClick={() => setActiveNav(item.id)}
                            isActive={activeNav === item.id}
                            className="text-white hover:bg-[#0f0f0f]"
                          >
                            <item.icon className="h-3 w-3 text-white" />
                            <span className="text-white">{item.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))
                    )}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-3 border-t-2 ">
          {!isCollapsed && userTier === 'free' && (
            <Button
              onClick={() => setShowPaymentDialog(true)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg h-10 mb-2"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </Button>
          )}
          
          {auth0User && (
            <SidebarMenuButton
              onClick={() => setShowProfileCard(true)}
              tooltip={isCollapsed ? auth0User.name : undefined}
              
            >
              {auth0User.picture ? (
                <img 
                  src={auth0User.picture} 
                  alt="Profile" 
                  className={cn(
                    "h-6 rounded-full object-cover",
                    isCollapsed ? "w-10" : "w-10"
                  )}
                />
              ) : (
                <User className="h-4 w-4" />
              )}
              {!isCollapsed && (
                <span className="truncate text-white">{auth0User.name}</span>
              )}
            </SidebarMenuButton>
          )}
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 relative transition-all duration-300",
        isCollapsed ? "ml-0" : "ml-0"
      )}>
        {/* Top Bar */}
        <div className=" bg-[#0f0f0f] z-10 flex items-center justify-between p-2">
          {/* Mobile Menu Button - Show only on mobile */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-2">
            {userTier === 'free' && (
              <Button
                onClick={() => setShowPaymentDialog(true)}
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg absolute right-4 top-2"
              >
                <Crown className="h-3 w-3 mr-1" />
                Upgrade
              </Button>
            )}
          </div>
        </div>

        {/* Chat Interface or Security Settings or V0Clone */}
        <div className="flex-1 overflow-hidden">
          {showProfileSettings && isAuthenticated ? (
            <ProfileSettingsPage
              onClose={() => setShowProfileSettings(false)}
              auth0User={auth0User}
              getAccessTokenSilently={getAccessTokenSilently}
            />
          ):(
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
              isSidebarCollapsed={isCollapsed}
            />
          )}
        </div>
        
          
      </div>

      {/* Profile Card Overlay */}
      <AnimatePresence>
        {showProfileCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
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
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-muted/20 hover:bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
                  <div className="bg-black/50 border-2 backdrop-blur-sm rounded-[15px] p-6 text-card-foreground space-y-4 w-full h-full flex flex-col justify-end">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold truncate">{auth0User?.name || 'User'}</h3>
                      <p className="text-sm text-muted-foreground">{auth0User?.email}</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          userTier === 'pro' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {userTier.toUpperCase()} Plan
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Messages Today</p>
                          <p className="font-medium text-foreground">{messageCount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Next Reset</p>
                          <p className="font-medium text-foreground">{nextResetTime || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => {
                          setShowProfileCard(false);
                          setShowPaymentDialog(true);
                        }}
                        size="sm"
                        className="flex-1 fixed bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg"
                      >
                        <Crown className="h-3 w-3 mr-1" />
                        Upgrade
                      </Button>
                      <Button
                        onClick={() => {
                          setShowProfileCard(false);
                          logout({ logoutParams: { returnTo: window.location.origin } });
                        }}
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg"
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
      {/* Mobile Sidebar - Add this before the closing </div> of main container */}
<AnimatePresence>
  {isMobileSidebarOpen && (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      {/* Mobile Sidebar */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 w-[280px] sm:w-[320px] bg-[#0b0b0b] border-r-2 border-white/10 z-50 lg:hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg border-2 border-white/20 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">SkyGPT</h2>
          </div>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-white/5 text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content - Same as desktop sidebar */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* New Chat Button */}
          <button
            onClick={() => {
              handleNewChatFunc();
              setIsMobileSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 p-3  bg-white/10 hover:bg-white/20 text-white mb-4"
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium">New Chat</span>
          </button>

          {/* Navigation Sections */}
          <div className="space-y-2">
            {navigationSections.map((section) => (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 text-white"
                >
                  <div className="flex items-center gap-3">
                    <section.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{section.label}</span>
                  </div>
                  {section.items.length > 0 && (
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        expandedSection === section.id && "rotate-180"
                      )}
                    />
                  )}
                </button>

                {/* Session List */}
                {expandedSection === section.id && section.id === 'playground' && (
                  <div className="ml-4 mt-1 space-y-1">
                    {sessions.slice(0, 10).map((session) => (
                      <div key={session.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => {
                            handleSessionSelect(session.id);
                            setIsMobileSidebarOpen(false);
                          }}
                          className={cn(
                            "flex-1 flex items-center gap-2 p-2 rounded-lg text-sm text-left",
                            currentSessionId === session.id
                              ? "bg-white/10 text-white"
                              : "text-white/70 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <ArrowRight className="h-3 w-3" />
                          <span className="truncate">{session.title}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id, e);
                          }}
                          className=" group-hover:opacity-100 p-1 rounded hover:bg-red-500/20"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t-2 border-white/10 space-y-2">
          {userTier === 'free' && (
            <button
              onClick={() => {
                setShowPaymentDialog(true);
                setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              <Crown className="h-4 w-4" />
              Upgrade to Pro
            </button>
          )}
          
          {auth0User && (
            <button
              onClick={() => {
                setShowProfileCard(true);
                setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-white"
            >
              <img
                src={auth0User.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(auth0User.email)}`}
                alt="Profile"
                className="h-8 w-8 rounded-full"
              />
              <span className="text-sm truncate">{auth0User.email}</span>
            </button>
          )}
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <SidebarProvider defaultOpen={true}>
        <DashboardContent />
      </SidebarProvider>
    </ProtectedRoute>
  );
}