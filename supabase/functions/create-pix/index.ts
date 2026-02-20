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

    const body = await req.json();
    const description = body.description || "JTC GITREMIX - 1 Crédito";

    // Create PIX payment via Mercado Pago API
    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: 0.30,
        description,
        payment_method_id: "pix",
        payer: {
          email: body.email || "cliente@jtcgitremix.com",
          first_name: "Cliente",
          last_name: "JTC",
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("Mercado Pago error:", errorBody);
      throw new Error(`Erro ao criar pagamento: ${res.status}`);
    }

    const payment = await res.json();

    const pixData = payment.point_of_interaction?.transaction_data;

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        status: payment.status,
        qr_code: pixData?.qr_code || null,
        qr_code_base64: pixData?.qr_code_base64 || null,
        ticket_url: pixData?.ticket_url || null,
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
