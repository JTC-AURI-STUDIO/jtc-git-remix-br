-- Add column to track if invite code was already used
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invite_code_used BOOLEAN DEFAULT FALSE;

-- Update the handle_new_user function to check if code was already used
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id UUID;
  trial_days INTEGER := 3;
  code_already_used BOOLEAN;
BEGIN
  -- Check if there's a referral code
  IF NEW.raw_user_meta_data->>'referred_by_code' IS NOT NULL AND NEW.raw_user_meta_data->>'referred_by_code' != '' THEN
    -- Find the referrer by their invite code
    SELECT id, invite_code_used INTO referrer_id, code_already_used
    FROM public.profiles 
    WHERE invite_code = UPPER(NEW.raw_user_meta_data->>'referred_by_code');
    
    -- Only apply benefits if code exists AND was not already used
    IF referrer_id IS NOT NULL AND (code_already_used IS NULL OR code_already_used = FALSE) THEN
      -- Give 1 month + 3 days to the new user (33 days total)
      trial_days := 33;
      
      -- Give 1 month extra to the referrer AND mark the code as used
      UPDATE public.profiles 
      SET 
        trial_ends_at = GREATEST(trial_ends_at, NOW()) + INTERVAL '30 days',
        invite_code_used = TRUE
      WHERE id = referrer_id;
    ELSE
      -- Code was already used or doesn't exist, treat as no referral
      referrer_id := NULL;
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