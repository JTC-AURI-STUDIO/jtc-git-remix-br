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
      throw new Error('Apenas administradores podem criar funcionários');
    }

    const { email, password, full_name, cpf, phone, role, admin_id } = await req.json();

    // Criar usuário no Auth - marcando como funcionário para não receber admin role
    const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        cpf,
        phone,
        is_employee: true, // Flag para impedir que receba role admin no trigger
      },
    });

    if (signUpError) throw signUpError;
    if (!newUser.user) throw new Error('Erro ao criar usuário');

    // Criar registro do funcionário
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        user_id: newUser.user.id,
        admin_id,
        full_name,
        email,
        phone,
        cpf,
        role,
      });

    if (employeeError) throw employeeError;

    // Atribuir role ao funcionário
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role,
      });

    if (roleError) throw roleError;

    // Buscar ID do funcionário criado
    const { data: employeeData } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('user_id', newUser.user.id)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        employee_id: employeeData?.id,
        user_id: newUser.user.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});