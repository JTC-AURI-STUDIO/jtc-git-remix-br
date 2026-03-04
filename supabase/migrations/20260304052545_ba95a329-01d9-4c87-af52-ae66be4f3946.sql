ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS cargo text NOT NULL DEFAULT 'caixa';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS description text;