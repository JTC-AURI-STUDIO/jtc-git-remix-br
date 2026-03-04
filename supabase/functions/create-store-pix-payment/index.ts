import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateStorePaymentRequest {
  amount: number;
  saleId: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
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
      console.error('User auth error:', userError);
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { amount, saleId, description }: CreateStorePaymentRequest = await req.json();
    
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Valor inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Creating store PIX payment for user:', user.id, 'amount:', amount, 'saleId:', saleId);

    // Buscar configurações da loja e token do Mercado Pago
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se o usuário tem PIX automático configurado
    const { data: storeSettings, error: settingsError } = await supabaseAdmin
      .from('store_settings')
      .select('pix_mode, store_name')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !storeSettings) {
      console.error('Store settings error:', settingsError);
      return new Response(JSON.stringify({ error: 'Configurações da loja não encontradas' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (storeSettings.pix_mode !== 'automatic') {
      return new Response(JSON.stringify({ error: 'PIX automático não está configurado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar token do Mercado Pago
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('store_integrations')
      .select('encrypted_token')
      .eq('user_id', user.id)
      .eq('integration_type', 'mercado_pago')
      .single();

    if (integrationError || !integration?.encrypted_token) {
      console.error('Integration error:', integrationError);
      return new Response(JSON.stringify({ error: 'Token do Mercado Pago não configurado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = integration.encrypted_token;

    console.log('Creating PIX payment with token only (no payer CPF needed)');

    // Criar pagamento no Mercado Pago - apenas dados mínimos
    const paymentData = {
      transaction_amount: Number(amount),
      description: description || `Venda - ${storeSettings.store_name || 'Loja'}`,
      payment_method_id: 'pix',
      payer: {
        email: user.email || 'cliente@loja.com'
      },
      // Expiração de 15 minutos
      date_of_expiration: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    console.log('Creating Mercado Pago payment:', JSON.stringify(paymentData));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${user.id}-${saleId}-${Date.now()}`,
      },
      body: JSON.stringify(paymentData),
    });

    const mpData = await mpResponse.json();
    console.log('Mercado Pago response status:', mpResponse.status);

    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', JSON.stringify(mpData));
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

    console.log('Payment created successfully, MP ID:', mpData.id);

    return new Response(JSON.stringify({
      success: true,
      paymentId: String(mpData.id),
      qrCode,
      qrCodeBase64,
      pixCopyPaste,
      amount: amount,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-store-pix-payment:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
