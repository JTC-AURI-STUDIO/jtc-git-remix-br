-- Adicionar 'fiado' aos métodos de pagamento permitidos
ALTER TABLE public.sales 
DROP CONSTRAINT sales_payment_method_check;

ALTER TABLE public.sales 
ADD CONSTRAINT sales_payment_method_check 
CHECK (payment_method IN ('credit', 'debit', 'pix', 'cash', 'fiado'));