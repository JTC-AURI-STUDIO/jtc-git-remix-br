import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { paymentId } = await req.json();
    
    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'ID do pagamento não informado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar pagamento do usuário
    const { data: payment, error: fetchError } = await supabaseClient
      .from('subscription_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !payment) {
      return new Response(JSON.stringify({ error: 'Pagamento não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Se já está aprovado, retornar sucesso
    if (payment.status === 'approved') {
      return new Response(JSON.stringify({
        status: 'approved',
        message: 'Pagamento aprovado! Sua assinatura foi ativada.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Consultar status no Mercado Pago
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Configuração não encontrada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment.mercado_pago_payment_id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const mpPayment = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Error fetching from MP:', mpPayment);
      return new Response(JSON.stringify({ 
        status: payment.status,
        message: 'Aguardando pagamento...',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Se o pagamento foi aprovado no MP mas não no nosso banco, processar
    if (mpPayment.status === 'approved' && payment.status !== 'approved') {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Buscar dados atuais do perfil
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('trial_ends_at, subscription_ends_at')
        .eq('user_id', user.id)
        .maybeSingle();

      // Calcular nova data
      const now = new Date();
      let baseDate = now;

      if (profile?.subscription_ends_at && new Date(profile.subscription_ends_at) > now) {
        baseDate = new Date(profile.subscription_ends_at);
      } else if (profile?.trial_ends_at && new Date(profile.trial_ends_at) > now) {
        baseDate = new Date(profile.trial_ends_at);
      }

      const newEndDate = new Date(baseDate);
      newEndDate.setDate(newEndDate.getDate() + payment.days_to_add);

      // Atualizar perfil
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_plan: payment.plan_type,
          subscription_ends_at: newEndDate.toISOString(),
          trial_ends_at: null,
        })
        .eq('user_id', user.id);

      // Atualizar pagamento
      await supabaseAdmin
        .from('subscription_payments')
        .update({
          status: 'approved',
          paid_at: now.toISOString(),
        })
        .eq('id', payment.id);

      return new Response(JSON.stringify({
        status: 'approved',
        message: 'Pagamento aprovado! Sua assinatura foi ativada.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      status: mpPayment.status,
      message: mpPayment.status === 'pending' ? 'Aguardando pagamento...' : `Status: ${mpPayment.status}`,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in check-payment-status:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
