
-- Employees table
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  cpf text NOT NULL,
  email text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Employee permissions table
CREATE TABLE public.employee_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id, permission_key)
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

-- RLS for employees: admins can manage their own employees
CREATE POLICY "Admins can view own employees" ON public.employees
  FOR SELECT USING (admin_id = auth.uid());

CREATE POLICY "Admins can insert own employees" ON public.employees
  FOR INSERT WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can update own employees" ON public.employees
  FOR UPDATE USING (admin_id = auth.uid());

CREATE POLICY "Admins can delete own employees" ON public.employees
  FOR DELETE USING (admin_id = auth.uid());

-- Employees can view their own record
CREATE POLICY "Employees can view own record" ON public.employees
  FOR SELECT USING (user_id = auth.uid());

-- RLS for employee_permissions: admins manage, employees read own
CREATE POLICY "Admins can manage permissions" ON public.employee_permissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_permissions.employee_id AND e.admin_id = auth.uid())
  );

CREATE POLICY "Employees can view own permissions" ON public.employee_permissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_permissions.employee_id AND e.user_id = auth.uid())
  );

-- Function to check if current user is an employee and get admin_id
CREATE OR REPLACE FUNCTION public.get_employee_admin_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT admin_id FROM public.employees WHERE user_id = _user_id AND is_active = true LIMIT 1;
$$;

-- Function to check employee permission
CREATE OR REPLACE FUNCTION public.check_employee_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ep.allowed 
     FROM public.employee_permissions ep
     JOIN public.employees e ON e.id = ep.employee_id
     WHERE e.user_id = _user_id AND e.is_active = true AND ep.permission_key = _permission_key
     LIMIT 1),
    false
  );
$$;

-- Employees should see their admin's data (products, customers, etc.)
-- We need policies that allow employees to see their admin's records
-- For products table
CREATE POLICY "Employees can view admin products" ON public.products
  FOR SELECT USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Employees can insert admin products" ON public.products
  FOR INSERT WITH CHECK (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Employees can update admin products" ON public.products
  FOR UPDATE USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Employees can delete admin products" ON public.products
  FOR DELETE USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

-- For customers table
CREATE POLICY "Employees can view admin customers" ON public.customers
  FOR SELECT USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Employees can insert admin customers" ON public.customers
  FOR INSERT WITH CHECK (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Employees can update admin customers" ON public.customers
  FOR UPDATE USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Employees can delete admin customers" ON public.customers
  FOR DELETE USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

-- For suppliers table
CREATE POLICY "Employees can view admin suppliers" ON public.suppliers
  FOR SELECT USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Employees can insert admin suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Employees can update admin suppliers" ON public.suppliers
  FOR UPDATE USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Employees can delete admin suppliers" ON public.suppliers
  FOR DELETE USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

-- For sales table
CREATE POLICY "Employees can view admin sales" ON public.sales
  FOR SELECT USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Employees can insert admin sales" ON public.sales
  FOR INSERT WITH CHECK (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Employees can update admin sales" ON public.sales
  FOR UPDATE USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

-- For sale_items (via sales join)
CREATE POLICY "Employees can view admin sale items" ON public.sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales s 
      WHERE s.id = sale_items.sale_id 
      AND s.user_id = (SELECT public.get_employee_admin_id(auth.uid()))
      AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
    )
  );

CREATE POLICY "Employees can insert admin sale items" ON public.sale_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s 
      WHERE s.id = sale_items.sale_id 
      AND s.user_id = (SELECT public.get_employee_admin_id(auth.uid()))
      AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
    )
  );

-- For categories table
CREATE POLICY "Employees can view admin categories" ON public.categories
  FOR SELECT USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Employees can insert admin categories" ON public.categories
  FOR INSERT WITH CHECK (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Employees can update admin categories" ON public.categories
  FOR UPDATE USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Employees can delete admin categories" ON public.categories
  FOR DELETE USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

-- For store_settings (employees need to read admin's store settings)
CREATE POLICY "Employees can view admin store settings" ON public.store_settings
  FOR SELECT USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );

-- For store_integrations
CREATE POLICY "Employees can view admin store integrations" ON public.store_integrations
  FOR SELECT USING (
    user_id = (SELECT public.get_employee_admin_id(auth.uid()))
    AND public.get_employee_admin_id(auth.uid()) IS NOT NULL
  );
