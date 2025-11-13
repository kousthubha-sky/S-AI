export interface AIModel {
  id: string;
  name: string;
  description: string;
  tier: 'free' | 'pro';
  contextWindow: number;
  provider: string;
}

export const AI_MODELS: AIModel[] = [
  // Free Models
    {
    id: 'meta-llama/llama-4-maverick:free',
    name: 'Llama 4 Maverick',
    description: 'Next-gen open source model with improved reasoning',
    tier: 'free',
    contextWindow: 128000,
    provider: 'Meta'
  },
  {
    id: 'openai/gpt-oss-20b:free',
    name: 'GPT-OSS',
    description: 'High-quality base model optimized for general chat',
    tier: 'free',
    contextWindow: 131072,
    provider: 'OpenAI'
  },
  
  {

    id: 'tngtech/deepseek-r1t2-chimera:free',
    name: 'DeepSeek Chimera',
    description: 'Balanced open source model for diverse tasks',
    tier: 'free',
    contextWindow: 8192,
    provider: 'TNGTech'
  },
  {
    id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    name: 'Venice/Mistral 24B',
    description: 'Efficient and powerful uncensored model',
    tier: 'free',
    contextWindow: 8192,
    provider: 'MistralAI'
  },
  {
    id: 'meta-llama/llama-3.2-3b-instruct:free',
    name: 'NMeta Llama 3.2 3B',
    description: 'Knowledge-enhanced(Hindi,Spanish) open source model',
    tier: 'free',
    contextWindow: 131072,
    provider: 'Meta'
  },

  {
    id: 'qwen/qwen3-30b-a3b:free',
    name: 'Qwen 3',
    description: 'Versatile open source model with strong language skills,Suitable for coding tasks',
    tier: 'free',
    contextWindow: 4096,
    provider: 'Qwen'
  },
  {
    id: 'qwen/qwen3-235b-a22b:free',
    name: 'Qwen 3 235B',
    description: 'supports seamless switching between a "thinking" mode for complex reasoning, math, and code tasks, and a "non-thinking" mode for general conversational efficiency.multilingual support (100+ languages and dialects),',
    tier: 'free',
    contextWindow: 4096,
    provider: 'Qwen'
  },


  // Pro Models
  {
    id: 'x-ai/grok-4-fast',
    name: 'Grok 4 Fast',
    description: 'Grok 4 Fast is xAI s latest multimodal model with SOTA cost-efficiency and a 2M token context window',
    tier: 'pro',
    contextWindow: 2000000,
    provider: 'Grok'
  },
  {
    id: 'google/gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    description: 'It is capable of image generation, edits, and multi-turn conversations. ',
    tier: 'pro',
    contextWindow: 32768,
    provider: 'Google'
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Code Llama 34B',
    description: 'he Meta Llama 3.3 multilingual large language model (LLM) is a pretrained and instruction tuned generative model ',
    tier: 'pro',
    contextWindow: 131072,
    provider: 'Meta'
  },
  

  
];