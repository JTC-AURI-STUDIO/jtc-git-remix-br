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
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Não autorizado');
    }

    // Verificar se o usuário é admin
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      throw new Error('Apenas administradores podem remover funcionários');
    }

    const { employee_id, user_id } = await req.json();

    if (!employee_id || !user_id) {
      throw new Error('ID do funcionário e usuário são obrigatórios');
    }

    // Verificar se o funcionário pertence a este admin
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('admin_id')
      .eq('id', employee_id)
      .single();

    if (employeeError || !employee) {
      throw new Error('Funcionário não encontrado');
    }

    if (employee.admin_id !== user.id) {
      throw new Error('Você não tem permissão para remover este funcionário');
    }

    // Deletar permissões do funcionário
    await supabaseAdmin
      .from('employee_permissions')
      .delete()
      .eq('employee_id', employee_id);

    // Deletar role do usuário
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', user_id);

    // Deletar funcionário
    const { error: deleteEmployeeError } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', employee_id);

    if (deleteEmployeeError) throw deleteEmployeeError;

    // Deletar usuário do Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (authError) {
      console.error('Erro ao deletar usuário do auth:', authError);
      // Não falha se não conseguir deletar do auth, pois o funcionário já foi removido
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao deletar funcionário:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
