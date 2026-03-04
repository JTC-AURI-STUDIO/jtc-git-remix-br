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
    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body));

    // Mercado Pago envia notificações de diferentes tipos
    if (body.type !== 'payment' && body.action !== 'payment.updated' && body.action !== 'payment.created') {
      console.log('Ignoring non-payment notification:', body.type, body.action);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.log('No payment ID in webhook');
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar detalhes do pagamento no Mercado Pago
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN not configured');
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const mpPayment = await mpResponse.json();
    console.log('Mercado Pago payment details:', JSON.stringify(mpPayment));

    if (!mpResponse.ok) {
      console.error('Error fetching payment from MP:', mpPayment);
      return new Response(JSON.stringify({ error: 'Error fetching payment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se o pagamento foi aprovado
    if (mpPayment.status !== 'approved') {
      console.log('Payment not approved, status:', mpPayment.status);
      
      // Atualizar status no banco se necessário
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseAdmin
        .from('subscription_payments')
        .update({ status: mpPayment.status })
        .eq('mercado_pago_payment_id', String(paymentId));

      return new Response(JSON.stringify({ received: true, status: mpPayment.status }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pagamento aprovado! Atualizar assinatura do usuário
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar o pagamento no nosso banco
    const { data: ourPayment, error: fetchError } = await supabaseAdmin
      .from('subscription_payments')
      .select('*')
      .eq('mercado_pago_payment_id', String(paymentId))
      .single();

    if (fetchError || !ourPayment) {
      console.error('Payment not found in our database:', paymentId, fetchError);
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se já foi processado
    if (ourPayment.status === 'approved') {
      console.log('Payment already processed:', paymentId);
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar dados atuais do perfil do usuário
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('trial_ends_at, subscription_ends_at, subscription_plan')
      .eq('id', ourPayment.user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calcular nova data de expiração (somar ao tempo existente se ainda válido)
    const now = new Date();
    let baseDate = now;

    // Se já tem assinatura ativa, somar ao tempo restante
    if (profile.subscription_ends_at && new Date(profile.subscription_ends_at) > now) {
      baseDate = new Date(profile.subscription_ends_at);
    } else if (profile.trial_ends_at && new Date(profile.trial_ends_at) > now) {
      baseDate = new Date(profile.trial_ends_at);
    }

    const newEndDate = new Date(baseDate);
    newEndDate.setDate(newEndDate.getDate() + ourPayment.days_to_add);

    console.log('Activating subscription:', {
      userId: ourPayment.user_id,
      planType: ourPayment.plan_type,
      daysToAdd: ourPayment.days_to_add,
      baseDate: baseDate.toISOString(),
      newEndDate: newEndDate.toISOString(),
    });

    // Atualizar perfil do usuário
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_plan: ourPayment.plan_type,
        subscription_ends_at: newEndDate.toISOString(),
        trial_ends_at: null,
      })
      .eq('id', ourPayment.user_id);

    if (updateProfileError) {
      console.error('Error updating profile:', updateProfileError);
      return new Response(JSON.stringify({ error: 'Error updating subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Atualizar status do pagamento
    const { error: updatePaymentError } = await supabaseAdmin
      .from('subscription_payments')
      .update({
        status: 'approved',
        paid_at: now.toISOString(),
      })
      .eq('id', ourPayment.id);

    if (updatePaymentError) {
      console.error('Error updating payment status:', updatePaymentError);
    }

    console.log('Subscription activated successfully for user:', ourPayment.user_id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Subscription activated',
      newEndDate: newEndDate.toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
