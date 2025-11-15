// frontend/react-fast/app/lib/models.ts - MULTI-TIER VERSION

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  tier: "free" | "starter" | "pro" | "pro_plus"; // ✅ Updated tiers
}

export const AI_MODELS: AIModel[] = [
  // ==================== FREE TIER ====================
  {
    id: "openai/gpt-oss-20b:free",
    name: "GPT OSS 20B",
    provider: "OpenAI",
    description: "Open-source GPT model, great for basic tasks",
    tier: "free"
  },
  {
    id: "tngtech/deepseek-r1t2-chimera:free",
    name: "DeepSeek R1T2",
    provider: "TNG",
    description: "Advanced reasoning model for complex problems",
    tier: "free"
  },
  {
    id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    name: "Dolphin Mistral 24B",
    provider: "Cognitive",
    description: "Versatile model for creative and analytical tasks",
    tier: "free"
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Llama 3.2 3B",
    provider: "Meta",
    description: "Compact and efficient instruction-following model",
    tier: "free"
  },
  {
    id: "meta-llama/llama-4-maverick:free",
    name: "Llama 4 Maverick",
    provider: "Meta",
    description: "Experimental Llama variant with enhanced capabilities",
    tier: "free"
  },
  {
    id: "qwen/qwen3-30b-a3b:free",
    name: "Qwen3 30B",
    provider: "Alibaba",
    description: "Multilingual model with strong reasoning",
    tier: "free"
  },
  {
    id: "qwen/qwen3-235b-a22b:free",
    name: "Qwen3 235B",
    provider: "Alibaba",
    description: "Large-scale model for complex tasks",
    tier: "free"
  },

  // ==================== STARTER TIER ====================
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    provider: "Meta",
    description: "Powerful instruction-following model with 70B parameters",
    tier: "starter"
  },

  // ==================== PRO TIER ====================
  {
    id: "x-ai/grok-4-fast",
    name: "Grok 4 Fast",
    provider: "xAI",
    description: "Lightning-fast responses with advanced reasoning capabilities",
    tier: "pro"
  },
  {
    id: "google/gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    description: "Fast multimodal model with image generation support",
    tier: "pro"
  },

  // ==================== PRO PLUS TIER ====================
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "State-of-the-art reasoning and code generation",
    tier: "pro_plus"
  },
  {
    id: "openai/gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    description: "Most capable model with extended context",
    tier: "pro_plus"
  },
];

// ✅ Helper functions for tier management
export function getAvailableModels(userTier: "free" | "starter" | "pro" | "pro_plus"): AIModel[] {
  const tierHierarchy = {
    "free": 0,
    "starter": 1,
    "pro": 2,
    "pro_plus": 3
  };

  const userLevel = tierHierarchy[userTier];

  return AI_MODELS.filter(model => {
    const modelLevel = tierHierarchy[model.tier];
    return modelLevel <= userLevel;
  });
}

export function hasModelAccess(modelId: string, userTier: "free" | "starter" | "pro" | "pro_plus"): boolean {
  const model = AI_MODELS.find(m => m.id === modelId);
  if (!model) return false;

  const tierHierarchy = {
    "free": 0,
    "starter": 1,
    "pro": 2,
    "pro_plus": 3
  };

  const userLevel = tierHierarchy[userTier];
  const modelLevel = tierHierarchy[model.tier];

  return userLevel >= modelLevel;
}

export function getTierName(tier: "free" | "starter" | "pro" | "pro_plus"): string {
  const names = {
    "free": "Free",
    "starter": "Student Starter",
    "pro": "Student Pro",
    "pro_plus": "Student Pro Plus"
  };
  return names[tier];
}

export function getRequiredTierForModel(modelId: string): "free" | "starter" | "pro" | "pro_plus" | null {
  const model = AI_MODELS.find(m => m.id === modelId);
  return model ? model.tier : null;
}