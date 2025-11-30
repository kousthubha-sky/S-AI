export interface User {
  id: string;
  auth0_id: string;
  email: string;
  name: string | null;
  picture: string | null;
  subscription_tier: 'free' | 'basic' | 'pro';
  subscription_end_date: string | null;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_paid: boolean;
  last_seen_at: string | null;
  signup_method: string | null;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  model_used: string | null;
  created_at: string;
  updated_at: string;
  starred?: boolean;
  isActive?: boolean; // UI state
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used: string | null;
  content_tokens: number | null;
  created_at: string;
}