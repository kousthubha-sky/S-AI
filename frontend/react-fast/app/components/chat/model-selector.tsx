// frontend/react-fast/app/components/chat/model-selector.tsx - MULTI-TIER FIXED

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { ChevronDown, Info, Lock } from "lucide-react";
import { AI_MODELS } from "~/lib/models";
import { cn } from "~/lib/utils";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  userTier: "free" | "starter" | "pro" | "pro_plus"; // ✅ Updated types
  isAuthenticated?: boolean; // ✅ Authentication state
  disabled?: boolean; // ✅ Disable model changes (e.g., in thinking mode)
}

export function ModelSelector({ selectedModel, onModelChange, userTier, isAuthenticated = false, disabled = false }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);

  // ✅ Helper function to check if user has access to a model
  const hasAccessToModel = (modelTier: string): boolean => {
    const tierHierarchy = {
      "free": 0,
      "starter": 1,
      "pro": 2,
      "pro_plus": 3
    };
    
    const userLevel = tierHierarchy[userTier] || 0;
    const modelLevel = tierHierarchy[modelTier as keyof typeof tierHierarchy] || 0;
    
    return userLevel >= modelLevel;
  };

  // ✅ Filter models based on user's tier
  const availableModels = useMemo(() => AI_MODELS.filter((model) => hasAccessToModel(model.tier)), [userTier]);
  
  // ✅ All models for display (including locked ones)
  const allModels = AI_MODELS;

  const selectedModelData = AI_MODELS.find((m) => m.id === selectedModel);

  useEffect(() => {
    const currentModel = AI_MODELS.find((m) => m.id === selectedModel);
    
    // ✅ If current model is not accessible, switch to first available model
    if (!currentModel || !hasAccessToModel(currentModel.tier)) {
      const firstAvailableModel = availableModels[0];
      if (firstAvailableModel) {
        onModelChange(firstAvailableModel.id);
      }
    }
  }, [userTier, selectedModel, onModelChange, availableModels]);

  const handleMouseEnter = (e: React.MouseEvent, id: string) => {
    setHoveredModel(id);
  };

  const handleMouseLeave = () => {
    setHoveredModel(null);
  };

  const handleModelSelect = () => {
    setHoveredModel(null);
  };

  // ✅ Get tier badge component
  const getTierBadge = (tier: string) => {
    const badges = {
      "free": null,
      "starter": <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-1.5 py-0.5 rounded">STARTER</span>,
      "pro": <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-1.5 py-0.5 rounded">PRO</span>,
      "pro_plus": <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-1.5 py-0.5 rounded">PRO+</span>
    };
    return badges[tier as keyof typeof badges];
  };

  const Tooltip = () => {
    if (!hoveredModel) return null;
    const model = AI_MODELS.find((m) => m.id === hoveredModel);
    if (!model) return null;

    const isLocked = !hasAccessToModel(model.tier);

    return createPortal(
      <AnimatePresence>
        <motion.div
          key={model.id}
          initial={{ opacity: 0, y: -4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[9999] pointer-events-none"
          style={{
            bottom: '290px',
            left: '430px',
          }}
        >
          <div className="bg-black/90 text-white text-xs rounded-lg px-3 py-2 max-w-xs backdrop-blur-sm border border-white/10 shadow-xl">
            <div className="flex items-start gap-2">
              <Info className="h-3 w-3 mt-0.5 text-white/60 flex-shrink-0" />
              <div>
                <div className="font-medium text-white/90 mb-1">{model.name}</div>
                <div className="text-white/70 leading-relaxed">{model.description}</div>
                <div className="flex items-center gap-2 mt-2 text-white/50">
                  <span>Provider: {model.provider}</span>
                  {getTierBadge(model.tier)}
                </div>
                {isLocked && (
                  <div className="mt-2 text-orange-400 text-xs">
                    🔒 Upgrade to access this model
                  </div>
                )}
              </div>
            </div>
            {/* Arrow */}
            <div className="absolute -bottom-1 left-4 w-2 h-2 bg-black/90 rotate-45 border-r border-b border-white/10"></div>
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  };

  // ✅ Group models by tier
  const freeModels = useMemo(() => allModels.filter(m => m.tier === "free"), []);
  const starterModels = useMemo(() => allModels.filter(m => m.tier === "starter"), []);
  const proModels = useMemo(() => allModels.filter(m => m.tier === "pro"), []);
  const proPlusModels = useMemo(() => allModels.filter(m => m.tier === "pro_plus"), []);

  return (
    <div className="relative">
      {/* Compact Selector Trigger */}
      <motion.button
        onClick={() => isAuthenticated && !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 py-1.5 rounded-2xl border text-xs font-medium transition-all duration-200",
          "bg-background/80 border-border/50 hover:border-border",
          "text-foreground hover:bg-muted/50",
          (!isAuthenticated || disabled) && "cursor-not-allowed opacity-50"
        )}
        whileHover={{ scale: isAuthenticated && !disabled ? 1.02 : 1 }}
        whileTap={{ scale: isAuthenticated && !disabled ? 0.98 : 1 }}
        disabled={!isAuthenticated || disabled}
        title={disabled ? "Model is locked in thinking mode" : !isAuthenticated ? "Sign in to change models" : undefined}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
          <span className="truncate max-w-[120px]">
            {selectedModelData?.name || "Select Model"}
          </span>
        </div>
        <ChevronDown className={cn(
          "h-3 w-3 transition-transform duration-200",
          isOpen ? "rotate-180" : "rotate-0"
        )} />
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 right-0 bg-background/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-2xl min-w-[280px] max-h-[400px] overflow-hidden"
            onMouseLeave={() => {
              setIsOpen(false);
              handleModelSelect();
            }}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-border/30 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">AI Models</span>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-green-500"></div>
                  <span className="text-xs text-muted-foreground">
                    {availableModels.length} available
                  </span>
                </div>
              </div>
            </div>

            {/* Model List */}
            <div className="overflow-y-auto max-h-[139px] scrollbar-hide">
              {/* Free Models */}
              {freeModels.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/10">
                    Free Models
                  </div>
                  {freeModels.map((model) => (
                    <ModelButton
                      key={model.id}
                      model={model}
                      isSelected={selectedModel === model.id}
                      isLocked={false}
                      onSelect={() => {
                        onModelChange(model.id);
                        setIsOpen(false);
                        handleModelSelect();
                      }}
                      onMouseEnter={(e) => handleMouseEnter(e, model.id)}
                      onMouseLeave={handleMouseLeave}
                    />
                  ))}
                </>
              )}

              {/* Starter Models */}
              {starterModels.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/10 border-t border-border/30">
                    Starter Models
                  </div>
                  {starterModels.map((model) => (
                    <ModelButton
                      key={model.id}
                      model={model}
                      isSelected={selectedModel === model.id}
                      isLocked={!hasAccessToModel(model.tier)}
                      onSelect={() => {
                        if (hasAccessToModel(model.tier)) {
                          onModelChange(model.id);
                          setIsOpen(false);
                          handleModelSelect();
                        }
                      }}
                      onMouseEnter={(e) => handleMouseEnter(e, model.id)}
                      onMouseLeave={handleMouseLeave}
                    />
                  ))}
                </>
              )}

              {/* Pro Models */}
              {proModels.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/10 border-t border-border/30">
                    Pro Models
                  </div>
                  {proModels.map((model) => (
                    <ModelButton
                      key={model.id}
                      model={model}
                      isSelected={selectedModel === model.id}
                      isLocked={!hasAccessToModel(model.tier)}
                      onSelect={() => {
                        if (hasAccessToModel(model.tier)) {
                          onModelChange(model.id);
                          setIsOpen(false);
                          handleModelSelect();
                        }
                      }}
                      onMouseEnter={(e) => handleMouseEnter(e, model.id)}
                      onMouseLeave={handleMouseLeave}
                    />
                  ))}
                </>
              )}

              {/* Pro Plus Models */}
              {proPlusModels.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/10 border-t border-border/30">
                    Pro Plus Models
                  </div>
                  {proPlusModels.map((model) => (
                    <ModelButton
                      key={model.id}
                      model={model}
                      isSelected={selectedModel === model.id}
                      isLocked={!hasAccessToModel(model.tier)}
                      onSelect={() => {
                        if (hasAccessToModel(model.tier)) {
                          onModelChange(model.id);
                          setIsOpen(false);
                          handleModelSelect();
                        }
                      }}
                      onMouseEnter={(e) => handleMouseEnter(e, model.id)}
                      onMouseLeave={handleMouseLeave}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-border/30 bg-muted/10">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Current: {selectedModelData?.name}</span>
                <span>{userTier.replace('_', ' ').toUpperCase()}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

  
    </div>
  );
}

// ✅ Model Button Component
interface ModelButtonProps {
  model: any;
  isSelected: boolean;
  isLocked: boolean;
  onSelect: () => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

function ModelButton({ model, isSelected, isLocked, onSelect, onMouseEnter, onMouseLeave }: ModelButtonProps) {
  const getTierBadge = (tier: string) => {
    const badges = {
      "starter": <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-1.5 py-0.5 rounded">STARTER</span>,
      "pro": <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-1.5 py-0.5 rounded">PRO</span>,
      "pro_plus": <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-1.5 py-0.5 rounded">PRO+</span>
    };
    return badges[tier as keyof typeof badges];
  };

  return (
    <motion.button
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={isLocked}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 text-left transition-colors",
        isLocked && "opacity-50 cursor-not-allowed",
        !isLocked && isSelected
          ? "bg-primary/10 text-primary border-r-2 border-primary"
          : !isLocked && "hover:bg-muted/50 text-foreground"
      )}
      whileHover={!isLocked ? { x: 2 } : {}}
    >
      <div className="flex items-center gap-2">
        {isLocked ? (
          <Lock className="w-3 h-3 text-muted-foreground" />
        ) : (
          <div className={cn(
            "w-2 h-2 rounded-full",
            isSelected ? "bg-primary" : "bg-muted-foreground"
          )}></div>
        )}
        <span className="text-xs font-medium">{model.name}</span>
        {model.tier !== "free" && getTierBadge(model.tier)}
      </div>
      <span className="text-xs text-muted-foreground">{model.provider}</span>
    </motion.button>
  );
}