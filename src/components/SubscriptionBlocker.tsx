import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard, LogOut, Gift, Copy, Check, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionBlockerProps {
  isTrial?: boolean;
  isEmployee?: boolean;
}

export const SubscriptionBlocker = ({ isTrial = false, isEmployee = false }: SubscriptionBlockerProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);

  useEffect(() => {
    fetchInviteCode();
  }, []);

  const fetchInviteCode = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("invite_code")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data?.invite_code) {
      setInviteCode(data.invite_code);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleSubscribe = () => {
    navigate("/assinatura");
  };

  const handleCopyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Compartilhe com seus amigos",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/auth?ref=${inviteCode}`;
    if (navigator.share) {
      navigator.share({
        title: "JTC FluxPDV - Convite",
        text: `Use meu código de convite ${inviteCode} e ganhe 1 mês + 3 dias grátis!`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copiado!",
        description: "Compartilhe o link com seus amigos",
      });
    }
  };

  // Versão simplificada para funcionários bloqueados
  if (isEmployee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-destructive/50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Acesso Bloqueado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              A assinatura da loja está vencida ou inativa.
            </p>
            <p className="text-center text-foreground font-medium">
              Entre em contato com o seu administrador para atualizar o plano da loja.
            </p>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full gap-2 h-12"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela do código de convite
  if (showInviteCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Card className="max-w-lg w-full shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
              <Gift className="w-10 h-10 text-accent" />
            </div>
            <CardTitle className="text-2xl font-bold">Meu Código de Convite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">
                Compartilhe seu código e ganhe <strong className="text-accent">1 mês grátis</strong> quando alguém se cadastrar usando ele!
              </p>
              
              <div className="bg-muted rounded-xl p-6 space-y-4">
                <div className="text-4xl font-mono font-bold tracking-widest text-primary">
                  {inviteCode || "..."}
                </div>
                
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={handleCopyCode}
                    variant="outline"
                    className="gap-2"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copiado!" : "Copiar Código"}
                  </Button>
                  
                  <Button
                    onClick={handleShare}
                    className="gap-2 bg-accent hover:bg-accent/90"
                  >
                    <Share2 className="h-4 w-4" />
                    Compartilhar
                  </Button>
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-4 text-sm text-left space-y-2">
                <h4 className="font-semibold text-foreground">Como funciona:</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Você ganha <strong>1 mês grátis</strong> para cada amigo que usar seu código</li>
                  <li>• Seu amigo ganha <strong>1 mês + 3 dias grátis</strong> ao se cadastrar</li>
                  <li>• Sem limite de convites!</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={() => setShowInviteCode(false)}
                variant="outline"
                className="w-full h-12"
              >
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Versão completa para admins
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-destructive/5 via-background to-muted">
      <Card className="max-w-lg w-full shadow-2xl border-2 border-destructive/50">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isTrial ? "Período de Teste Expirado" : "Assinatura Vencida"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-lg text-muted-foreground">
              Você não pode utilizar estas funções pois {isTrial ? "seu período de teste" : "seu plano"} já venceu.
            </p>
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-foreground">Funcionalidades bloqueadas:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li>• Realizar vendas no PDV</li>
                <li>• Adicionar novos produtos</li>
                <li>• Cadastrar clientes</li>
                <li>• Editar informações</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              onClick={handleSubscribe}
              className="w-full h-14 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              size="lg"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Assinar Agora
            </Button>

            <Button
              onClick={() => setShowInviteCode(true)}
              variant="outline"
              className="w-full h-12 gap-2 border-accent text-accent hover:bg-accent/10"
              size="lg"
            >
              <Gift className="h-5 w-5" />
              Meu Código de Convite
            </Button>
            
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full h-12 text-muted-foreground hover:text-foreground"
              size="lg"
            >
              <LogOut className="mr-2 h-5 w-5" />
              Sair da Conta
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">
            Convide amigos e ganhe 1 mês grátis para cada cadastro!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionBlocker;
