import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CreatePaymentRequest {
  planType: '3_months' | '1_year';
}

const PLANS = {
  '3_months': { price: 29.99, days: 90, name: 'Plano 3 Meses' },
  '1_year': { price: 69.99, days: 365, name: 'Plano 1 Ano' },
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

    const { planType }: CreatePaymentRequest = await req.json();
    const plan = PLANS[planType];
    
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Plano inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN not configured');
      return new Response(JSON.stringify({ error: 'Configuração de pagamento não encontrada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Criar pagamento no Mercado Pago
    const paymentData = {
      transaction_amount: plan.price,
      description: `JTC FluxPDV - ${plan.name}`,
      payment_method_id: 'pix',
      payer: {
        email: user.email,
      },
      date_of_expiration: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    console.log('Creating Mercado Pago payment:', JSON.stringify(paymentData));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${user.id}-${planType}-${Date.now()}`,
      },
      body: JSON.stringify(paymentData),
    });

    const mpData = await mpResponse.json();
    console.log('Mercado Pago response:', JSON.stringify(mpData));

    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', mpData);
      return new Response(JSON.stringify({ 
        error: 'Erro ao criar pagamento', 
        details: mpData.message || mpData.cause?.[0]?.description 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
    const pixCopyPaste = mpData.point_of_interaction?.transaction_data?.qr_code;

    // Salvar pagamento no banco usando service role para bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: payment, error: insertError } = await supabaseAdmin
      .from('subscription_payments')
      .insert({
        user_id: user.id,
        plan_type: planType,
        amount: plan.price,
        days_to_add: plan.days,
        mercado_pago_payment_id: String(mpData.id),
        mercado_pago_qr_code: qrCode,
        mercado_pago_qr_code_base64: qrCodeBase64,
        mercado_pago_pix_copy_paste: pixCopyPaste,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving payment:', insertError);
      return new Response(JSON.stringify({ error: 'Erro ao salvar pagamento' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      paymentId: payment.id,
      mercadoPagoId: mpData.id,
      qrCode,
      qrCodeBase64,
      pixCopyPaste,
      amount: plan.price,
      planName: plan.name,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-pix-payment:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
