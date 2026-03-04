-- Fix profiles table: ensure only authenticated users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Fix subscription_codes table: remove public access to unused codes
DROP POLICY IF EXISTS "Anyone can view unused codes" ON public.subscription_codes;

-- Only admins can view subscription codes
CREATE POLICY "Admins can view subscription codes"
ON public.subscription_codes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can only view codes they've used
CREATE POLICY "Users can view codes they used"
ON public.subscription_codes
FOR SELECT
TO authenticated
USING (used_by = auth.uid());

-- Fix invite_code_usage table: restrict to authenticated users and proper access
DROP POLICY IF EXISTS "Service role can manage invite usage" ON public.invite_code_usage;
DROP POLICY IF EXISTS "Users can view who used their invite code" ON public.invite_code_usage;

-- Allow inserts via service role (edge function uses service role)
CREATE POLICY "Allow insert for invite tracking"
ON public.invite_code_usage
FOR INSERT
WITH CHECK (true);

-- Users can view referrals that used their invite code
CREATE POLICY "Users can view their referrals"
ON public.invite_code_usage
FOR SELECT
TO authenticated
USING (
  invite_code IN (
    SELECT invite_code FROM public.profiles WHERE id = auth.uid()
  )
);