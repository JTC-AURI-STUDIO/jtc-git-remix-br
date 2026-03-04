-- Create table to store blocked CPFs from deleted accounts
CREATE TABLE public.blocked_cpfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf text NOT NULL UNIQUE,
  original_user_id uuid,
  blocked_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text DEFAULT 'account_deleted',
  notes text
);

-- Enable RLS
ALTER TABLE public.blocked_cpfs ENABLE ROW LEVEL SECURITY;

-- Only service role can manage blocked CPFs (no client access)
-- This is intentional - users cannot see or modify blocked CPFs

-- Create a function to check if a CPF is blocked
CREATE OR REPLACE FUNCTION public.is_cpf_blocked(check_cpf text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_cpfs WHERE cpf = check_cpf
  )
$$;