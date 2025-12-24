-- Add missing columns to raffles table for Phase 3
ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS category text DEFAULT 'other';
ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS prize_terms text;
ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS livestream_url text;
ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS auto_publish_result boolean DEFAULT false;