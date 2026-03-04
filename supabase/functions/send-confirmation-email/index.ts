import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendConfirmationRequest {
  email: string;
  userName: string;
  confirmationUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-confirmation-email function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userName, confirmationUrl }: SendConfirmationRequest = await req.json();
    
    console.log("Sending confirmation email to:", email);
    console.log("User name:", userName);
    console.log("Confirmation URL:", confirmationUrl);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmação de E-mail</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">JTC FluxPDV</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Sistema de Gestão de Vendas</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #333333; margin: 0 0 20px; font-size: 24px; font-weight: 600;">
                      Olá, ${userName}! 👋
                    </h2>
                    
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Estamos muito felizes em ter você conosco! Para começar a usar o JTC FluxPDV, 
                      precisamos confirmar seu endereço de e-mail.
                    </p>
                    
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                      Clique no botão abaixo para confirmar seu e-mail e acessar sua conta:
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center">
                          <a href="${confirmationUrl}" 
                             style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                            ✓ Confirmar E-mail
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 30px 0 0; text-align: center;">
                      Se você não criou uma conta no JTC FluxPDV, ignore este e-mail.
                    </p>
                    
                    <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 15px 0 0; text-align: center;">
                      Este link expira em 24 horas.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #888888; font-size: 12px; margin: 0;">
                      © 2025 JTC FluxPDV. Todos os direitos reservados.
                    </p>
                    <p style="color: #aaaaaa; font-size: 11px; margin: 10px 0 0;">
                      Se o botão não funcionar, copie e cole este link no navegador:<br>
                      <a href="${confirmationUrl}" style="color: #667eea; word-break: break-all;">${confirmationUrl}</a>
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

    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "JTC FluxPDV <onboarding@resend.dev>",
        to: [email],
        subject: "Confirme seu e-mail - JTC FluxPDV",
        html: htmlContent,
      }),
    });

    const responseData = await emailResponse.json();
    console.log("Resend API response:", responseData);

    if (!emailResponse.ok) {
      throw new Error(responseData.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
