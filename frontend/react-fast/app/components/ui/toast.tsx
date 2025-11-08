import React, { useState, useEffect, createContext, useContext } from 'react';
import { Check, X, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Toast Types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

// Create Toast Context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'success', duration: number = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// Hook to use Toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

// Toast Container Component
const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ 
  toasts, 
  onRemove 
}) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Individual Toast Component
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ 
  toast, 
  onRemove 
}) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'error':
        return <X className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-white border-green-200';
      case 'error':
        return 'bg-white border-red-200';
      case 'warning':
        return 'bg-white border-yellow-200';
      case 'info':
        return 'bg-white border-blue-200';
    }
  };

  const getIconBg = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50';
      case 'error':
        return 'bg-red-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'info':
        return 'bg-blue-50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 100 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="pointer-events-auto"
    >
      <div
        className={`
          ${getBgColor()}
          rounded-lg border-2 shadow-lg
          min-w-[300px] max-w-[400px]
          p-4 flex items-start gap-3
        `}
      >
        {/* Icon */}
        <div className={`${getIconBg()} rounded-full p-1.5 flex-shrink-0`}>
          {getIcon()}
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 break-words">
            {toast.message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};

// Demo Component
export default function ToastDemo() {
  const { showToast } = useToast();

  const examples = [
    { label: 'Success Toast', type: 'success' as ToastType, message: 'Message sent successfully!' },
    { label: 'Error Toast', type: 'error' as ToastType, message: 'Failed to send message. Please try again.' },
    { label: 'Warning Toast', type: 'warning' as ToastType, message: 'You are approaching your daily limit.' },
    { label: 'Info Toast', type: 'info' as ToastType, message: 'New session created.' },
  ];

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Toast Notification System
            </h1>
            <p className="text-gray-600 text-lg">
              Clean white toasts with checkmarks and smooth animations
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-12">
            {examples.map((example, idx) => (
              <button
                key={idx}
                onClick={() => showToast(example.message, example.type)}
                className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-gray-300 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${example.type === 'success' ? 'bg-green-50' : ''}
                    ${example.type === 'error' ? 'bg-red-50' : ''}
                    ${example.type === 'warning' ? 'bg-yellow-50' : ''}
                    ${example.type === 'info' ? 'bg-blue-50' : ''}
                  `}>
                    {example.type === 'success' && <Check className="h-5 w-5 text-green-600" />}
                    {example.type === 'error' && <X className="h-5 w-5 text-red-600" />}
                    {example.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                    {example.type === 'info' && <Info className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {example.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {example.message}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Usage in Your App
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">1. Wrap your app with ToastProvider:</h3>
                <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                  <code className="text-gray-800">{`<ToastProvider>
  <App />
</ToastProvider>`}</code>
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2. Use the hook in your components:</h3>
                <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                  <code className="text-gray-800">{`const { showToast } = useToast();

// Show success
showToast('Message sent!', 'success');

// Show error
showToast('Failed to send', 'error');

// Show warning
showToast('Limit reached', 'warning');

// Show info
showToast('New session created', 'info');`}</code>
                </pre>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-blue-50 rounded-lg border-2 border-blue-200 p-6">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Info className="h-5 w-5" />
              Where to Add Toasts in Your App:
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✓ Message sent successfully</li>
              <li>✓ New chat session created</li>
              <li>✓ Session deleted</li>
              <li>✓ Message copied to clipboard</li>
              <li>✓ File attached</li>
              <li>✓ Settings saved</li>
              <li>✓ Error handling (API failures, network errors)</li>
              <li>✓ Payment/upgrade success</li>
              <li>✓ Profile updated</li>
              <li>✓ Session title updated</li>
            </ul>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}