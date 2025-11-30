import { Toaster, toast } from 'sonner';

// Re-export Sonner's toast function and Toaster component
export { toast, Toaster };

// For backward compatibility, provide a useToast hook that returns the toast function
export const useToast = () => ({
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success', duration?: number) => {
    const options = duration ? { duration } : {};
    switch (type) {
      case 'success':
        toast.success(message, options);
        break;
      case 'error':
        toast.error(message, options);
        break;
      case 'warning':
        toast.warning(message, options);
        break;
      case 'info':
        toast.info(message, options);
        break;
    }
  }
});

// For backward compatibility, provide ToastProvider that just renders children
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};