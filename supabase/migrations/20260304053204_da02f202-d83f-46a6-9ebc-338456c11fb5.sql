CREATE OR REPLACE FUNCTION public.check_cpf_available_for_employee(check_cpf text)
RETURNS TABLE(available boolean, reason text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    NOT EXISTS(
      SELECT 1 FROM public.profiles p 
      WHERE replace(replace(p.cpf, '.', ''), '-', '') = replace(replace(check_cpf, '.', ''), '-', '')
    ) AND NOT EXISTS(
      SELECT 1 FROM public.employees e
      WHERE e.cpf = replace(replace(check_cpf, '.', ''), '-', '')
    ) AS available,
    CASE
      WHEN EXISTS(
        SELECT 1 FROM public.profiles p 
        WHERE replace(replace(p.cpf, '.', ''), '-', '') = replace(replace(check_cpf, '.', ''), '-', '')
      ) THEN 'Este CPF já está cadastrado em uma conta do sistema'
      WHEN EXISTS(
        SELECT 1 FROM public.employees e
        WHERE e.cpf = replace(replace(check_cpf, '.', ''), '-', '')
      ) THEN 'Este CPF já está cadastrado como funcionário em outra empresa'
      ELSE ''
    END AS reason;
$$;

CREATE OR REPLACE FUNCTION public.check_email_available_for_employee(check_email text)
RETURNS TABLE(available boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS(
    SELECT 1 FROM public.profiles p WHERE lower(p.email) = lower(check_email)
  ) AND NOT EXISTS(
    SELECT 1 FROM public.employees e WHERE lower(e.email) = lower(check_email)
  ) AS available;
$$;