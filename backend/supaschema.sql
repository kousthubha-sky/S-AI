-- users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,            -- optional: maps to Supabase Auth UID
  email text UNIQUE NOT NULL,
  email_verified boolean DEFAULT false,
  full_name text,
  preferred_name text,
  avatar_url text,
  timezone text,
  locale text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- user_usage: tracks per-user usage metrics (e.g., API calls, tokens, minutes)
CREATE TABLE user_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid,                     -- optional reference to project scope
  period_start date NOT NULL,          -- grouping window start (e.g., month)
  period_end date NOT NULL,            -- grouping window end
  api_requests bigint DEFAULT 0,       -- number of requests
  tokens_consumed bigint DEFAULT 0,    -- e.g., tokens used by embeddings/LLM
  minutes_used numeric(12,3) DEFAULT 0, -- compute minutes, if applicable
  cost_cents bigint DEFAULT 0,         -- tracked cost for period
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_user_usage_user_period ON user_usage (user_id, period_start);

-- subscriptions: billing/subscription plans per user/org
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,                       -- optional multi-tenant link
  organization_id uuid,                 -- optional org-level subscription
  user_id uuid,                         -- optional user-level subscription
  external_subscription_id text,        -- from payment provider
  plan_id text,                         -- internal plan identifier
  status text NOT NULL DEFAULT 'active',-- e.g., active, past_due, canceled
  price_cents bigint,
  currency text DEFAULT 'usd',
  interval text,                        -- monthly/annual/etc.
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions (organization_id);

-- payment_transactions: payments, refunds, webhooks from payment provider
CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  tenant_id uuid,
  organization_id uuid,
  user_id uuid,                         -- who initiated or is billed
  external_transaction_id text,         -- provider transaction id
  type text NOT NULL,                   -- e.g., payment, refund, invoice
  amount_cents bigint NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL,                 -- succeeded, failed, pending
  provider text,                        -- e.g., stripe
  provider_payload jsonb DEFAULT '{}'::jsonb, -- raw webhook
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_sub ON payment_transactions (subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions (user_id);

-- documents: content storage for embeddings/search
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,                      -- optional project scope
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title text,
  content text,
  content_type text DEFAULT 'text',     -- text, html, markdown, pdf, etc.
  -- Embedding: use float8[] or pgvector vector(<dim>) if extension enabled
  embedding float8[],
  embedding_model text,                 -- model used to create embedding
  language text,
  source text,                          -- e.g., upload, url, scraping
  url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents (owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents (project_id);
-- If using pgvector, create a vector index separately:
-- CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- chat_sessions: session metadata (conversation-level)
CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,                      -- scope
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title text,
  session_state jsonb DEFAULT '{}'::jsonb, -- model settings, system prompt, etc.
  is_active boolean DEFAULT true,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_project ON chat_sessions (project_id);

-- chat_messages: message-level storage for sessions
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL, -- author (could be system/bot)
  role text NOT NULL DEFAULT 'user',    -- user, assistant, system
  content text NOT NULL,
  content_tokens int,                   -- token count if tracked
  response_to uuid,                     -- references chat_messages(id) for threading
  metadata jsonb DEFAULT '{}'::jsonb,   -- e.g., function_call info, tool outputs
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages (created_at DESC);