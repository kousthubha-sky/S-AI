import { useEffect, useCallback } from 'react';

interface ShortcutAction {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: () => void;
  description: string;
}

export const useKeyboardShortcuts = (actions: ShortcutAction[]) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs, textareas, or contentEditable elements
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    for (const action of actions) {
      const keyMatch = event.key === action.key;
      const ctrlMatch = !action.ctrlKey || event.ctrlKey === action.ctrlKey;
      const metaMatch = !action.metaKey || event.metaKey === action.metaKey;
      const shiftMatch = !action.shiftKey || event.shiftKey === action.shiftKey;
      const altMatch = !action.altKey || event.altKey === action.altKey;

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        event.preventDefault();
        action.callback();
        break;
      }
    }
  }, [actions]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// Platform detection
export const getPlatformKey = (): string => {
  if (typeof window === 'undefined') return 'Ctrl';
  if (navigator.platform.toUpperCase().includes('MAC')) return '⌘';
  return 'Ctrl';
};

// Generate shortcut display text
export const generateShortcutText = (key: string, ctrlKey?: boolean, metaKey?: boolean): string => {
  const parts: string[] = [];
  
  if (ctrlKey) parts.push('Ctrl');
  if (metaKey) parts.push('⌘');
  if (!ctrlKey && !metaKey) {
    // Auto-detect platform
    parts.push(getPlatformKey());
  }
  
  parts.push(key);
  return parts.join(' + ');
};
