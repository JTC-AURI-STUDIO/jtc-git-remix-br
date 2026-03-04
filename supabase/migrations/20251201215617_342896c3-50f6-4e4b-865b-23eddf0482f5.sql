-- Criar tabela de permissões de funcionários
CREATE TABLE public.employee_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  can_access_pos BOOLEAN NOT NULL DEFAULT true,
  can_access_products BOOLEAN NOT NULL DEFAULT false,
  can_access_customers BOOLEAN NOT NULL DEFAULT true,
  can_view_subscription BOOLEAN NOT NULL DEFAULT false,
  can_edit_own_profile BOOLEAN NOT NULL DEFAULT false,
  can_access_settings BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Habilitar RLS
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para employee_permissions
CREATE POLICY "Admins can view all permissions"
  ON public.employee_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_permissions.employee_id
      AND (employees.admin_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins can insert permissions"
  ON public.employee_permissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_permissions.employee_id
      AND employees.admin_id = auth.uid()
      AND has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Admins can update permissions"
  ON public.employee_permissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_permissions.employee_id
      AND employees.admin_id = auth.uid()
      AND has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Employees can view their own permissions"
  ON public.employee_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_permissions.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_employee_permissions_updated_at
  BEFORE UPDATE ON public.employee_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();