-- Add PIX configuration fields to store_settings
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS pix_key_type text,
ADD COLUMN IF NOT EXISTS pix_key text,
ADD COLUMN IF NOT EXISTS pix_receiver_name text;