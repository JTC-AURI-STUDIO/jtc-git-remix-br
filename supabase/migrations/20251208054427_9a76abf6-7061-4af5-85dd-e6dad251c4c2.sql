-- Add DELETE policy for sale_items (currently missing)
CREATE POLICY "Users can delete own sale items"
ON public.sale_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = sale_items.sale_id
    AND sales.user_id = auth.uid()
  )
);

-- Add DELETE policy for sales (currently missing)
CREATE POLICY "Users can delete own sales"
ON public.sales
FOR DELETE
USING (auth.uid() = user_id);