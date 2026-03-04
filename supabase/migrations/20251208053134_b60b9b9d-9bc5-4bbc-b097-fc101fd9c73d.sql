-- Add column to store hide trial message preference
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hide_trial_message boolean DEFAULT false;