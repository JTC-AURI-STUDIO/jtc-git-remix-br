import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function generateOTP(): string {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userName } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "E-mail é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Invalidate previous OTPs for this email
    await supabase
      .from("email_verifications")
      .update({ verified: true })
      .eq("email", email)
      .eq("verified", false);

    // Generate new OTP
    const otpCode = generateOTP();

    // Find user_id by email in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    const userId = profile?.user_id || "00000000-0000-0000-0000-000000000000";

    // Store OTP
    const { error: insertError } = await supabase
      .from("email_verifications")
      .insert({
        user_id: userId,
        email,
        otp_code: otpCode,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      throw new Error("Erro ao gerar código de verificação");
    }

    // Send email via Resend
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 500px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #4C6FFF 0%, #00E0A4 100%); border-radius: 16px 16px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700;">JTC FluxPDV</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Verificação de E-mail</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1a1a2e; margin: 0 0 16px; font-size: 20px; font-weight: 600;">
                      Olá, ${userName || "usuário"}! 👋
                    </h2>
                    <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                      Use o código abaixo para confirmar seu e-mail e ativar sua conta:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <div style="display: inline-block; background: linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 100%); border: 2px solid #4C6FFF; border-radius: 12px; padding: 20px 40px;">
                        <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #4C6FFF; font-family: 'Courier New', monospace;">
                          ${otpCode}
                        </span>
                      </div>
                    </div>
                    <p style="color: #888; font-size: 13px; text-align: center; margin: 24px 0 0;">
                      Este código expira em <strong>15 minutos</strong>.
                    </p>
                    <p style="color: #aaa; font-size: 12px; text-align: center; margin: 16px 0 0;">
                      Se você não criou uma conta no JTC FluxPDV, ignore este e-mail.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 40px; background-color: #f8f9fa; border-radius: 0 0 16px 16px; text-align: center;">
                    <p style="color: #aaa; font-size: 11px; margin: 0;">
                      © 2025 JTC FluxPDV. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "JTC FluxPDV <onboarding@resend.dev>",
        to: [email],
        subject: `${otpCode} - Código de verificação JTC FluxPDV`,
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();
    console.log("Resend response:", emailData);

    if (!emailResponse.ok) {
      throw new Error(emailData.message || "Erro ao enviar e-mail");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado com sucesso" }),
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
