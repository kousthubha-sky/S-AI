// lib/database.types.ts
export interface User {
  id: string;
  auth0_id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  subscription_tier: 'free' | 'basic' | 'pro';
  subscription_end_date: string | null;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used: string | null;
  tokens_used: number | null;
  created_at: string;
}