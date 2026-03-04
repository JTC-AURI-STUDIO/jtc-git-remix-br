import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ success: false, error: "E-mail e código são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find valid OTP
    const { data: verification, error: fetchError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("email", email)
      .eq("otp_code", otp)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching OTP:", fetchError);
      throw new Error("Erro interno ao verificar código");
    }

    if (!verification) {
      // Check if there's an expired or already used code
      const { data: anyCode } = await supabase
        .from("email_verifications")
        .select("*")
        .eq("email", email)
        .eq("otp_code", otp)
        .maybeSingle();

      if (anyCode?.verified) {
        return new Response(
          JSON.stringify({ success: false, error: "Este código já foi utilizado." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (anyCode && new Date(anyCode.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: "Código expirado. Solicite um novo código." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Increment attempts on the latest unverified OTP
      const { data: latestOtp } = await supabase
        .from("email_verifications")
        .select("id, attempts")
        .eq("email", email)
        .eq("verified", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestOtp) {
        await supabase
          .from("email_verifications")
          .update({ attempts: latestOtp.attempts + 1 })
          .eq("id", latestOtp.id);

        if (latestOtp.attempts + 1 >= 5) {
          return new Response(
            JSON.stringify({ success: false, error: "Muitas tentativas incorretas. Solicite um novo código." }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: false, error: "Código incorreto. Verifique e tente novamente." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check max attempts
    if (verification.attempts >= 5) {
      return new Response(
        JSON.stringify({ success: false, error: "Muitas tentativas incorretas. Solicite um novo código." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark OTP as verified
    await supabase
      .from("email_verifications")
      .update({ verified: true })
      .eq("id", verification.id);

    // Mark profile as email_verified
    await supabase
      .from("profiles")
      .update({ email_verified: true })
      .eq("email", email);

    // Confirm user email in Supabase Auth using admin API
    if (verification.user_id && verification.user_id !== "00000000-0000-0000-0000-000000000000") {
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        verification.user_id,
        { email_confirm: true }
      );

      if (confirmError) {
        console.error("Error confirming user email:", confirmError);
        // Don't throw - the OTP was verified, profile is marked
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "E-mail verificado com sucesso!" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
