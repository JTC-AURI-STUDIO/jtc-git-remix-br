-- Tabela de pagamentos de assinatura
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  days_to_add INTEGER NOT NULL,
  mercado_pago_payment_id TEXT NOT NULL UNIQUE,
  mercado_pago_qr_code TEXT,
  mercado_pago_qr_code_base64 TEXT,
  mercado_pago_pix_copy_paste TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id
  ON public.subscription_payments(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_status
  ON public.subscription_payments(status);

-- Trigger de atualização automática do updated_at
CREATE OR REPLACE FUNCTION public.update_subscription_payments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_payments_updated_at ON public.subscription_payments;
CREATE TRIGGER trg_subscription_payments_updated_at
BEFORE UPDATE ON public.subscription_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_subscription_payments_updated_at();

-- RLS
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Policies do próprio usuário
DROP POLICY IF EXISTS "Users can view own subscription payments" ON public.subscription_payments;
CREATE POLICY "Users can view own subscription payments"
ON public.subscription_payments
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own subscription payments" ON public.subscription_payments;
CREATE POLICY "Users can create own subscription payments"
ON public.subscription_payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscription payments" ON public.subscription_payments;
CREATE POLICY "Users can update own subscription payments"
ON public.subscription_payments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);