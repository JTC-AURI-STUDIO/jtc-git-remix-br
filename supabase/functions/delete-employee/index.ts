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

    if (!userRole) throw new Error('Apenas administradores podem remover funcionários');

    const { employee_id } = await req.json();
    if (!employee_id) throw new Error('ID do funcionário é obrigatório');

    // Verify employee belongs to this admin
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('admin_id, user_id')
      .eq('id', employee_id)
      .single();

    if (employeeError || !employee) throw new Error('Funcionário não encontrado');
    if (employee.admin_id !== user.id) throw new Error('Sem permissão');

    const employeeUserId = employee.user_id;

    // Delete permissions
    await supabaseAdmin.from('employee_permissions').delete().eq('employee_id', employee_id);

    // Delete user role
    await supabaseAdmin.from('user_roles').delete().eq('user_id', employeeUserId);

    // Delete profile (created by trigger)
    await supabaseAdmin.from('profiles').delete().eq('user_id', employeeUserId);

    // Delete employee record
    await supabaseAdmin.from('employees').delete().eq('id', employee_id);

    // Delete auth user
    await supabaseAdmin.auth.admin.deleteUser(employeeUserId).catch(console.error);

    return new Response(
      JSON.stringify({ success: true }),
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
