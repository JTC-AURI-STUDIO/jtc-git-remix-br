-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on subscription_payments table  
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners (extra security layer)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments FORCE ROW LEVEL SECURITY;