-- Alterar a foreign key de sale_items para permitir exclusão de produtos
-- Mudando de RESTRICT para SET NULL

-- Primeiro, adicionar coluna para armazenar nome do produto (para histórico quando produto for deletado)
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Atualizar os nomes existentes antes de alterar a constraint
UPDATE public.sale_items si
SET product_name = p.name
FROM public.products p
WHERE si.product_id = p.id AND si.product_name IS NULL;

-- Remover a constraint existente
ALTER TABLE public.sale_items DROP CONSTRAINT IF EXISTS sale_items_product_id_fkey;

-- Alterar coluna product_id para ser nullable
ALTER TABLE public.sale_items ALTER COLUMN product_id DROP NOT NULL;

-- Recriar a constraint com SET NULL
ALTER TABLE public.sale_items 
ADD CONSTRAINT sale_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- Também para purchase_items
ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS product_name TEXT;

UPDATE public.purchase_items pi
SET product_name = p.name
FROM public.products p
WHERE pi.product_id = p.id AND pi.product_name IS NULL;

ALTER TABLE public.purchase_items DROP CONSTRAINT IF EXISTS purchase_items_product_id_fkey;
ALTER TABLE public.purchase_items ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.purchase_items 
ADD CONSTRAINT purchase_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;