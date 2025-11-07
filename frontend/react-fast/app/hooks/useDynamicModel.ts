// hooks/useDynamicModel.ts
import { useMemo } from "react";
import { AI_MODELS } from "~/lib/models";

type ModelTier = "free" | "pro";

interface ModelDecisionParams {
  userTier: ModelTier;
  message: string;
  contextLength?: number;
}

export function useDynamicModel() {
  const selectModel = ({ userTier, message, contextLength = 0 }: ModelDecisionParams) => {
    const msg = message.toLowerCase();
    const isCodeQuery = /\b(code|debug|function|class|script|python|java|js|c\+\+|error)\b/.test(msg);
    const isNewsQuery = /\b(news|latest|today|headline|update)\b/.test(msg);
    const isReasoning = /\b(reason|why|analyze|explain|logic|compare|evaluate)\b/.test(msg);
    const isMultilingual = /[áàâäãåæçéèêëíìîïñóòôöõøúùûüýÿœ]/.test(msg);

    // Default priority order
    const modelPriority = [
      { id: "meta-llama/llama-4-maverick:free", label: "Llama 4 Maverick" },
      { id: "tngtech/deepseek-r1t2-chimera:free", label: "DeepSeek Chimera" },
      { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", label: "Mistral 24B" },
      { id: "qwen/qwen3-30b-a3b:free", label: "Qwen 3" },
      { id: "qwen/qwen3-235b-a22b:free", label: "Qwen 3 235B" },
    ];

    // ---- Model selection logic ----
    if (userTier === "pro") {
      // Pro users get access to high-end reasoning or multimodal models
      if (isCodeQuery) return "meta-llama/llama-4-maverick:free";
      if (isNewsQuery) return "tngtech/deepseek-r1t2-chimera:free";
      if (isReasoning) return "qwen/qwen3-235b-a22b:free";
      if (isMultilingual) return "qwen/qwen3-30b-a3b:free";
      if (contextLength > 1000) return "meta-llama/llama-4-maverick:free";
      return "tngtech/deepseek-r1t2-chimera:free";
    }

    // Free tier: pick lightweight fast models
    if (isCodeQuery) return "cognitivecomputations/dolphin-mistral-24b-venice-edition:free";
    if (isNewsQuery) return "tngtech/deepseek-r1t2-chimera:free";
    if (isReasoning) return "qwen/qwen3-30b-a3b:free";
    if (isMultilingual) return "qwen/qwen3-30b-a3b:free";
    if (contextLength > 1000) return "meta-llama/llama-4-maverick:free";

    // Default fallback
    return "tngtech/deepseek-r1t2-chimera:free";
  };

  const availableModels = useMemo(() => AI_MODELS, []);

  return { selectModel, availableModels };
}
