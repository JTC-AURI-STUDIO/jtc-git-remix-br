-- Adicionar campos de categoria e funcionários na tabela store_settings
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS has_employees boolean DEFAULT false;

-- Criar enum para roles de usuários
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'caixa');

-- Criar tabela de roles de usuários
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Habilitar RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar função de segurança para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Criar tabela de funcionários
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  admin_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  cpf text NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para employees
CREATE POLICY "Admins can view their employees"
ON public.employees
FOR SELECT
TO authenticated
USING (auth.uid() = admin_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert employees"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_id AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update their employees"
ON public.employees
FOR UPDATE
TO authenticated
USING (auth.uid() = admin_id AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete their employees"
ON public.employees
FOR DELETE
TO authenticated
USING (auth.uid() = admin_id AND public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Atualizar função handle_new_user para criar role de admin automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, cpf, email, trial_ends_at, subscription_plan)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    NEW.email,
    NOW() + INTERVAL '3 days',
    'trial'
  );
  
  -- Criar configurações padrão da loja
  INSERT INTO public.store_settings (user_id)
  VALUES (NEW.id);
  
  -- Atribuir role de admin para novos usuários
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;