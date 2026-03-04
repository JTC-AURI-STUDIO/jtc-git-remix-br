
CREATE OR REPLACE FUNCTION public.get_profile_created_at_by_email(p_email text)
RETURNS TABLE(created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.created_at
  FROM public.profiles p
  WHERE p.email = p_email
  LIMIT 1;
END;
$$;
