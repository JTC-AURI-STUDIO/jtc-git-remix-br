-- Fix handle_new_user to not grant admin role to employees created via service
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referrer_id UUID;
  trial_days INTEGER := 3;
  is_employee BOOLEAN := COALESCE(NEW.raw_user_meta_data->>'is_employee', 'false')::boolean;
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
  
  -- Only main accounts (not employees) get default store settings and admin role
  IF NOT is_employee THEN
    -- Criar configurações padrão da loja
    INSERT INTO public.store_settings (user_id)
    VALUES (NEW.id);
    
    -- Atribuir role de admin para novos usuários principais
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Clean up: remove accidental admin roles from existing employees
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id IN (SELECT user_id FROM public.employees);