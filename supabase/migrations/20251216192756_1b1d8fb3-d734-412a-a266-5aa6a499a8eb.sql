
-- Tabela para armazenar códigos de resgate semanais
CREATE TABLE public.weekly_redemption_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  benefit_type TEXT,
  days_added INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para garantir código único por empresa por semana
CREATE UNIQUE INDEX idx_weekly_codes_user_week ON public.weekly_redemption_codes(user_id, week_start);

-- Índice para garantir que códigos são únicos globalmente
CREATE UNIQUE INDEX idx_weekly_codes_unique ON public.weekly_redemption_codes(code);

-- Enable RLS
ALTER TABLE public.weekly_redemption_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies - apenas admins podem ver seus próprios códigos
CREATE POLICY "Users can view their own redemption codes"
ON public.weekly_redemption_codes
FOR SELECT
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own redemption codes"
ON public.weekly_redemption_codes
FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- Função para gerar código único de 6 dígitos
CREATE OR REPLACE FUNCTION public.generate_weekly_redemption_code()
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
    -- Gera código de 6 dígitos numéricos
    new_code := lpad(floor(random() * 1000000)::text, 6, '0');
    
    -- Verifica se código já existe
    SELECT EXISTS(SELECT 1 FROM public.weekly_redemption_codes WHERE code = new_code) INTO code_exists;
    
    -- Sai do loop se código for único
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Função para criar código semanal para usuário (chamada pelo sistema)
CREATE OR REPLACE FUNCTION public.create_weekly_code_for_user(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_week_start DATE;
  v_week_end DATE;
  v_existing_code TEXT;
BEGIN
  -- Calcula início e fim da semana atual (segunda a domingo)
  v_week_start := date_trunc('week', CURRENT_DATE)::DATE;
  v_week_end := v_week_start + INTERVAL '6 days';
  
  -- Verifica se já existe código para esta semana
  SELECT code INTO v_existing_code
  FROM public.weekly_redemption_codes
  WHERE user_id = p_user_id AND week_start = v_week_start;
  
  IF v_existing_code IS NOT NULL THEN
    RETURN v_existing_code;
  END IF;
  
  -- Gera novo código
  v_code := public.generate_weekly_redemption_code();
  
  -- Insere o código
  INSERT INTO public.weekly_redemption_codes (user_id, code, week_start, week_end)
  VALUES (p_user_id, v_code, v_week_start, v_week_end);
  
  RETURN v_code;
END;
$$;

-- Função para validar e resgatar código
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
    -- 2% chance: 1 ano (365 dias)
    v_benefit_type := '1 ano';
    v_days_to_add := 365;
  ELSIF v_random_number < 0.08 THEN
    -- 6% chance: 3 meses (90 dias)
    v_benefit_type := '3 meses';
    v_days_to_add := 90;
  ELSIF v_random_number < 0.25 THEN
    -- 17% chance: 20 dias
    v_benefit_type := '20 dias';
    v_days_to_add := 20;
  ELSIF v_random_number < 0.55 THEN
    -- 30% chance: 2 dias
    v_benefit_type := '2 dias';
    v_days_to_add := 2;
  ELSE
    -- 45% chance: 1 dia
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
