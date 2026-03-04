-- Adicionar campos para configuração de Pix Automático por loja
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS pix_mode text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS mercado_pago_cpf text,
ADD COLUMN IF NOT EXISTS mercado_pago_name text;

-- Comentários para documentação
COMMENT ON COLUMN public.store_settings.pix_mode IS 'Modo de pagamento PIX: manual ou automatic';
COMMENT ON COLUMN public.store_settings.mercado_pago_cpf IS 'CPF do titular da conta Mercado Pago';
COMMENT ON COLUMN public.store_settings.mercado_pago_name IS 'Nome do titular da conta Mercado Pago';

-- Criar tabela para armazenar tokens de integração por loja (criptografados)
CREATE TABLE IF NOT EXISTS public.store_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  integration_type text NOT NULL,
  encrypted_token text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, integration_type)
);

-- Habilitar RLS
ALTER TABLE public.store_integrations ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Users can view their own integrations"
ON public.store_integrations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations"
ON public.store_integrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
ON public.store_integrations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
ON public.store_integrations
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_store_integrations_updated_at
BEFORE UPDATE ON public.store_integrations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();