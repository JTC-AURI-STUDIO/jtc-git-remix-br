-- Limpar todas as tabelas de dados do sistema

-- Primeiro, limpar tabelas que dependem de outras (foreign keys)
DELETE FROM public.auri_messages;
DELETE FROM public.auri_conversations;
DELETE FROM public.sale_items;
DELETE FROM public.sales;
DELETE FROM public.purchase_items;
DELETE FROM public.purchases;
DELETE FROM public.customer_transactions;
DELETE FROM public.customers;
DELETE FROM public.products;
DELETE FROM public.categories;
DELETE FROM public.suppliers;
DELETE FROM public.email_logs;
DELETE FROM public.employee_permissions;
DELETE FROM public.employees;
DELETE FROM public.store_integrations;
DELETE FROM public.store_settings;
DELETE FROM public.subscription_payments;
DELETE FROM public.subscription_codes;
DELETE FROM public.weekly_redemption_codes;
DELETE FROM public.invite_code_usage;
DELETE FROM public.user_roles;

-- Limpar CPFs bloqueados (permitir recadastro)
DELETE FROM public.blocked_cpfs;

-- Limpar perfis
DELETE FROM public.profiles;

-- Nota: Os usuários em auth.users serão removidos automaticamente 
-- quando os profiles forem deletados (cascade), ou precisam ser 
-- removidos manualmente via Supabase Dashboard