
-- Restaura função com validações originais
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
  v_current_time TIME;
  v_current_day INTEGER;
BEGIN
  -- Verifica se é segunda-feira (1 = segunda no PostgreSQL com dow)
  v_current_day := EXTRACT(DOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
  v_current_time := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::TIME;
  
  -- DOW: 0 = domingo, 1 = segunda, etc.
  IF v_current_day != 1 THEN
    RETURN json_build_object('success', false, 'error', 'Evento disponível apenas às segundas-feiras');
  END IF;
  
  -- Verifica se está no horário (16:00 às 17:00)
  IF v_current_time < '16:00:00'::TIME OR v_current_time >= '17:00:00'::TIME THEN
    RETURN json_build_object('success', false, 'error', 'Evento disponível apenas das 16:00 às 17:00');
  END IF;
  
  -- Busca o código
  SELECT * INTO v_record
  FROM public.weekly_redemption_codes
  WHERE user_id = p_user_id AND code = p_code;
  
  -- Código não encontrado ou não pertence ao usuário
  IF v_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Código inválido');
  END IF;
  
  -- Código já utilizado
  IF v_record.is_used THEN
    RETURN json_build_object('success', false, 'error', 'Código já foi utilizado');
  END IF;
  
  -- Verifica se o código é da semana atual
  IF CURRENT_DATE < v_record.week_start OR CURRENT_DATE > v_record.week_end THEN
    RETURN json_build_object('success', false, 'error', 'Código expirado');
  END IF;
  
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
