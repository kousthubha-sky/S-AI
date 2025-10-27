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
  // Filter models based on user tier
  const availableModels = AI_MODELS.filter(model => {
    if (userTier === 'pro') return true;
    return model.tier === 'free';
  });

  const selectedModelInfo = AI_MODELS.find(m => m.id === selectedModel);

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((model) => (
            <SelectItem
              key={model.id}
              value={model.id}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span>{model.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({model.provider})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedModelInfo && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>{selectedModelInfo.description}</span>
        </div>
      )}
    </div>
  );
}