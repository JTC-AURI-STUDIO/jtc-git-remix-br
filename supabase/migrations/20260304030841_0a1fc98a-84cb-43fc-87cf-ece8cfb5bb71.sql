
-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;

-- Generate unique invite codes for existing profiles
UPDATE public.profiles SET invite_code = upper(substr(md5(random()::text || id::text), 1, 6)) WHERE invite_code IS NULL;

-- Function: get email by CPF for login
CREATE OR REPLACE FUNCTION public.get_user_email_by_cpf(search_cpf text)
RETURNS TABLE(email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.email FROM public.profiles p WHERE replace(replace(p.cpf, '.', ''), '-', '') = replace(replace(search_cpf, '.', ''), '-', '') LIMIT 1;
$$;

-- Function: check if CPF is blocked
CREATE OR REPLACE FUNCTION public.is_cpf_blocked(check_cpf text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.blocked FROM public.profiles p WHERE replace(replace(p.cpf, '.', ''), '-', '') = replace(replace(check_cpf, '.', ''), '-', '') LIMIT 1),
    false
  );
$$;

-- Function: get profile created_at by email
CREATE OR REPLACE FUNCTION public.get_profile_created_at_by_email(p_email text)
RETURNS TABLE(created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.created_at FROM public.profiles p WHERE lower(p.email) = lower(p_email) LIMIT 1;
$$;

-- Function: validate invite code
CREATE OR REPLACE FUNCTION public.validate_invite_code(code text)
RETURNS TABLE(is_valid boolean, is_already_used boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXISTS(SELECT 1 FROM public.profiles p WHERE upper(p.invite_code) = upper(code)) AS is_valid,
    false AS is_already_used;
$$;

-- Trigger function: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_invite_code text;
BEGIN
  -- Generate unique invite code
  new_invite_code := upper(substr(md5(random()::text || NEW.id::text), 1, 6));
  
  INSERT INTO public.profiles (user_id, email, cpf, full_name, phone, invite_code, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    new_invite_code,
    COALESCE((NEW.raw_user_meta_data->>'email_verified')::boolean, false)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (drop if exists first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
