import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ArrowLeft, Trash2, XCircle, Phone, Mail, CheckCircle, Database, Clock, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DeleteAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState({
    loseData: false,
    cpfBlocked: false,
    noRefund: false,
  });

  const canProceed = 
    confirmText === "EXCLUIR MINHA CONTA" && 
    acceptedTerms.loseData && 
    acceptedTerms.cpfBlocked && 
    acceptedTerms.noRefund;

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para excluir sua conta",
          variant: "destructive",
        });
        return;
      }

      // Call the edge function to delete the account
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { userId: user.id }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao excluir conta");
      }

      // Sign out the user
      await supabase.auth.signOut();

      toast({
        title: "Conta excluída",
        description: "Sua conta foi excluída com sucesso. Sentiremos sua falta!",
      });

      navigate("/auth");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Erro ao excluir conta",
        description: error.message || "Ocorreu um erro ao tentar excluir sua conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 animate-fade-in">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/configuracoes")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-6 w-6" />
              Excluir Minha Conta
            </h1>
            <p className="text-muted-foreground">JTC FluxPDV - Exclusão de Conta</p>
          </div>
        </div>

        {/* App Info Card - Google Play Requirement */}
        <Card className="border-muted bg-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Sobre Esta Página
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Esta página permite que você, usuário do <strong>JTC FluxPDV</strong>, desenvolvido por <strong>Jardiel De Sousa Lopes</strong>, 
              solicite a exclusão permanente da sua conta e dados associados.
            </p>
          </CardContent>
        </Card>

        {/* Steps Card - Google Play Requirement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Como Solicitar a Exclusão da Conta
            </CardTitle>
            <CardDescription>
              Siga os passos abaixo para excluir sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li className="pl-2">
                <strong>Leia atentamente</strong> as informações sobre o que acontece quando você exclui sua conta (seção abaixo).
              </li>
              <li className="pl-2">
                <strong>Marque as 3 caixas de confirmação</strong> indicando que você entende as consequências.
              </li>
              <li className="pl-2">
                <strong>Digite "EXCLUIR MINHA CONTA"</strong> no campo de confirmação.
              </li>
              <li className="pl-2">
                <strong>Clique no botão "Excluir Minha Conta"</strong> e confirme na janela de diálogo.
              </li>
              <li className="pl-2">
                Sua conta será excluída <strong>imediatamente</strong> e você será desconectado do sistema.
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Data Handling Card - Google Play Requirement */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <Clock className="h-5 w-5" />
              Dados Excluídos e Mantidos
            </CardTitle>
            <CardDescription>
              Informações sobre o tratamento dos seus dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-foreground mb-2">Dados que serão EXCLUÍDOS imediatamente:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Todos os produtos cadastrados</li>
                <li>Histórico completo de vendas e itens de venda</li>
                <li>Cadastro de clientes e transações</li>
                <li>Fornecedores e compras</li>
                <li>Categorias personalizadas</li>
                <li>Configurações da loja (logo, cores, PIX)</li>
                <li>Funcionários e permissões</li>
                <li>Conversas com a assistente Auri</li>
                <li>Códigos de resgate semanais</li>
                <li>Logs de e-mails enviados</li>
                <li>Dados do perfil (nome, endereço, telefone)</li>
              </ul>
            </div>
            
            <div>
              <p className="font-semibold text-foreground mb-2">Dados que serão MANTIDOS:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li><strong>CPF bloqueado:</strong> Seu CPF será adicionado à lista de bloqueio para evitar criação de novas contas. Este dado é mantido por tempo indeterminado para segurança do sistema.</li>
                <li><strong>Registros de pagamento:</strong> Por exigências fiscais e legais, mantemos registros de pagamentos de assinatura por 5 anos.</li>
              </ul>
            </div>

            <div className="mt-4 p-3 bg-background rounded-lg border">
              <p className="text-xs text-muted-foreground">
                <strong>Nota:</strong> A exclusão é processada imediatamente. Não há período de carência ou possibilidade de cancelamento após a confirmação.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Warning Card */}
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Atenção: Consequências da Exclusão
            </CardTitle>
            <CardDescription>
              Antes de excluir sua conta, entenda o que vai acontecer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/80 border">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Todos os seus dados serão perdidos</p>
                  <p className="text-sm text-muted-foreground">
                    Produtos, clientes, vendas, relatórios, configurações da loja - tudo será excluído permanentemente.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/80 border">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Seu CPF será bloqueado</p>
                  <p className="text-sm text-muted-foreground">
                    O CPF utilizado nesta conta não poderá ser usado para criar uma nova conta no sistema.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/80 border">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Sem reembolso</p>
                  <p className="text-sm text-muted-foreground">
                    Se você tiver tempo de assinatura restante, ele será perdido. Não há reembolso após a exclusão.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reactivation Info */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <CheckCircle className="h-5 w-5" />
              Quer reativar no futuro?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Se um dia você quiser voltar a usar o sistema com o mesmo CPF, será necessário entrar em contato com nosso suporte para solicitar a reativação. 
              O desbloqueio do CPF está sujeito à análise.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-primary" />
                <span>(98) 98109-1476</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span>jtc.flux.pdv@gmail.com</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Confirmar Exclusão</CardTitle>
            <CardDescription>
              Para prosseguir, você precisa confirmar que entendeu as consequências
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="loseData"
                  checked={acceptedTerms.loseData}
                  onCheckedChange={(checked) => 
                    setAcceptedTerms(prev => ({ ...prev, loseData: checked === true }))
                  }
                />
                <label htmlFor="loseData" className="text-sm cursor-pointer">
                  Entendo que <strong>todos os meus dados serão excluídos permanentemente</strong> e não poderão ser recuperados.
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="cpfBlocked"
                  checked={acceptedTerms.cpfBlocked}
                  onCheckedChange={(checked) => 
                    setAcceptedTerms(prev => ({ ...prev, cpfBlocked: checked === true }))
                  }
                />
                <label htmlFor="cpfBlocked" className="text-sm cursor-pointer">
                  Entendo que <strong>meu CPF será bloqueado</strong> e não poderei criar uma nova conta sem contatar o suporte.
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="noRefund"
                  checked={acceptedTerms.noRefund}
                  onCheckedChange={(checked) => 
                    setAcceptedTerms(prev => ({ ...prev, noRefund: checked === true }))
                  }
                />
                <label htmlFor="noRefund" className="text-sm cursor-pointer">
                  Entendo que <strong>não há reembolso</strong> do tempo de assinatura restante.
                </label>
              </div>
            </div>

            {/* Confirmation Text Input */}
            <div className="space-y-2">
              <Label htmlFor="confirmText">
                Digite <span className="font-mono font-bold text-destructive">EXCLUIR MINHA CONTA</span> para confirmar:
              </Label>
              <Input
                id="confirmText"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Digite aqui..."
                className="font-mono"
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate("/configuracoes")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                disabled={!canProceed || isDeleting}
                onClick={() => setShowConfirmDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Minha Conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Final Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Última Confirmação
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta é sua última chance de voltar atrás. Após clicar em "Sim, excluir", sua conta e todos os dados serão excluídos permanentemente.
              <br /><br />
              <strong>Tem certeza absoluta?</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Não, manter minha conta
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Sim, excluir minha conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeleteAccount;
