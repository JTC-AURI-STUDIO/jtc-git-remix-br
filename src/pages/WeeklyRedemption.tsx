import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSION_KEYS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Lock, Clock, CheckCircle2, AlertCircle, PartyPopper } from "lucide-react";
import PageLoader from "@/components/PageLoader";
import confetti from "canvas-confetti";
import giftBoxImage from "@/assets/gift-box.jpg";

interface RedemptionResult {
  success: boolean;
  error?: string;
  benefit_type?: string;
  days_added?: number;
}

const WeeklyRedemption = () => {
  const { toast } = useToast();
  const { isAdmin, hasPermission, loading: permissionsLoading } = usePermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [isEventActive, setIsEventActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [nextEventTime, setNextEventTime] = useState<string>("");
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionResult, setRedemptionResult] = useState<RedemptionResult | null>(null);
  const [alreadyRedeemed, setAlreadyRedeemed] = useState(false);

  const canAccessRedemption = isAdmin || hasPermission(PERMISSION_KEYS.access_redemption);

  // Verifica se já resgatou nesta semana
  const checkAlreadyRedeemed = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Calcula início da semana (segunda-feira)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - diff);
      weekStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("weekly_redemption_codes")
        .select("is_used")
        .eq("user_id", user.id)
        .gte("week_start", weekStart.toISOString().split("T")[0])
        .maybeSingle();

      if (error) {
        console.error("Erro ao verificar resgate:", error);
        return false;
      }

      return data?.is_used || false;
    } catch (error) {
      console.error("Erro ao verificar resgate:", error);
      return false;
    }
  }, []);

  // Gera código para a semana atual
  const generateWeeklyCode = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc("create_weekly_code_for_user", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Erro ao gerar código:", error);
        return;
      }

      setGeneratedCode(data as string);
    } catch (error) {
      console.error("Erro ao gerar código:", error);
    }
  }, []);

  // Verifica horário do evento (segunda 16:00-17:00 horário de Brasília)
  const checkEventStatus = useCallback(() => {
    const now = new Date();
    
    // Ajusta para o horário de Brasília (UTC-3)
    const brazilOffset = -3 * 60;
    const localOffset = now.getTimezoneOffset();
    const diffMinutes = brazilOffset - (-localOffset);
    
    const brazilTime = new Date(now.getTime() + diffMinutes * 60 * 1000);
    
    const dayOfWeek = brazilTime.getDay();
    const hours = brazilTime.getHours();
    const minutes = brazilTime.getMinutes();
    const seconds = brazilTime.getSeconds();
    
    // Segunda-feira = 1, horário 16:00-17:00
    const isMonday = dayOfWeek === 1;
    const isInTimeWindow = hours === 16;
    
    if (isMonday && isInTimeWindow) {
      // Calcula tempo restante até 17:00
      const remainingMinutes = 59 - minutes;
      const remainingSeconds = 59 - seconds;
      setTimeRemaining(`${String(remainingMinutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`);
      return true;
    }
    
    // Calcula próxima segunda às 16:00
    const nextMonday = new Date(brazilTime);
    let daysUntilMonday;
    
    if (dayOfWeek === 0) {
      daysUntilMonday = 1;
    } else if (dayOfWeek === 1) {
      if (hours < 16) {
        daysUntilMonday = 0;
      } else {
        daysUntilMonday = 7;
      }
    } else {
      daysUntilMonday = 8 - dayOfWeek;
    }
    
    nextMonday.setDate(brazilTime.getDate() + daysUntilMonday);
    nextMonday.setHours(16, 0, 0, 0);
    
    const nextEventDate = nextMonday.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    });
    
    setNextEventTime(`${nextEventDate} às 16:00`);
    return false;
  }, []);

  useEffect(() => {
    const init = async () => {
      if (permissionsLoading) return;

      if (canAccessRedemption) {
        const redeemed = await checkAlreadyRedeemed();
        setAlreadyRedeemed(redeemed);

        const eventActive = checkEventStatus();
        setIsEventActive(eventActive);

        // Se evento ativo e não resgatou, gera o código
        if (eventActive && !redeemed) {
          await generateWeeklyCode();
        }
      }

      setIsLoading(false);
    };

    init();

    // Atualiza status a cada segundo
    const interval = setInterval(() => {
      const eventActive = checkEventStatus();
      setIsEventActive(eventActive);
    }, 1000);

    return () => clearInterval(interval);
  }, [permissionsLoading, canAccessRedemption, checkAlreadyRedeemed, checkEventStatus, generateWeeklyCode]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
  };

  const handleRedeem = async () => {
    if (code.length !== 6) {
      toast({
        title: "Código inválido",
        description: "O código deve ter exatamente 6 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setIsRedeeming(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("redeem_weekly_code", {
        p_user_id: user.id,
        p_code: code,
      });

      if (error) throw error;

      const result = data as unknown as RedemptionResult;
      setRedemptionResult(result);

      if (result.success) {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 },
          colors: ["#4C6FFF", "#00E0A4", "#FFD700"],
        });

        toast({
          title: "🎉 Parabéns!",
          description: `Você ganhou ${result.benefit_type} de assinatura!`,
        });

        setAlreadyRedeemed(true);
      } else {
        toast({
          title: "Erro no resgate",
          description: result.error || "Código inválido ou já utilizado.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erro ao resgatar:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível resgatar o código.",
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    // Sem permissão de acesso ao módulo
    if (!canAccessRedemption) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-8">
              <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Acesso Restrito</h2>
              <p className="text-muted-foreground">
                Você não tem permissão para acessar esta área.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Resgate bem-sucedido
    if (redemptionResult?.success) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 p-6">
              <PartyPopper className="w-20 h-20 text-primary mx-auto animate-bounce" />
            </div>
            <CardContent className="pt-6 pb-8 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                🎉 Parabéns!
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                Você resgatou com sucesso:
              </p>
              <div className="bg-gradient-to-r from-primary to-accent text-white rounded-xl py-4 px-6 mb-4">
                <p className="text-3xl font-bold">{redemptionResult.benefit_type}</p>
                <p className="text-sm opacity-90">+{redemptionResult.days_added} dias de assinatura</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Seu plano foi atualizado automaticamente!
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Já resgatou nesta semana
    if (alreadyRedeemed) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-8">
              <CheckCircle2 className="w-16 h-16 text-accent mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Já Resgatado!</h2>
              <p className="text-muted-foreground mb-4">
                Você já resgatou seu benefício desta semana.
              </p>
              <p className="text-sm text-muted-foreground">
                Próximo resgate disponível: <br />
                <span className="font-semibold text-primary">Segunda-feira às 16:00</span>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Evento não está ativo
    if (!isEventActive) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-br from-muted to-muted/50 p-8">
              <img 
                src={giftBoxImage} 
                alt="Caixa de presente" 
                className="w-32 h-32 mx-auto object-contain opacity-50 grayscale"
              />
            </div>
            <CardContent className="pt-6 pb-8 text-center">
              <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">
                Evento Indisponível
              </h2>
              <p className="text-muted-foreground mb-4">
                O resgate semanal só está disponível durante o horário do evento.
              </p>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Próximo resgate:</p>
                <p className="text-lg font-bold text-primary capitalize">
                  {nextEventTime}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Evento ativo - mostrar interface de resgate
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 p-6 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,111,255,0.1),transparent_70%)]" />
            <img 
              src={giftBoxImage} 
              alt="Caixa de presente" 
              className="w-36 h-36 mx-auto object-contain relative z-10 drop-shadow-2xl animate-pulse"
            />
          </div>
          
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gift className="w-6 h-6 text-primary" />
              <CardTitle className="text-2xl">Flux Resgate Semanal</CardTitle>
            </div>
            <CardDescription>
              Use seu código exclusivo para resgatar seu benefício!
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Timer */}
            <div className="bg-gradient-to-r from-destructive/10 to-orange-500/10 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-destructive animate-pulse" />
                <span className="text-sm font-medium text-muted-foreground">Tempo restante</span>
              </div>
              <p className="text-4xl font-mono font-bold text-destructive tracking-wider">
                {timeRemaining}
              </p>
            </div>

            {/* Código gerado */}
            {generatedCode && (
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Seu código desta semana:</p>
                <p className="text-3xl font-mono font-bold text-primary tracking-[0.3em]">
                  {generatedCode}
                </p>
              </div>
            )}

            {/* Input de código */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Código de Resgate
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={code}
                onChange={handleCodeChange}
                maxLength={6}
                className="text-center text-3xl font-mono tracking-[0.5em] h-16"
                disabled={isRedeeming}
              />
              <p className="text-xs text-muted-foreground text-center">
                Digite os 6 dígitos do seu código exclusivo
              </p>
            </div>

            {/* Botão de resgatar */}
            <Button
              onClick={handleRedeem}
              disabled={code.length !== 6 || isRedeeming}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300"
            >
              {isRedeeming ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Resgatando...
                </div>
              ) : (
                <>
                  <Gift className="w-5 h-5 mr-2" />
                  RESGATAR
                </>
              )}
            </Button>

            {/* Aviso */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Seu código é único e só pode ser utilizado uma vez. Se o tempo acabar sem resgatar, 
                o benefício será perdido.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <PageLoader pageName="Flux Resgate Semanal">
      {renderContent()}
    </PageLoader>
  );
};

export default WeeklyRedemption;
