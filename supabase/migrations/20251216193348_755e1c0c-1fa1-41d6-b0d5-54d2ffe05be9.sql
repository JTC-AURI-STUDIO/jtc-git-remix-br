
-- Atualiza função para modo de teste (sem restrição de horário e múltiplos resgates)
CREATE OR REPLACE FUNCTION public.redeem_weekly_code(p_user_id UUID, p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_benefit_type TEXT;
  v_days_to_add INTEGER;
  v_random_number FLOAT;
BEGIN
  -- MODO TESTE: Sem validação de dia/horário
  
  -- Busca o código
  SELECT * INTO v_record
  FROM public.weekly_redemption_codes
  WHERE user_id = p_user_id AND code = p_code;
  
  -- Código não encontrado ou não pertence ao usuário
  IF v_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Código inválido');
  END IF;
  
  -- MODO TESTE: Permite reutilizar códigos - não verifica is_used
  
  -- Sorteia o benefício
  v_random_number := random();
  
  IF v_random_number < 0.02 THEN
    v_benefit_type := '1 ano';
    v_days_to_add := 365;
  ELSIF v_random_number < 0.08 THEN
    v_benefit_type := '3 meses';
    v_days_to_add := 90;
  ELSIF v_random_number < 0.25 THEN
    v_benefit_type := '20 dias';
    v_days_to_add := 20;
  ELSIF v_random_number < 0.55 THEN
    v_benefit_type := '2 dias';
    v_days_to_add := 2;
  ELSE
    v_benefit_type := '1 dia';
    v_days_to_add := 1;
  END IF;
  
  -- Atualiza o código como usado
  UPDATE public.weekly_redemption_codes
  SET is_used = true,
      used_at = CURRENT_TIMESTAMP,
      benefit_type = v_benefit_type,
      days_added = v_days_to_add
  WHERE id = v_record.id;
  
  -- Atualiza a assinatura do usuário
  UPDATE public.profiles
  SET subscription_ends_at = GREATEST(COALESCE(subscription_ends_at, trial_ends_at, NOW()), NOW()) + (v_days_to_add || ' days')::INTERVAL,
      subscription_plan = CASE 
        WHEN subscription_plan = 'trial' THEN 'ativo'
        ELSE COALESCE(subscription_plan, 'ativo')
      END
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true, 
    'benefit_type', v_benefit_type, 
    'days_added', v_days_to_add
  );
END;
$$;
