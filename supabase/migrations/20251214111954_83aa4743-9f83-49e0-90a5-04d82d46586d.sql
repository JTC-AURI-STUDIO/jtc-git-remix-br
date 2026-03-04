-- Tabela para rastrear pagamentos via Mercado Pago
CREATE TABLE public.subscription_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL, -- '3_months' ou '1_year'
  amount NUMERIC NOT NULL,
  days_to_add INTEGER NOT NULL,
  mercado_pago_payment_id TEXT,
  mercado_pago_qr_code TEXT,
  mercado_pago_qr_code_base64 TEXT,
  mercado_pago_pix_copy_paste TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, cancelled, expired
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own payments"
ON public.subscription_payments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments"
ON public.subscription_payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_subscription_payments_updated_at
BEFORE UPDATE ON public.subscription_payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();