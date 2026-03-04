import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import logo from "@/assets/logo.jpg";

type ConfirmationStatus = "loading" | "success" | "error";

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<ConfirmationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const confirmEmail = async () => {
      // Supabase adiciona os parâmetros na URL após o redirect
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");
      const type = searchParams.get("type");
      const tokenHash = searchParams.get("token_hash");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Se houver erro na URL
      if (error) {
        setStatus("error");
        setErrorMessage(errorDescription || "Erro ao confirmar e-mail");
        return;
      }

      // Se tiver tokens, significa que a confirmação foi bem-sucedida
      if (accessToken && refreshToken) {
        try {
          // Definir a sessão com os tokens recebidos
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            throw sessionError;
          }

          setStatus("success");
        } catch (err: any) {
          setStatus("error");
          setErrorMessage(err?.message || "Erro ao confirmar e-mail");
        }
        return;
      }

      // Se tiver token_hash (formato antigo)
      if (tokenHash && type) {
        try {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });

          if (verifyError) {
            throw verifyError;
          }

          setStatus("success");
        } catch (err: any) {
          setStatus("error");
          setErrorMessage(err?.message || "Erro ao confirmar e-mail");
        }
        return;
      }

      // Se não tiver nenhum parâmetro esperado, verificar se já está logado
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        setStatus("success");
      } else {
        // Aguardar um pouco para ver se o Supabase processa
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (retrySession?.user?.email_confirmed_at) {
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMessage("Link de confirmação inválido ou expirado");
        }
      }
    };

    confirmEmail();
  }, [searchParams]);

  // Countdown e redirect após sucesso
  useEffect(() => {
    if (status === "success" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }

    if (status === "success" && countdown === 0) {
      navigate("/dashboard");
    }
  }, [status, countdown, navigate]);

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  const handleGoToLogin = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardContent className="pt-8 pb-8 px-6">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="JTC FluxPDV" className="w-20 h-20 rounded-xl" />
          </div>

          {status === "loading" && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <h2 className="text-xl font-semibold">Confirmando seu e-mail...</h2>
              <p className="text-muted-foreground">Aguarde um momento</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-accent">E-mail confirmado com sucesso!</h2>
              <p className="text-muted-foreground">
                Sua conta está ativa. Você será redirecionado em {countdown} segundos...
              </p>
              <Button onClick={handleGoToDashboard} className="w-full h-12 mt-4">
                Ir para o Dashboard agora
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold text-destructive">Erro na confirmação</h2>
              <p className="text-muted-foreground">{errorMessage}</p>
              <div className="space-y-2 mt-4">
                <Button onClick={handleGoToLogin} variant="outline" className="w-full h-12">
                  Voltar para o Login
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmail;
