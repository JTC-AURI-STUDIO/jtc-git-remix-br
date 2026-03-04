
-- Add RLS policies to email_verifications table
CREATE POLICY "Users can view own verifications"
ON public.email_verifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verifications"
ON public.email_verifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also add a unique constraint on profiles.user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;
