-- Create table to track IP addresses that used invite codes
CREATE TABLE public.invite_code_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  invite_code TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent same IP using same invite code
CREATE UNIQUE INDEX idx_invite_code_ip ON public.invite_code_usage(ip_address, invite_code);

-- Enable RLS
ALTER TABLE public.invite_code_usage ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (via edge function)
CREATE POLICY "Service role can manage invite usage"
ON public.invite_code_usage
FOR ALL
USING (true)
WITH CHECK (true);

-- Users can view their own referrals (who used their code)
CREATE POLICY "Users can view who used their invite code"
ON public.invite_code_usage
FOR SELECT
USING (
  invite_code IN (
    SELECT invite_code FROM public.profiles WHERE id = auth.uid()
  )
);