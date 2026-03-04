import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
    )

    // Create the test user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'jtc.tst.flux.pdv@gmail.com',
      password: 'TST.ABC.JTC',
      email_confirm: true,
      user_metadata: {
        full_name: 'Testador Google Play',
        cpf: '00000000000',
        phone: '00000000000',
        cep: '00000000',
        street: 'Teste',
        number: '0',
        neighborhood: 'Teste',
        city: 'Teste',
        state: 'TS',
        is_test_account: true
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User created:', authData.user?.id)

    // Update profile to have permanent subscription (100 years)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_ends_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_plan: 'ativo',
        trial_ends_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', authData.user?.id)

    if (profileError) {
      console.error('Profile error:', profileError)
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário de teste criado com sucesso!',
        email: 'jtc.tst.flux.pdv@gmail.com'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
