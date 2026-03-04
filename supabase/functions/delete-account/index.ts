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

    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the user from the auth header
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      console.error('User auth error:', userError)
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId } = await req.json()

    // Verify the user is deleting their own account
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Você só pode excluir sua própria conta' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Deleting account for user:', userId)

    // Step 1: Get the user's CPF before deleting
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('cpf')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar perfil' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userCpf = profile.cpf

    // Step 2: Block the CPF
    if (userCpf) {
      const { error: blockError } = await supabaseAdmin
        .from('blocked_cpfs')
        .insert({
          cpf: userCpf,
          original_user_id: userId,
          reason: 'account_deleted',
          notes: `Conta excluída pelo próprio usuário em ${new Date().toISOString()}`
        })

      if (blockError && !blockError.message.includes('duplicate key')) {
        console.error('Error blocking CPF:', blockError)
        // Continue anyway - we don't want to prevent deletion if blocking fails
      }
    }

    // Step 3: Delete all user data from tables (cascade should handle most)
    // Note: Most tables have foreign key references that will cascade delete
    
    // Delete products (and cascade to sale_items, purchase_items)
    await supabaseAdmin.from('products').delete().eq('user_id', userId)
    
    // Delete customers (and cascade to customer_transactions)
    await supabaseAdmin.from('customers').delete().eq('user_id', userId)
    
    // Delete sales and sale_items
    await supabaseAdmin.from('sales').delete().eq('user_id', userId)
    
    // Delete purchases and purchase_items  
    await supabaseAdmin.from('purchases').delete().eq('user_id', userId)
    
    // Delete suppliers
    await supabaseAdmin.from('suppliers').delete().eq('user_id', userId)
    
    // Delete categories
    await supabaseAdmin.from('categories').delete().eq('user_id', userId)
    
    // Delete store settings
    await supabaseAdmin.from('store_settings').delete().eq('user_id', userId)
    
    // Delete store integrations
    await supabaseAdmin.from('store_integrations').delete().eq('user_id', userId)
    
    // Delete auri conversations and messages
    await supabaseAdmin.from('auri_conversations').delete().eq('user_id', userId)
    
    // Delete email logs
    await supabaseAdmin.from('email_logs').delete().eq('user_id', userId)
    
    // Delete subscription payments
    await supabaseAdmin.from('subscription_payments').delete().eq('user_id', userId)
    
    // Delete weekly redemption codes
    await supabaseAdmin.from('weekly_redemption_codes').delete().eq('user_id', userId)
    
    // Delete user roles
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
    
    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('user_id', userId)

    // Step 4: Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao excluir usuário da autenticação' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Account deleted successfully for user:', userId)

    return new Response(
      JSON.stringify({ success: true, message: 'Conta excluída com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
