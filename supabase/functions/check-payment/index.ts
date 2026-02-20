import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("Token do Mercado Pago não configurado");
    }

    const { payment_id } = await req.json();
    if (!payment_id) {
      throw new Error("payment_id é obrigatório");
    }

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("Mercado Pago error:", errorBody);
      throw new Error(`Erro ao verificar pagamento: ${res.status}`);
    }

    const payment = await res.json();

    return new Response(
      JSON.stringify({
        success: true,
        status: payment.status,
        status_detail: payment.status_detail,
        paid: payment.status === "approved",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
