
-- Fix invite_code_usage INSERT policy to require authentication
DROP POLICY IF EXISTS "Allow insert for invite tracking" ON public.invite_code_usage;

CREATE POLICY "Allow authenticated insert for invite tracking"
ON public.invite_code_usage
FOR INSERT
TO authenticated
WITH CHECK (true);
