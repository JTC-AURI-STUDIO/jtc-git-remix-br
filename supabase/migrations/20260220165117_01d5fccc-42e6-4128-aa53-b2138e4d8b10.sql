
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Index for CPF login lookup
CREATE INDEX idx_profiles_cpf ON public.profiles (cpf);

-- Remix history table
CREATE TABLE public.remix_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_repo TEXT NOT NULL,
  target_repo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  amount NUMERIC(10,2) DEFAULT 0.30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.remix_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON public.remix_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.remix_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own history" ON public.remix_history FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_remix_history_user ON public.remix_history (user_id, created_at DESC);
