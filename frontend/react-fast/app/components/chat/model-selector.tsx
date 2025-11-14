import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { ChevronDown, Info } from "lucide-react";
import { AI_MODELS } from "~/lib/models";
import { cn } from "~/lib/utils";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  userTier: "free" | "pro";
}

export function ModelSelector({ selectedModel, onModelChange, userTier }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);

  const availableModels =
    userTier === "pro"
      ? AI_MODELS
      : AI_MODELS.filter((model) => model.tier === "free");

  const selectedModelData = AI_MODELS.find((m) => m.id === selectedModel);

  useEffect(() => {
    const currentModel = AI_MODELS.find((m) => m.id === selectedModel);
    if (!currentModel || (userTier !== "pro" && currentModel.tier === "pro")) {
      const firstFreeModel = AI_MODELS.find((m) => m.tier === "free");
      if (firstFreeModel) onModelChange(firstFreeModel.id);
    }
  }, [userTier, selectedModel, onModelChange]);

  const handleMouseEnter = (e: React.MouseEvent, id: string) => {
    setHoveredModel(id);
  };

  const handleMouseLeave = () => {
    setHoveredModel(null);
  };

  const handleModelSelect = () => {
    setHoveredModel(null);
  };

  const Tooltip = () => {
    if (!hoveredModel) return null;
    const model = AI_MODELS.find((m) => m.id === hoveredModel);
    if (!model) return null;

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
            bottom: '80px',
            left: '20px',
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
                  {model.tier === "pro" && (
                    <span className="bg-white/10 text-white/80 px-1.5 py-0.5 rounded text-xs">PRO</span>
                  )}
                </div>
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

  return (
    <div className="relative">
      {/* Compact Selector Trigger */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2  py-1.5 rounded-2xl border text-xs font-medium transition-all duration-200",
          "bg-background/80  border-border/50 hover:border-border",
          "text-foreground hover:bg-muted/50"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
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
            className="absolute bottom-full mb-2 left-0 bg-background/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-2xl min-w-[280px] overflow-hidden"
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
            <div className="overflow-hidden scrollbar-hide">
              {/* Free Models */}
              {availableModels.filter((m) => m.tier === "free").length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/10">
                    Free Models
                  </div>
                  {availableModels
                    .filter((model) => model.tier === "free")
                    .map((model) => (
                      <motion.button
                        key={model.id}
                        onClick={() => {
                          onModelChange(model.id);
                          setIsOpen(false);
                          handleModelSelect();
                        }}
                        onMouseEnter={(e) => handleMouseEnter(e, model.id)}
                        onMouseLeave={handleMouseLeave}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-left transition-colors",
                          selectedModel === model.id
                            ? "bg-primary/10 text-primary border-r-2 border-primary"
                            : "hover:bg-muted/50 text-foreground"
                        )}
                        whileHover={{ x: 2 }}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            selectedModel === model.id ? "bg-primary" : "bg-muted-foreground"
                          )}></div>
                          <span className="text-xs font-medium">{model.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{model.provider}</span>
                      </motion.button>
                    ))}
                </>
              )}

              {/* Pro Models */}
              {userTier === "pro" && availableModels.filter((m) => m.tier === "pro").length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/10 border-t border-border/30">
                    Pro Models
                  </div>
                  {availableModels
                    .filter((model) => model.tier === "pro")
                    .map((model) => (
                      <motion.button
                        key={model.id}
                        onClick={() => {
                          onModelChange(model.id);
                          setIsOpen(false);
                          handleModelSelect();
                        }}
                        onMouseEnter={(e) => handleMouseEnter(e, model.id)}
                        onMouseLeave={handleMouseLeave}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-left transition-colors",
                          selectedModel === model.id
                            ? "bg-primary/10 text-primary border-r-2 border-primary"
                            : "hover:bg-muted/50 text-foreground"
                        )}
                        whileHover={{ x: 2 }}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            selectedModel === model.id ? "bg-primary" : "bg-muted-foreground"
                          )}></div>
                          <span className="text-xs font-medium">{model.name}</span>
                          <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-1.5 py-0.5 rounded">PRO</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{model.provider}</span>
                      </motion.button>
                    ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-border/30 bg-muted/10">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Current: {selectedModelData?.name}</span>
                <span>{userTier.toUpperCase()}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Tooltip />
    </div>
  );
}