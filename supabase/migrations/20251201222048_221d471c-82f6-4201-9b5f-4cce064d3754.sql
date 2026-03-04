-- Permitir que funcionários vejam seus próprios dados
CREATE POLICY "Employees can view their own data"
ON public.employees
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);