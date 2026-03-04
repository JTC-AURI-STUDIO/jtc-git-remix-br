-- Adicionar coluna supplier_id na tabela products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;