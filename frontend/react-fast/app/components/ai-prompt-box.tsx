import React, { useState } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUp, Paperclip, Square, X, StopCircle, Mic, Globe, BrainCog, FolderCode, Github } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ModelSelector } from "./chat/model-selector";
import { useNavigate } from "react-router";
import { GitHubSelector } from "~/components/github/github-selector";
// Utility function for className merging
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

// Embedded CSS for minimal custom styles
const styles = `
  *:focus-visible {
    outline-offset: 0 !important;
    --ring-offset: 0 !important;
  }
  textarea::-webkit-scrollbar {
    width: 6px;
  }
  textarea::-webkit-scrollbar-track {
    background: transparent;
  }
  textarea::-webkit-scrollbar-thumb {
    background-color: #444444;
    border-radius: 3px;
  }
  textarea::-webkit-scrollbar-thumb:hover {
    background-color: #555555;
  }
`;

// Style injection hook - runs only on client side
const useStyleInjection = () => {
  React.useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('ai-prompt-box-styles')) {
      const styleSheet = document.createElement("style");
      styleSheet.id = 'ai-prompt-box-styles';
      styleSheet.innerText = styles;
      document.head.appendChild(styleSheet);
      
      return () => {
        const existingStyle = document.getElementById('ai-prompt-box-styles');
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, []);
};

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex w-full rounded-md border-none bg-transparent px-3 py-2.5 text-base text-gray-100 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] resize-none scrollbar-thin scrollbar-thumb-[#444444] scrollbar-track-transparent hover:scrollbar-thumb-[#555555]",
      className
    )}
    ref={ref}
    rows={1}
    {...props}
  />
));
Textarea.displayName = "Textarea";

