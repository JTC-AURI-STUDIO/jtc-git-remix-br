-- Permitir que o admin (JTC.ADM@gmail.com) visualize todos os profiles
CREATE POLICY "Admin can view all profiles"
ON public.profiles
FOR SELECT
USING (
  auth.jwt() ->> 'email' = 'jtc.adm@gmail.com'
);

-- Permitir que o admin visualize e delete blocked_cpfs
CREATE POLICY "Admin can view blocked_cpfs"
ON public.blocked_cpfs
FOR SELECT
USING (
  auth.jwt() ->> 'email' = 'jtc.adm@gmail.com'
);

CREATE POLICY "Admin can delete blocked_cpfs"
ON public.blocked_cpfs
FOR DELETE
USING (
  auth.jwt() ->> 'email' = 'jtc.adm@gmail.com'
);

CREATE POLICY "Admin can insert blocked_cpfs"
ON public.blocked_cpfs
FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'email' = 'jtc.adm@gmail.com'
);