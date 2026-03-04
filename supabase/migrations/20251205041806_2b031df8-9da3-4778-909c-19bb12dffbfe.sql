-- Atualizar a função handle_new_user para NÃO marcar o código como usado (código ilimitado)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  referrer_id UUID;
  trial_days INTEGER := 3;
BEGIN
  -- Check if there's a referral code
  IF NEW.raw_user_meta_data->>'referred_by_code' IS NOT NULL AND NEW.raw_user_meta_data->>'referred_by_code' != '' THEN
    -- Find the referrer by their invite code
    SELECT id INTO referrer_id
    FROM public.profiles 
    WHERE invite_code = UPPER(NEW.raw_user_meta_data->>'referred_by_code');
    
    -- Apply benefits if code exists (código ilimitado - não verifica se já foi usado)
    IF referrer_id IS NOT NULL THEN
      -- Give 1 month + 3 days to the new user (33 days total)
      trial_days := 33;
      
      -- Give 1 month extra to the referrer (NÃO marca como usado - código ilimitado)
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
$function$;

-- Atualizar a função validate_invite_code para SEMPRE retornar válido se existir (código ilimitado)
CREATE OR REPLACE FUNCTION public.validate_invite_code(code text)
 RETURNS TABLE(is_valid boolean, is_already_used boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  found_profile_id UUID;
BEGIN
  -- Search for the invite code (case insensitive)
  SELECT id INTO found_profile_id
  FROM public.profiles
  WHERE invite_code = UPPER(code);
  
  -- If no profile found with this code
  IF found_profile_id IS NULL THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, FALSE::BOOLEAN;
    RETURN;
  END IF;
  
  -- Code exists and is valid (código ilimitado - sempre válido se existir)
  RETURN QUERY SELECT TRUE::BOOLEAN, FALSE::BOOLEAN;
END;
$function$;