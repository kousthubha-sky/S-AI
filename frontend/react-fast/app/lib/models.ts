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
    id: "x-ai/grok-4.1-fast:free",
    name: "xAI",
    provider: "xAI",
    description: "Grok 4.1 Fast is xAI's best agentic tool calling model that shines in real-world use cases like customer support and deep research. 2M context window.",
    tier: "free"
  },
    {
    id: "openai/gpt-oss-20b:free",
    name: "GPT OSS",
    provider: "OpenAI",
    description: "Open-source GPT model, great for basic tasks",
    tier: "free"
  },
  {
    id:"nvidia/nemotron-nano-12b-v2-vl:free",
    name: "NemoTron",
    provider: "NVIDIA",
    description: "Lightweight model optimized for speed and efficiency",
    tier: "free"
  },
  {
    id:"z-ai/glm-4.5-air:free",
    name: "GLM 4.5 Air",
    provider: "Z-AI",
    description: "Balanced model for general-purpose tasks",
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
    name: "Mistral 24B",
    provider: "Cognitive",
    description: "Versatile model for creative and analytical tasks",
    tier: "free"
  },
  {
    id: "moonshotai/kimi-k2:free",
    name: "Kimi K2",
    provider: "Moonshot AI",
    description: "Efficient model for everyday applications",
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
    name: "Llama 3.3",
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
    name: "Gemini 2.5 Flash Image",
    provider: "Google",
    description: "Advanced image generation with contextual understanding",
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