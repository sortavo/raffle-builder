-- Table to track all Telegram messages sent per order (for multi-user sync)
-- When approving/rejecting, we can update ALL messages at once

CREATE TABLE public.telegram_order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  telegram_chat_id TEXT NOT NULL,
  message_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, telegram_chat_id, message_id)
);

-- Index for fast lookups by order_id
CREATE INDEX idx_telegram_order_messages_order_id ON telegram_order_messages(order_id);

-- Enable RLS
ALTER TABLE telegram_order_messages ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage (edge functions use service role)
-- No user policies needed since this is internal system table