// Tooltip Components
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border border-[#333333] bg-[#1F2023] px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Dialog Components
const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] gap-4 border border-[#333333] bg-[#1F2023] p-0 shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-2xl",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full bg-[#2E3033]/80 p-2 hover:bg-[#2E3033] transition-all">
        <X className="h-5 w-5 text-gray-200 hover:text-white" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-gray-100", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-white hover:bg-white/80 text-black",
      outline: "border border-[#444444] bg-transparent hover:bg-[#3A3A40]",
      ghost: "bg-transparent hover:bg-[#3A3A40]",
    };
    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6",
      icon: "h-8 w-8 rounded-full aspect-[1/1]",
    };
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// VoiceRecorder Component
interface VoiceRecorderProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: (duration: number) => void;
  visualizerBars?: number;
}
const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  visualizerBars = 32,
}) => {
  const [time, setTime] = React.useState(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (isRecording) {
      onStartRecording();
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      onStopRecording(time);
      setTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, time, onStartRecording, onStopRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full transition-all duration-300 py-3",
        isRecording ? "opacity-100" : "opacity-0 h-0"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="font-mono text-sm text-white/80">{formatTime(time)}</span>
      </div>
      <div className="w-full h-10 flex items-center justify-center gap-0.5 px-4">
        {[...Array(visualizerBars)].map((_, i) => (
          <div
            key={i}
            className="w-0.5 rounded-full bg-white/50 animate-pulse"
            style={{
              height: `${Math.max(15, Math.random() * 100)}%`,
              animationDelay: `${i * 0.05}s`,
              animationDuration: `${0.5 + Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ImageViewDialog Component
interface ImageViewDialogProps {
  imageUrl: string | null;
  onClose: () => void;
}
const ImageViewDialog: React.FC<ImageViewDialogProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-[90vw] md:max-w-[800px]">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative bg-[#1F2023] rounded-2xl overflow-hidden shadow-2xl"
        >
          <img
            src={imageUrl}
            alt="Full preview"
            className="w-full max-h-[80vh] object-contain rounded-2xl"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

// PromptInput Context and Components
interface PromptInputContextType {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
}
const PromptInputContext = React.createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
});
function usePromptInput() {
  const context = React.useContext(PromptInputContext);
  if (!context) throw new Error("usePromptInput must be used within a PromptInput");
  return context;
}

interface PromptInputProps {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}
const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  (
    {
      className,
      isLoading = false,
      maxHeight = 240,
      value,
      onValueChange,
      onSubmit,
      children,
      disabled = false,
      onDragOver,
      onDragLeave,
      onDrop,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(value || "");
    const handleChange = (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };
    return (
      <TooltipProvider>
        <PromptInputContext.Provider
          value={{
            isLoading,
            value: value ?? internalValue,
            setValue: onValueChange ?? handleChange,
            maxHeight,
            onSubmit,
            disabled,
          }}
        >
          <div
            ref={ref}
            className={cn(
              "rounded-3xl border border-[#444444] bg-[#1F2023] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300",
              isLoading && "border-red-500/70",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {children}
          </div>
        </PromptInputContext.Provider>
      </TooltipProvider>
    );
  }
);
PromptInput.displayName = "PromptInput";

interface PromptInputTextareaProps {
  disableAutosize?: boolean;
  placeholder?: string;
}
const PromptInputTextarea: React.FC<PromptInputTextareaProps & React.ComponentProps<typeof Textarea>> = ({
  className,
  onKeyDown,
  disableAutosize = false,
  placeholder,
  ...props
}) => {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (disableAutosize || !textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      typeof maxHeight === "number"
        ? `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
        : `min(${textareaRef.current.scrollHeight}px, ${maxHeight})`;
  }, [value, maxHeight, disableAutosize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
    onKeyDown?.(e);
  };

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn("text-base", className)}
      disabled={disabled}
      placeholder={placeholder}
      {...props}
    />
  );
};

interface PromptInputActionsProps extends React.HTMLAttributes<HTMLDivElement> {}
const PromptInputActions: React.FC<PromptInputActionsProps> = ({ children, className, ...props }) => (
  <div className={cn("flex items-center gap-2", className)} {...props}>
    {children}
  </div>
);

interface PromptInputActionProps extends React.ComponentProps<typeof Tooltip> {
  tooltip: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}
const PromptInputAction: React.FC<PromptInputActionProps> = ({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}) => {
  const { disabled } = usePromptInput();
  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
};

// Custom Divider Component
const CustomDivider: React.FC = () => (
  <div className="relative h-6 w-[1.5px] mx-1">
    <div
      className="absolute inset-0 bg-gradient-to-t from-transparent via-[#9b87f5]/70 to-transparent rounded-full"
      style={{
        clipPath: "polygon(0% 0%, 100% 0%, 100% 40%, 140% 50%, 100% 60%, 100% 100%, 0% 100%, 0% 60%, -40% 50%, 0% 40%)",
      }}
    />
  </div>
);

// Main PromptInputBox Component
// REPLACE WITH:
interface PromptInputBoxProps {
  onSend?: (message: string, files?: File[], githubFiles?: Array<{
    repo: string;
    owner: string;
    path: string;
    name: string;
    size: number;
  }>) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  userTier?: 'free' | 'starter' | 'pro' | 'pro_plus';
  isAuthenticated?: boolean;
}

export const PromptInputBox = React.forwardRef((props: PromptInputBoxProps, ref: React.Ref<HTMLDivElement>) => {
  const { 
    onSend = () => {}, 
    isLoading = false, 
    placeholder = "Type your message here...", 
    className,
    selectedModel = "",
    onModelChange = () => {},
    userTier = 'free',
    isAuthenticated = false
  } = props;
  
  const navigate = useNavigate();
  useStyleInjection();
  
  const [input, setInput] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [filePreviews, setFilePreviews] = React.useState<{ [key: string]: string }>({});
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [showThink, setShowThink] = React.useState(false);
  const [showCanvas, setShowCanvas] = React.useState(false);
  const [showAuthTooltip, setShowAuthTooltip] = React.useState(false);
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const promptBoxRef = React.useRef<HTMLDivElement>(null);
// REPLACE WITH:
const [showGithubSelector, setShowGithubSelector] = useState(false);
const [githubFiles, setGithubFiles] = useState<Array<{
  repo: string;
  owner: string;
  path: string;
  name: string;
  size: number;
}>>([]);

  const handleDisabledClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  };

  const handleToggleChange = (value: string) => {
    if (value === "search") {
      setShowSearch((prev) => !prev);
      setShowThink(false);
    } else if (value === "think") {
      setShowThink((prev) => !prev);
      setShowSearch(false);
    }
  };

  const handleCanvasToggle = () => setShowCanvas((prev) => !prev);
  
  const removeGithubFile = (index: number) => {
  setGithubFiles(prev => prev.filter((_, i) => i !== index));
};

  const isImageFile = (file: File) => file.type.startsWith("image/");

  const processFile = (file: File) => {
    if (!isImageFile(file)) {
      console.log("Only image files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      console.log("File too large (max 10MB)");
      return;
    }
    setFiles([file]);
    const reader = new FileReader();
    reader.onload = (e) => setFilePreviews({ [file.name]: e.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => isImageFile(file));
    if (imageFiles.length > 0) processFile(imageFiles[0]);
  }, []);

  const handleRemoveFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove && filePreviews[fileToRemove.name]) setFilePreviews({});
    setFiles([]);
  };

  const openImageModal = (imageUrl: string) => setSelectedImage(imageUrl);

  const handlePaste = React.useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
          break;
        }
      }
    }
  }, []);

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.addEventListener("paste", handlePaste);
      return () => document.removeEventListener("paste", handlePaste);
    }
  }, [handlePaste]);

  const handleGithubFilesSelected = (files: Array<{
    repo: string;
    owner: string;
    path: string;
    name: string;
    size:number;
  }>) => {
    setGithubFiles(files);
  };

