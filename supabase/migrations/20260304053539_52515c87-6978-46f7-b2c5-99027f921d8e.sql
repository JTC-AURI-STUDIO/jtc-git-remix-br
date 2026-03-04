DROP FUNCTION IF EXISTS public.check_email_available_for_employee(text);

CREATE FUNCTION public.check_email_available_for_employee(check_email text)
RETURNS TABLE(available boolean, reason text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if registered in profiles
  IF EXISTS(SELECT 1 FROM public.profiles p WHERE lower(p.email) = lower(check_email)) THEN
    IF EXISTS(
      SELECT 1 FROM auth.users u 
      WHERE lower(u.email) = lower(check_email) 
      AND u.email_confirmed_at IS NOT NULL
    ) THEN
      RETURN QUERY SELECT false, 'Este e-mail já está cadastrado na plataforma'::text;
      RETURN;
    ELSE
      IF EXISTS(
        SELECT 1 FROM auth.users u
        WHERE lower(u.email) = lower(check_email)
        AND u.email_confirmed_at IS NULL
        AND u.created_at > now() - interval '24 hours'
      ) THEN
        RETURN QUERY SELECT false, 'Este e-mail possui um cadastro pendente aguardando verificação (expira em 24h)'::text;
        RETURN;
      ELSE
        RETURN QUERY SELECT true, ''::text;
        RETURN;
      END IF;
    END IF;
  END IF;
  
  IF EXISTS(SELECT 1 FROM public.employees e WHERE lower(e.email) = lower(check_email)) THEN
    RETURN QUERY SELECT false, 'Este e-mail já está cadastrado como funcionário'::text;
    RETURN;
  END IF;
  
  IF EXISTS(
    SELECT 1 FROM auth.users u
    WHERE lower(u.email) = lower(check_email)
    AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RETURN QUERY SELECT false, 'Este e-mail já está cadastrado na plataforma'::text;
    RETURN;
  END IF;
  
  IF EXISTS(
    SELECT 1 FROM auth.users u
    WHERE lower(u.email) = lower(check_email)
    AND u.email_confirmed_at IS NULL
    AND u.created_at > now() - interval '24 hours'
  ) THEN
    RETURN QUERY SELECT false, 'Este e-mail possui um cadastro pendente aguardando verificação (expira em 24h)'::text;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, ''::text;
END;
$$;