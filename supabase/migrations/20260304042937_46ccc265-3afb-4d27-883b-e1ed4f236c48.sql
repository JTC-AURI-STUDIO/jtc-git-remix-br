
-- Store settings table
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_name text DEFAULT '',
  commercial_phone text DEFAULT '',
  store_address text DEFAULT '',
  operation_type text DEFAULT '',
  primary_color text DEFAULT '#4C6FFF',
  logo_url text DEFAULT '',
  category text DEFAULT '',
  quick_actions_enabled boolean DEFAULT true,
  hide_trial_message boolean DEFAULT false,
  pix_key_type text DEFAULT '',
  pix_key text DEFAULT '',
  pix_receiver_name text DEFAULT '',
  pix_mode text DEFAULT 'manual',
  mercado_pago_cpf text DEFAULT '',
  mercado_pago_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own store settings" ON public.store_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own store settings" ON public.store_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own store settings" ON public.store_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Store integrations table
CREATE TABLE public.store_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  integration_type text NOT NULL,
  encrypted_token text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, integration_type)
);

ALTER TABLE public.store_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations" ON public.store_integrations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own integrations" ON public.store_integrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own integrations" ON public.store_integrations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
