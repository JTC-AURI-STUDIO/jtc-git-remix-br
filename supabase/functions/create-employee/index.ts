import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) throw new Error('Não autorizado');

    // Verify admin role
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!userRole) throw new Error('Apenas administradores podem criar funcionários');

    const { full_name, email, cpf, password, cargo, description, permissions } = await req.json();

    if (!full_name || !cpf || !password || !email) {
      throw new Error('Nome, e-mail, CPF e senha são obrigatórios');
    }

    // Clean CPF
    const cleanCpf = cpf.replace(/\D/g, '');

    // Check if employee with this CPF already exists for this admin
    const { data: existing } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('admin_id', user.id)
      .eq('cpf', cleanCpf)
      .maybeSingle();

    if (existing) throw new Error('Já existe um funcionário com este CPF');

    // Create auth user with the real email, auto-confirm so no email verification needed
    const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        cpf: cleanCpf,
        is_employee: true,
      },
    });

    if (signUpError) throw signUpError;
    if (!newUser.user) throw new Error('Erro ao criar usuário');

    // Create employee record
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        user_id: newUser.user.id,
        admin_id: user.id,
        full_name,
        email,
        cpf: cleanCpf,
        role: 'user',
        cargo: cargo || 'caixa',
        description: description || null,
      })
      .select('id')
      .single();

    if (employeeError) {
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw employeeError;
    }

    // Assign 'user' role
    await supabaseAdmin.from('user_roles').insert({
      user_id: newUser.user.id,
      role: 'user',
    });

    // Insert permissions
    if (permissions && Array.isArray(permissions) && employeeData) {
      const permissionRows = permissions.map((p: { key: string; allowed: boolean }) => ({
        employee_id: employeeData.id,
        permission_key: p.key,
        allowed: p.allowed,
      }));

      if (permissionRows.length > 0) {
        const { error: permError } = await supabaseAdmin
          .from('employee_permissions')
          .insert(permissionRows);

        if (permError) console.error('Error inserting permissions:', permError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, employee_id: employeeData?.id, user_id: newUser.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
