-- Atualizar constraint para permitir pagamento múltiplo
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;

ALTER TABLE public.sales ADD CONSTRAINT sales_payment_method_check 
CHECK (payment_method = ANY (ARRAY['credit'::text, 'debit'::text, 'pix'::text, 'cash'::text, 'fiado'::text, 'credito'::text, 'multiplo'::text]));