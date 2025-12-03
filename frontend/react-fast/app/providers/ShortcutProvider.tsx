import React, { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import CommandPalette from '../components/ui/command-palette';
import { MessageCircle, User } from 'lucide-react';

interface ShortcutContextType {
  openCommandPalette: () => void;
  newChat: () => void;
  focusSearch: () => void;
  toggleSidebar: () => void;
  sendMessage: () => void;
  closeModal: () => void;
}

const ShortcutContext = createContext<ShortcutContextType | undefined>(undefined);

export const useShortcuts = () => {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error('useShortcuts must be used within a ShortcutProvider');
  }
  return context;
};

interface ShortcutProviderProps {
  children: ReactNode;
}

export default function ShortcutProvider({ children }: ShortcutProviderProps) {
  const navigate = useNavigate();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);

  useEffect(() => {
    // Add event listener for new chat from command palette
    const handleNewChat = () => {
      navigate('/dashboard');
    };

    window.addEventListener('newChat', handleNewChat);
    return () => {
      window.removeEventListener('newChat', handleNewChat);
    };
  }, [navigate]);

  const commands = [
    {
      id: 'new-chat',
      label: 'New Chat',
      description: 'Start a new conversation',
      icon: MessageCircle,
      action: () => {
        window.dispatchEvent(new CustomEvent('newChat'));
        setIsCommandPaletteOpen(false);
      }
    },
    {
      id: 'profile',
      label: 'Profile Settings',
      description: 'Manage your account settings',
      icon: User,
      action: () => {
        setIsCommandPaletteOpen(false);
        window.dispatchEvent(new CustomEvent('openProfileSettings'));
      }
    }
  ];

  const openCommandPalette = () => {
    setIsCommandPaletteOpen(true);
  };

  const newChat = () => {
    navigate('/dashboard');
  };

  const focusSearch = () => {
    // Focus search input if on dashboard
    const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    } else {
      // If no search input found, try to find any input field
      const inputs = document.querySelectorAll('input:not([type="hidden"])');
      if (inputs.length > 0) {
        (inputs[0] as HTMLInputElement).focus();
      }
    }
  };

  const toggleSidebar = () => {
    // Find the sidebar trigger button and click it
    const sidebarTrigger = document.querySelector('[data-sidebar-trigger]') as HTMLButtonElement;
    if (sidebarTrigger) {
      sidebarTrigger.click();
      return;
    }

    // Fallback: Try to find any button that looks like a sidebar toggle
    const possibleTriggers = document.querySelectorAll('button');
    for (const button of possibleTriggers) {
      const text = button.textContent?.toLowerCase() || '';
      const hasMenuIcon = button.querySelector('svg, [data-icon]');
      
      if (text.includes('menu') || text.includes('toggle') || (hasMenuIcon && button.closest('aside'))) {
        button.click();
        return;
      }
    }

    // Last resort: use class manipulation
    const sidebar = document.querySelector('[data-sidebar]') as HTMLElement;
    if (sidebar) {
      const isHidden = sidebar.classList.contains('hidden') || 
                      sidebar.classList.contains('-translate-x-full') || 
                      sidebar.getAttribute('aria-hidden') === 'true' ||
                      sidebar.classList.contains('collapsed');
      
      if (isHidden) {
        sidebar.classList.remove('hidden', '-translate-x-full', 'collapsed');
        sidebar.setAttribute('aria-hidden', 'false');
      } else {
        sidebar.classList.add('hidden');
        sidebar.setAttribute('aria-hidden', 'true');
      }
    } else {
      // No sidebar found for toggling
    }
  };

  const sendMessage = () => {
    // Find and click the send button in chat interface
    const sendButton = document.querySelector('[data-send-button]') as HTMLButtonElement;
    if (sendButton && !sendButton.disabled) {
      sendButton.click();
    } else {
      // Alternative selectors for send button
      const altSendButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (altSendButton && !altSendButton.disabled) {
        altSendButton.click();
      }
    }
  };

  const closeModal = () => {
    setIsCommandPaletteOpen(false);
    // Close any other open modals or overlays
    const modals = document.querySelectorAll('[role="dialog"]');
    modals.forEach(modal => {
      const closeButton = modal.querySelector('button[aria-label*="close" i]') as HTMLButtonElement;
      if (closeButton) {
        closeButton.click();
      }
    });
  };

  const actions = [
    {
      key: 'k',
      ctrlKey: true,
      callback: openCommandPalette,
      description: 'Open command palette'
    },
    {
      key: 'n',
      ctrlKey: true,
      callback: newChat,
      description: 'New chat'
    },
    {
      key: '/',
      ctrlKey: true,
      callback: focusSearch,
      description: 'Focus search'
    },
    {
      key: 'j',
      ctrlKey: true,
      callback: toggleSidebar,
      description: 'Toggle sidebar'
    },
    {
      key: 'Enter',
      ctrlKey: true,
      callback: sendMessage,
      description: 'Send message'
    },
    {
      key: 'Escape',
      callback: closeModal,
      description: 'Close modal'
    }
  ];

  useKeyboardShortcuts(actions);

  const value: ShortcutContextType = {
    openCommandPalette,
    newChat,
    focusSearch,
    toggleSidebar,
    sendMessage,
    closeModal
  };

  return (
    <ShortcutContext.Provider value={value}>
      {children}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={closeModal}
        commands={commands}
      />
    </ShortcutContext.Provider>
  );
}