// REPLACE WITH:
const handleSubmit = () => {
  if (input.trim() || files.length > 0 || githubFiles.length > 0) {
    let messagePrefix = "";
    if (showSearch) messagePrefix = "[Search: ";
    else if (showThink) messagePrefix = "[Think: ";
    else if (showCanvas) messagePrefix = "[Canvas: ";
    const formattedInput = messagePrefix ? `${messagePrefix}${input}]` : input;
    
    // ✅ PASS GITHUB FILES TO PARENT
    onSend(formattedInput, files, githubFiles);
    
    setInput("");
    setFiles([]);
    setFilePreviews({});
    setGithubFiles([]); // ✅ Clear GitHub files
  }
};

  const handleStartRecording = () => console.log("Started recording");

  const handleStopRecording = (duration: number) => {
    console.log(`Stopped recording after ${duration} seconds`);
    setIsRecording(false);
    onSend(`[Voice message - ${duration} seconds]`, []);
  };

const hasContent = input.trim() !== "" || files.length > 0 || githubFiles.length > 0;

  const PromptBoxContent = (
    <PromptInput
      value={input}
      onValueChange={setInput}
      isLoading={isLoading}
      onSubmit={handleSubmit}
      className={cn(
        "w-full bg-[#1F2023] border-[#444444] shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300 ease-in-out",
        isRecording && "border-red-500/70",
        !isAuthenticated && "cursor-pointer",
        className
      )}
      disabled={isLoading || isRecording || !isAuthenticated}
      ref={ref || promptBoxRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Image Files Preview */}
      {files.length > 0 && !isRecording && isAuthenticated && (
        <div className="flex flex-wrap gap-2 p-0 pb-1 transition-all duration-300">
          {files.map((file, index) => (
            <div key={index} className="relative group">
              {file.type.startsWith("image/") && filePreviews[file.name] && (
                <div
                  className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
                  onClick={() => openImageModal(filePreviews[file.name])}
                >
                  <img
                    src={filePreviews[file.name]}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                    className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* GitHub Files Preview */}
      {/* // REPLACE WITH: */}
      {githubFiles.length > 0 && !isRecording && isAuthenticated && (
        <div className="flex flex-wrap gap-2 p-0 pb-1 transition-all duration-300">
          {githubFiles.map((file, index) => (
            <div
              key={`github-${index}`}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/20 border border-blue-700/50 rounded-lg hover:bg-blue-900/30 transition-colors group"
            >
              <Github className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-blue-300 font-medium truncate max-w-[200px]">
                  {file.name}
                </span>
                <span className="text-[10px] text-blue-500/70 truncate max-w-[200px]">
                  {file.repo}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeGithubFile(index);
                }}
                className="ml-auto flex-shrink-0 hover:bg-blue-700/30 rounded p-0.5 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3 text-blue-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={cn(
          "transition-all duration-300",
          isRecording ? "h-0 overflow-hidden opacity-0" : "opacity-100"
        )}
      >
        <PromptInputTextarea
          placeholder={
            !isAuthenticated 
              ? "Sign in to start chatting..." 
              : showSearch
              ? "Search the web..."
              : showThink
              ? "Think deeply..."
              : showCanvas
              ? "Create on canvas..."
              : placeholder
          }
          className="text-base"
        />
      </div>

      {isRecording && isAuthenticated && (
        <VoiceRecorder
          isRecording={isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
        />
      )}

      <PromptInputActions className="flex items-center justify-between gap-2 p-0 pt-2">
        <div
          className={cn(
            "flex items-center gap-1 transition-opacity duration-300",
            isRecording || !isAuthenticated ? "opacity-0 invisible h-0" : "opacity-100 visible"
          )}
        >
          <PromptInputAction tooltip="Upload image">
            <button
              onClick={() => uploadInputRef.current?.click()}
              className={cn(
                "flex h-8 w-8 text-[#9CA3AF] cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-600/30 hover:text-[#D1D5DB]",
                showSearch && "opacity-40 cursor-not-allowed hover:bg-transparent"
              )}
              disabled={isRecording || showSearch || !isAuthenticated}
            >
              <Paperclip className="h-5 w-5 transition-colors" />
              <input
                ref={uploadInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0]);
                  if (e.target) e.target.value = "";
                }}
                accept="image/*"
              />
            </button>
          </PromptInputAction>

          <div className="flex items-center">
            <button
              type="button"
              onClick={() => handleToggleChange("search")}
              className={cn(
                "rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                showSearch
                  ? "bg-[#1EAEDB]/15 border-[#1EAEDB] text-[#1EAEDB]"
                  : "bg-transparent border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
              )}
              disabled={!isAuthenticated}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <motion.div
                  animate={{ rotate: showSearch ? 360 : 0, scale: showSearch ? 1.1 : 1 }}
                  whileHover={{ rotate: showSearch ? 360 : 15, scale: 1.1, transition: { type: "spring", stiffness: 300, damping: 10 } }}
                  transition={{ type: "spring", stiffness: 260, damping: 25 }}
                >
                  <Globe className={cn("w-4 h-4", showSearch ? "text-[#1EAEDB]" : "text-inherit")} />
                </motion.div>
              </div>
              <AnimatePresence>
                {showSearch && (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs overflow-hidden whitespace-nowrap text-[#1EAEDB] flex-shrink-0"
                  >
                    Search
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <CustomDivider />

            <button
              type="button"
              onClick={() => handleToggleChange("think")}
              className={cn(
                "rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                showThink
                  ? "bg-[#8B5CF6]/15 border-[#8B5CF6] text-[#8B5CF6]"
                  : "bg-transparent border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]",
                showSearch && "opacity-40 cursor-not-allowed hover:text-[#9CA3AF]"
              )}
              disabled={showSearch || !isAuthenticated}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <motion.div
                  animate={{ rotate: showThink ? 360 : 0, scale: showThink ? 1.1 : 1 }}
                  whileHover={{ rotate: showThink ? 360 : 15, scale: 1.1, transition: { type: "spring", stiffness: 300, damping: 10 } }}
                  transition={{ type: "spring", stiffness: 260, damping: 25 }}
                >
                  <BrainCog className={cn("w-4 h-4", showThink ? "text-[#8B5CF6]" : "text-inherit")} />
                </motion.div>
              </div>
              <AnimatePresence>
                {showThink && (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs overflow-hidden whitespace-nowrap text-[#8B5CF6] flex-shrink-0"
                  >
                    Think
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <CustomDivider />
            
            <PromptInputAction tooltip="Add from GitHub">
              <button
                onClick={() => {
                  console.log('GitHub button clicked');
                  setShowGithubSelector(true);
                }}
                className={cn(
                  "flex h-8 w-8 text-[#9CA3AF] cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-600/30 hover:text-[#D1D5DB]",
                  !isAuthenticated && "opacity-40 cursor-not-allowed hover:bg-transparent",
                  githubFiles.length > 0 && "text-blue-400 bg-blue-900/20"
                )}
                disabled={!isAuthenticated}
              >
                <Github className="h-5 w-5 transition-colors" />
              </button>
            </PromptInputAction>

            <CustomDivider />

            <button
              type="button"
              onClick={handleCanvasToggle}
              className={cn(
                "rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                showCanvas
                  ? "bg-[#F97316]/15 border-[#F97316] text-[#F97316]"
                  : "bg-transparent border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]",
                showSearch && "opacity-40 cursor-not-allowed hover:text-[#9CA3AF]"
              )}
              disabled={showSearch || !isAuthenticated}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <motion.div
                  animate={{ rotate: showCanvas ? 360 : 0, scale: showCanvas ? 1.1 : 1 }}
                  whileHover={{ rotate: showCanvas ? 360 : 15, scale: 1.1, transition: { type: "spring", stiffness: 300, damping: 10 } }}
                  transition={{ type: "spring", stiffness: 260, damping: 25 }}
                >
                  <FolderCode className={cn("w-4 h-4", showCanvas ? "text-[#F97316]" : "text-inherit")} />
                </motion.div>
              </div>
              <AnimatePresence>
                {showCanvas && (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs overflow-hidden whitespace-nowrap text-[#F97316] flex-shrink-0"
                  >
                    Canvas
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {selectedModel && isAuthenticated && (
              <ModelSelector
                selectedModel={showThink ? 'qwen/qwen3-235b-a22b:free' : selectedModel}
                onModelChange={onModelChange}
                userTier={userTier}
                isAuthenticated={isAuthenticated}
                disabled={showThink}
              />
            )}
          </div>
        </div>

        <PromptInputAction
          tooltip={
            !isAuthenticated
              ? "Sign in to send messages"
              : isLoading
              ? "Stop generation"
              : isRecording
              ? "Stop recording"
              : hasContent
              ? "Send message"
              : "Voice message"
          }
        >
          <Button
            variant="default"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full transition-all duration-200",
              !isAuthenticated && "opacity-50 cursor-not-allowed",
              isRecording
                ? "bg-transparent hover:bg-gray-600/30 text-red-500 hover:text-red-400"
                : hasContent
                ? "bg-white hover:bg-white/80 text-black"
                : "bg-transparent hover:bg-gray-600/30 text-[#9CA3AF] hover:text-[#D1D5DB]"
            )}
            onClick={() => {
              if (!isAuthenticated) {
                handleDisabledClick();
                return;
              }
              if (isRecording) setIsRecording(false);
              else if (hasContent) handleSubmit();
              else setIsRecording(true);
            }}
            disabled={(isLoading && !hasContent) && isAuthenticated}
          >
            {isLoading && isAuthenticated ? (
              <Square className="h-4 w-4 fill-black animate-pulse" />
            ) : isRecording ? (
              <StopCircle className="h-5 w-5 text-red-500" />
            ) : hasContent ? (
              <ArrowUp className="h-4 w-4 text-black" />
            ) : (
              <Mic className="h-5 w-5 text-[#9CA3AF] transition-colors" />
            )}
          </Button>
        </PromptInputAction>
      </PromptInputActions>
    </PromptInput>
  );

  if (!isAuthenticated) {
    return (
      <TooltipProvider>
        <Tooltip open={showAuthTooltip}>
          <TooltipTrigger asChild>
            <div
              onMouseEnter={() => setShowAuthTooltip(true)}
              onMouseLeave={() => setShowAuthTooltip(false)}
              onClick={handleDisabledClick}
            >
              {PromptBoxContent}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-blue-600 text-white border-blue-500">
            <p className="font-medium">Sign in / Sign up to start chatting</p>
          </TooltipContent>
        </Tooltip>
        <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      </TooltipProvider>
    );
  }
  return (
    <>
      {PromptBoxContent}
      <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      
      {/* GitHub Selector Modal */}
      {showGithubSelector && (
        <GitHubSelector
          isOpen={showGithubSelector}
          onClose={() => setShowGithubSelector(false)}
          onFilesSelected={handleGithubFilesSelected}
        />
      )}
    </>
  );
});
PromptInputBox.displayName = "PromptInputBox";