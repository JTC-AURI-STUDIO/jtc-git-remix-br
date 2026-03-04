-- Adicionar novos campos de permissões para funcionários
ALTER TABLE public.employee_permissions 
ADD COLUMN IF NOT EXISTS can_access_dashboard BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_history BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_access_reports BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_access_suppliers BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_access_mailbox BOOLEAN NOT NULL DEFAULT false;