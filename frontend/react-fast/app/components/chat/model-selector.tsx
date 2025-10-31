import { useEffect } from "react";
import { Button } from "~/components/ui/button";
import { AI_MODELS, type AIModel } from "~/lib/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Info } from "lucide-react";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  userTier: 'free' | 'pro';
}

export function ModelSelector({ selectedModel, onModelChange, userTier }: ModelSelectorProps) {
  // Only show models available for the user's tier
  const availableModels = userTier === 'pro' 
    ? AI_MODELS // Pro users can see all models
    : AI_MODELS.filter(model => model.tier === 'free'); // Free users only see free models

  // Handle tier changes and force switch to free model if needed
  useEffect(() => {
    // Always verify if current model is accessible with current tier
    const currentModel = AI_MODELS.find(m => m.id === selectedModel);
    
    // If no current model found, switch to first free model
    if (!currentModel) {
      const firstFreeModel = AI_MODELS.find(m => m.tier === 'free');
      if (firstFreeModel) {
        onModelChange(firstFreeModel.id);
      }
      return;
    }
    
    // If user is not pro and using a pro model, switch to free
    if (userTier !== 'pro' && currentModel.tier === 'pro') {
      const firstFreeModel = AI_MODELS.find(m => m.tier === 'free');
      if (firstFreeModel) {
        onModelChange(firstFreeModel.id);
      }
    }
  }, [userTier, selectedModel, onModelChange]);

  const selectedModelInfo = AI_MODELS.find(m => m.id === selectedModel);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select value={selectedModel} onValueChange={onModelChange}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {/* Show upgrade message for free users */}
            {userTier !== 'pro' && (
              <div className="px-2 py-1 text-sm text-muted-foreground">
                Free tier models
              </div>
            )}
            
            {/* Free models first */}
            {availableModels
              .filter(model => model.tier === 'free')
              .map((model) => (
                <SelectItem
                  key={model.id}
                  value={model.id}
                >
                  <div className="flex items-center gap-2">
                    <span>{model.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({model.provider})
                    </span>
                  </div>
                </SelectItem>
              ))}
            
            {/* Pro models section only for pro users */}
            {userTier === 'pro' && (
              <>
                <div className="px-2 py-1 mt-2 text-sm text-muted-foreground border-t">
                  Pro models
                </div>
                {availableModels
                  .filter(model => model.tier === 'pro')
                  .map((model) => (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                    >
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({model.provider})
                        </span>
                        <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                          PRO
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </>
            )}
          </SelectContent>
        </Select>

        
      </div>
      
      
      {/* Model description */}
      {selectedModelInfo && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>{selectedModelInfo.description}</span>
        </div>
      )}
    </div>
  );
}