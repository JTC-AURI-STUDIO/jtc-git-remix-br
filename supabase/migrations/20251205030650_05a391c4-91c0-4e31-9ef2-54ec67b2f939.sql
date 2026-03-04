-- Add invite code and referral tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);

-- Create function to generate unique invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a 6 character alphanumeric code
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE invite_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Update handle_new_user function to generate invite code and handle referrals
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id UUID;
  trial_days INTEGER := 3;
BEGIN
  -- Check if there's a referral code
  IF NEW.raw_user_meta_data->>'referred_by_code' IS NOT NULL THEN
    -- Find the referrer by their invite code
    SELECT id INTO referrer_id 
    FROM public.profiles 
    WHERE invite_code = NEW.raw_user_meta_data->>'referred_by_code';
    
    IF referrer_id IS NOT NULL THEN
      -- Give 1 month + 3 days to the new user (33 days total)
      trial_days := 33;
      
      -- Give 1 month extra to the referrer
      UPDATE public.profiles 
      SET trial_ends_at = GREATEST(trial_ends_at, NOW()) + INTERVAL '30 days'
      WHERE id = referrer_id;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, cpf, email, phone, cep, street, number, neighborhood, city, state, trial_ends_at, subscription_plan, invite_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'cep', ''),
    COALESCE(NEW.raw_user_meta_data->>'street', ''),
    COALESCE(NEW.raw_user_meta_data->>'number', ''),
    COALESCE(NEW.raw_user_meta_data->>'neighborhood', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', ''),
    NOW() + (trial_days || ' days')::INTERVAL,
    'trial',
    public.generate_invite_code(),
    referrer_id
  );
  
  -- Criar configurações padrão da loja
  INSERT INTO public.store_settings (user_id)
  VALUES (NEW.id);
  
  -- Atribuir role de admin para novos usuários
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

-- Generate invite codes for existing users who don't have one
UPDATE public.profiles 
SET invite_code = public.generate_invite_code()
WHERE invite_code IS NULL;