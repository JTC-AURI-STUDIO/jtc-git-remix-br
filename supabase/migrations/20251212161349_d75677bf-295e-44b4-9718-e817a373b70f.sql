-- Criar função para buscar assinatura do admin (para funcionários)
CREATE OR REPLACE FUNCTION public.get_admin_subscription(admin_user_id uuid)
RETURNS TABLE(
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,
  subscription_plan text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.trial_ends_at, p.subscription_ends_at, p.subscription_plan
  FROM public.profiles p
  WHERE p.id = admin_user_id;
END;
$$;

-- Criar função para buscar configurações da loja do admin
CREATE OR REPLACE FUNCTION public.get_admin_store_settings(admin_user_id uuid)
RETURNS TABLE(
  quick_actions_enabled boolean,
  hide_trial_message boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.quick_actions_enabled, s.hide_trial_message
  FROM public.store_settings s
  WHERE s.user_id = admin_user_id;
END;
$$;