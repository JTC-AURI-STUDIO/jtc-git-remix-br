-- Create function to get user email by CPF for both main users and employees
CREATE OR REPLACE FUNCTION public.get_user_email_by_cpf(search_cpf text)
RETURNS TABLE(email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- First try main account profiles
  SELECT p.email INTO v_email
  FROM public.profiles p
  WHERE p.cpf = search_cpf
  LIMIT 1;

  -- If not found, try employees table
  IF v_email IS NULL THEN
    SELECT e.email INTO v_email
    FROM public.employees e
    WHERE e.cpf = search_cpf
    LIMIT 1;
  END IF;

  IF v_email IS NOT NULL THEN
    RETURN QUERY SELECT v_email;
  END IF;

  RETURN;
END;
$$;