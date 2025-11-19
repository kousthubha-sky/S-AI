// components/profile/profile-settings-page.tsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Shield,
  Bell,
  Key,
  Keyboard,
  User,
  LayoutGrid,
  Search,
  X,
  Monitor,
  Tablet,
  Phone,
  Chrome,
  Globe,
  LogOut,
  LogOutIcon
} from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { getPlatformKey } from "../../hooks/useKeyboardShortcuts";
import { useToast } from "~/components/ui/toast";

interface ProfileSettingsPageProps {
  onClose: () => void;
  auth0User?: {
    sub?: string;
    email: string;
    name?: string;
    picture?: string;
    updated_at?: string;
    created_at?: string;
    [key: string]: any;
  };
  user?: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  } | null;
  getAccessTokenSilently?: () => Promise<string>;
  auth0Domain?: string;
}

interface Session {
  id: string;
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function ProfileSettingsPage({ 
  onClose, 
  auth0User, 
  user,
  getAccessTokenSilently,
  auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN
}: ProfileSettingsPageProps) {
  const { logout } = useAuth0();
  const [collapsed, setCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('profile');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [passwordLastChanged, setPasswordLastChanged] = useState<string>('');
  const { showToast } = useToast();

  // Use auth0User as primary source, fallback to user
  const profileUser = auth0User || user;
  const displayName = profileUser?.name || profileUser?.email?.split('@')[0] || 'User';
  const displayEmail = profileUser?.email || 'user@example.com';
  const displayPicture = profileUser?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff&size=256`;

  useEffect(() => {
    if (activeSection === 'security') {
      loadSecurityData();
    }
  }, [activeSection]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Load active sessions
      loadActiveSessions();
      
      // Get password last changed date from user metadata
      const lastChanged = auth0User?.updated_at || auth0User?.created_at;
      if (lastChanged) {
        const date = new Date(lastChanged);
        const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        setPasswordLastChanged(daysAgo > 0 ? `${daysAgo} days ago` : 'Recently');
      }
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSessions = () => {
    // Parse user agent and create session list
    const ua = navigator.userAgent;
    const currentSession: Session = {
      id: 'current',
      device: getDeviceName(ua),
      deviceType: getDeviceType(ua),
      browser: getBrowserName(ua),
      location: 'Current Location',
      ip: 'Current IP',
      lastActive: 'Active now',
      isCurrent: true
    };
    
    setSessions([currentSession]);
  };

  const getDeviceName = (ua: string): string => {
    if (/Windows NT 10/i.test(ua)) return 'Windows 10/11 PC';
    if (/Windows NT 6.3/i.test(ua)) return 'Windows 8.1 PC';
    if (/Windows NT 6.2/i.test(ua)) return 'Windows 8 PC';
    if (/Windows NT 6.1/i.test(ua)) return 'Windows 7 PC';
    if (/Windows NT 6.0/i.test(ua)) return 'Windows Vista PC';
    if (/Windows NT 5.1|Windows XP/i.test(ua)) return 'Windows XP PC';
    if (/Windows/i.test(ua)) return 'Windows PC';
    if (/Macintosh/i.test(ua)) return 'Mac';
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android Device';
    if (/Linux/i.test(ua)) return 'Linux PC';
    return 'Unknown Device';
  };

  const getDeviceType = (ua: string): 'desktop' | 'mobile' | 'tablet' => {
    if (/iPad|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
    if (/iPhone|Android.*Mobile/i.test(ua)) return 'mobile';
    return 'desktop';
  };

  const getBrowserName = (ua: string): string => {
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Edg/i.test(ua)) return 'Edge';
    return 'Unknown Browser';
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session?')) return;

    try {
      setLoading(true);
      // In a real implementation, you would call your backend to revoke the session
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      showToast('Session revoked successfully', 'success');
    
    } catch (error) {
      showToast('Failed to revoke session', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return Phone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  // Helper function to safely extract user ID from either user type
  const getUserId = (user: any) => {
    if (!user) return 'N/A';
    return user.sub || user.id || 'N/A';
  };

  // Section titles mapping
  const sectionTitles: Record<string, string> = {
    profile: 'Profile',
    notifications: 'Notifications',
    security: 'Security & Access',
    apikeys: 'API Keys',
    shortcuts: 'Keyboard shortcuts'
  };

  // Sections for mobile navigation
  const mobileSections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'apikeys', label: 'API Keys', icon: Key },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard }
  ];

  return (
    <div className="fixed inset-0 z-[999] backdrop-blur-sm flex items-center justify-center p-0 lg:p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="relative w-full h-full lg:h-auto lg:max-h-[90vh] lg:max-w-6xl lg:rounded-2xl bg-[#0B0B0B] text-white overflow-hidden lg:border lg:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Header */}
        <div className="flex lg:hidden items-center justify-between p-4 border-b border-white/10 bg-[#0B0B0B]">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Header (macOS style) */}
        <div className="hidden lg:flex h-9 items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-[#FF5F56]" />
            <span className="inline-block h-3 w-3 rounded-full bg-[#FFBD2E]" />
            <span className="inline-block h-3 w-3 rounded-full bg-[#27C93F]" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 transition text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex h-[calc(100%-57px)] lg:h-[calc(90vh-2.25rem)]">
          {/* Desktop Sidebar */}
          <aside
            className={`hidden lg:block ${
              collapsed ? "w-[72px]" : "w-[260px]"
            } transition-all duration-200 ease-in-out border-r border-white/10 bg-[#0E0E0E]`}
          >
            {/* Sidebar Header / App switch */}
            <div className="h-14 flex items-center px-4 gap-2 border-b border-white/10">
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="p-2 rounded-lg hover:bg-white/5 transition"
                title={collapsed ? "Expand" : "Collapse"}
              >
                <LayoutGrid className="h-5 w-5 text-white/80" />
              </button>
              {!collapsed && (
                <div className="flex items-center text-white/90 font-medium">
                  <span className="mr-1">xcore-ai</span>
                  <ChevronDown className="h-4 w-4 text-white/50" />
                </div>
              )}
            </div>

            {/* Sidebar Sections */}
            <div className="px-2 py-3 space-y-6 h-[calc(100%-3.5rem)]">
              <SidebarSection
                title="My Account"
                collapsed={collapsed}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                items={[
                  { icon: User, label: "Profile", id: "profile" },
                  { icon: Bell, label: "Notifications", id: "notifications" },
                  { icon: Shield, label: "Security & Access", id: "security" },
                  { icon: Key, label: "API Keys", id: "apikeys" },
                  { icon: Keyboard, label: "Keyboard shortcuts", id: "shortcuts" },
                ]}
              />

              {/* Logout Button */}
              {!collapsed && (
                <div className="pt-4 border-t border-white/10">
                  <button
                    onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition"
                  >
                    <LogOutIcon className="h-4.5 w-4.5 min-w-[18px]" />
                    
                  </button>
                </div>
              )}

              {/* bottom dock-like icons (optional) */}
              <div className="mt-auto pt-4 pb-2" />
            </div>
          </aside>

          {/* Mobile Bottom Tab Bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0e0e0e] border-t border-white/10 z-10 safe-area-inset-bottom">
            <div className="flex items-center justify-around p-2">
              {mobileSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-[60px] transition ${
                    activeSection === section.id 
                      ? 'text-white bg-white/10' 
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  <section.icon className="h-5 w-5" />
                  <span className="text-xs truncate max-w-[60px]">{section.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            {/* Mobile: Section Title */}
            <div className="lg:hidden p-4 border-b border-white/10 sticky top-0 bg-[#0B0B0B] z-10">
              <h3 className="font-medium text-white">{sectionTitles[activeSection] || 'Profile'}</h3>
            </div>

            {/* Desktop: Top bar */}
            <div className="hidden lg:flex h-14 items-center justify-between px-6 border-b border-white/10 sticky top-0 bg-[#0B0B0B] z-10">
              <div className="flex items-center gap-2 text-white/70">
                <button className="p-2 rounded-lg hover:bg-white/5 transition">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button className="p-2 rounded-lg hover:bg-white/5 transition">
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="ml-2 text-sm">
                  <span className="text-white/50">My Account</span>
                  <span className="mx-2 text-white/30">/</span>
                  <span className="text-white/90">{sectionTitles[activeSection] || 'Profile'}</span>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                <input
                  placeholder="Search settings"
                  className="pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm outline-none focus:ring-2 focus:ring-white/10 placeholder:text-white/40"
                />
              </div>
            </div>

            {/* Content container */}
            <div className="p-4 lg:p-6 xl:p-8">
              {activeSection === 'profile' && (
                <>
                  {/* Profile header card */}
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0F0F0F]">
                    {/* Subtle tiled background */}
                    <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
                      <div className="h-full w-full [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px] [background-position:0_0,0_0]" />
                    </div>

                    <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 p-5 md:p-7">
                      <img
                        src={displayPicture}
                        className="h-16 w-16 md:h-20 md:w-20 rounded-full object-cover ring-2 ring-white/10"
                        alt="avatar"
                      />
                      <div className="flex-1 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <h2 className="text-xl md:text-2xl font-semibold">{displayName}</h2>
                          <CheckCircle2 className="h-5 w-5 text-sky-400" />
                        </div>
                        <p className="text-white/60 text-sm md:text-[15px]">{displayEmail}</p>
                      </div>
                    </div>
                  </div>

                  {/* Details Card */}
                  <div className="mt-6 rounded-2xl border border-white/10 bg-[#0F0F0F] overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/10">
                      <h3 className="text-white/90 font-medium">Personal details</h3>
                    </div>

                    <div className="divide-y divide-white/10">
                      <DetailRow label="Full name" value={displayName} />
                      <DetailRow label="Email" value={displayEmail} />
                     
                      <DetailRow label="Account Type" value="Free" />
                      <DetailRow label="Member Since" value="Recently" />
                      <DetailRow label="Status" value="Active" />
                      
                    </div>
                    
                  </div>
                  <button
                    onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                    className=" flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition"
                  >
                    <LogOut className="h-4.5 w-4.5 min-w-[18px]" />
                    <span className="truncate text-sm">Logout</span>
                  </button>
                  {/* Security Settings */}
                  <div className="mt-6 rounded-2xl border border-white/10 bg-[#0F0F0F] overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/10">
                      <h3 className="text-white/90 font-medium">Security Settings</h3>
                    </div>
                    <div className="p-5 text-white/60 text-sm">
                      Configure 2FA, sessions, and devices from the Security & Access section.
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'notifications' && (
                <NotificationsSection />
              )}

              {activeSection === 'security' && (
                <SecuritySection 
                  displayEmail={displayEmail}
                  loading={loading}
                  sessions={sessions}
                  passwordLastChanged={passwordLastChanged}
                  onRevokeSession={handleRevokeSession}
                  getDeviceIcon={getDeviceIcon}
                />
              )}

              {activeSection === 'apikeys' && (
                <APIKeysSection />
              )}

              {activeSection === 'shortcuts' && (
                <KeyboardShortcutsSection />
              )}

              {/* Bottom padding spacer for scroll aesthetics */}
              <div className="h-10" />
            </div>
          </main>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- Reusable Bits ---------- */

type SidebarItemType = { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  id: string;
};

function SidebarSection({
  title,
  collapsed,
  items,
  activeSection,
  onSectionChange,
}: {
  title: string;
  collapsed: boolean;
  items: SidebarItemType[];
  activeSection: string;
  onSectionChange: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {!collapsed && (
        <div className="px-2 text-[11px] uppercase tracking-wide text-white/35">{title}</div>
      )}
      <nav className="space-y-1">
        {items.map((it) => (
          <SidebarItem 
            key={it.id} 
            icon={it.icon} 
            label={it.label} 
            active={activeSection === it.id} 
            collapsed={collapsed}
            onClick={() => onSectionChange(it.id)}
          />
        ))}
      </nav>
    </div>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
        active
          ? "bg-white/10 text-white"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="h-4.5 w-4.5 min-w-[18px]" />
      {!collapsed && <span className="truncate text-sm">{label}</span>}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 px-5 py-4">
      <div className="text-white/50 text-sm">{label}</div>
      <div className="md:col-span-2 text-white/90 text-sm mt-1 md:mt-0">{value}</div>
    </div>
  );
}

/* ---------- Section Components ---------- */

function NotificationsSection() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0F0F0F] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h3 className="text-white/90 font-medium">Email Notifications</h3>
          <p className="text-white/60 text-sm mt-1">Manage how you receive email notifications</p>
        </div>
        <div className="divide-y divide-white/10">
          <NotificationToggle
            label="Email notifications"
            description="Receive notifications via email"
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />
          <NotificationToggle
            label="Weekly digest"
            description="Get a weekly summary of your activity"
            checked={weeklyDigest}
            onChange={setWeeklyDigest}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0F0F0F] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h3 className="text-white/90 font-medium">Push Notifications</h3>
          <p className="text-white/60 text-sm mt-1">Manage push notifications</p>
        </div>
        <div className="divide-y divide-white/10">
          <NotificationToggle
            label="Push notifications"
            description="Receive push notifications on your devices"
            checked={pushNotifications}
            onChange={setPushNotifications}
          />
        </div>
      </div>
    </div>
  );
}

