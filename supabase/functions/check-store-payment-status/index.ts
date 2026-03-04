import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckPaymentRequest {
  paymentId: string;
}

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

    const { paymentId }: CheckPaymentRequest = await req.json();
    
    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'ID do pagamento não fornecido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Checking payment status for:', paymentId);

    // Buscar token do Mercado Pago
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    // Consultar status no Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const mpData = await mpResponse.json();
    console.log('MP payment status:', mpData.status);
    console.log('MP status_detail:', mpData.status_detail);
    console.log('MP full response:', JSON.stringify(mpData));

    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', mpData);
      return new Response(JSON.stringify({ 
        error: 'Erro ao consultar pagamento',
        status: 'unknown' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mapear status do Mercado Pago
    let status = 'pending';
    if (mpData.status === 'approved') {
      status = 'approved';
    } else if (mpData.status === 'rejected' || mpData.status === 'cancelled') {
      status = 'rejected';
    } else if (mpData.status === 'pending' || mpData.status === 'in_process') {
      status = 'pending';
    }

    return new Response(JSON.stringify({
      status,
      mpStatus: mpData.status,
      mpStatusDetail: mpData.status_detail,
      amountPaid: mpData.transaction_amount,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in check-store-payment-status:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor', status: 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
