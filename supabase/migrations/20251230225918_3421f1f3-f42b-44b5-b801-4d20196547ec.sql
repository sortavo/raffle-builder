-- Add experience fields to organizations table
ALTER TABLE public.organizations
ADD COLUMN years_experience integer DEFAULT NULL,
ADD COLUMN total_raffles_completed integer DEFAULT 0;