function NotificationToggle({ 
  label, 
  description, 
  checked, 
  onChange 
}: { 
  label: string; 
  description: string; 
  checked: boolean; 
  onChange: (checked: boolean) => void;
}) {
  function showToast(arg0: string, arg1: string, arg2: number) {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex-1">
        <div className="text-white/90 text-sm font-medium">{label}</div>
        <div className="text-white/60 text-sm mt-1">{description}</div>
      </div>
       <button
          onClick={() => {
            onChange(!checked);
            showToast(
              checked ? `${label} disabled` : `${label} enabled`, 
              'success', 
              2000
            );
          }}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? 'bg-sky-500' : 'bg-white/10'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

interface SecuritySectionProps {
  displayEmail: string;
  loading: boolean;
  sessions: Session[];
  passwordLastChanged: string;
  onRevokeSession: (sessionId: string) => void;
  getDeviceIcon: (type: string) => React.ComponentType<{ className?: string }>;
}

function SecuritySection({ 
  displayEmail,
  loading,
  sessions,
  passwordLastChanged,
  onRevokeSession,
  getDeviceIcon
}: SecuritySectionProps) {
  return (
    <div className="space-y-6">
      {/* Password & Authentication */}
      <div className="rounded-2xl border border-white/10 bg-[#0F0F0F] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h3 className="text-white/90 font-medium flex items-center gap-2">
            <Key className="h-4 w-4" />
            Authentication
          </h3>
          <p className="text-white/60 text-sm mt-1">Manage your authentication methods</p>
        </div>
        
        <div className="p-5 space-y-4">
          {/* Two-Factor Authentication - Coming Soon */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-white/90 text-sm font-medium flex items-center gap-2">
                Two-factor authentication
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                  Coming Soon
                </span>
              </div>
              <div className="text-white/60 text-sm mt-1">
                Add an extra layer of security to your account
              </div>
            </div>
            <button 
              disabled={true}
              className="px-4 py-2 bg-white/5 text-white/40 rounded-lg text-sm cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="rounded-2xl border border-white/10 bg-[#0F0F0F] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h3 className="text-white/90 font-medium flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Active Sessions
          </h3>
          <p className="text-white/60 text-sm mt-1">Manage your active login sessions</p>
        </div>

        <div className="p-5 space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-white/60 text-sm">
              No active sessions found
            </div>
          ) : (
            sessions.map((session) => {
              const DeviceIcon = getDeviceIcon(session.deviceType);
              const BrowserIcon = session.browser === 'Chrome' ? Chrome : Globe;
              
              return (
                <div key={session.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <DeviceIcon className="h-4 w-4 text-white/70" />
                    </div>
                    <div>
                      <div className="text-white/90 text-sm font-medium flex items-center gap-2">
                        {session.device}
                        {session.isCurrent && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-white/60 text-xs mt-1 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <BrowserIcon className="h-3 w-3" />
                          {session.browser}
                        </span>
                        <span>{session.location}</span>
                        <span>{session.lastActive}</span>
                      </div>
                    </div>
                  </div>
                  
                  {!session.isCurrent && (
                    <button
                      onClick={() => onRevokeSession(session.id)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function APIKeysSection() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0F0F0F] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10">
        <h3 className="text-white/90 font-medium">API Keys</h3>
        <p className="text-white/60 text-sm mt-1">Manage your API keys and access tokens</p>
      </div>
      <div className="p-8 text-center">
        <Key className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <h4 className="text-white/90 font-medium mb-2">No API Keys</h4>
        <p className="text-white/60 text-sm max-w-sm mx-auto">
          You haven't generated any API keys yet. Create your first API key to start integrating with our services.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button 
            disabled={true}
            className="px-4 py-2 bg-white/5 text-white/40 rounded-lg text-sm cursor-not-allowed"
          >
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyboardShortcutsSection() {
  const platformKey = getPlatformKey();
  
  const shortcuts = [
    { keys: [platformKey, 'K'], description: 'Open command palette' },
    { keys: [platformKey, 'N'], description: 'New chat' },
    { keys: [platformKey, '/'], description: 'Focus search' },
    { keys: [platformKey, 'J'], description: 'Toggle sidebar' },
    { keys: ['Esc'], description: 'Close modal' },
    { keys: [platformKey, 'Enter'], description: 'Send message' },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0F0F0F] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10">
        <h3 className="text-white/90 font-medium">Keyboard Shortcuts</h3>
        <p className="text-white/60 text-sm mt-1">Quick actions to navigate faster</p>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-white/90 text-sm">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <React.Fragment key={keyIndex}>
                    <kbd className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded border border-white/20 min-w-[28px] text-center">
                      {key}
                    </kbd>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="text-white/40 text-xs">+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}