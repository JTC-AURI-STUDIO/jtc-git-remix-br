import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Package, ShoppingCart, AlertTriangle, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { PixFeeCalculator } from "@/components/PixFeeCalculator";
import { DashboardSkeleton } from "@/components/skeletons";
import { usePermissions } from "@/hooks/usePermissions";
import { QUICK_ACTION_PERMISSIONS } from "@/lib/permissions";

// Importar imagens de ações rápidas
import quickActionProdutos from "@/assets/quick-action-produtos.png";
import quickActionVenda from "@/assets/quick-action-venda.png";
import quickActionClientes from "@/assets/quick-action-clientes.png";
import quickActionHistorico from "@/assets/quick-action-historico.png";
import quickActionRelatorios from "@/assets/quick-action-relatorios.png";
import quickActionConfiguracoes from "@/assets/quick-action-configuracoes.png";
import quickActionAssinatura from "@/assets/quick-action-assinatura.png";
import quickActionFornecedores from "@/assets/quick-action-fornecedores.jpg";
import quickActionCalculadora from "@/assets/quick-action-calculadora.png";
import quickActionBonus from "@/assets/gift-box.jpg";
import PageLoader from "@/components/PageLoader";

interface DashboardData {
  salesToday: number;
  salesMonth: number;
  lowStockProducts: number;
  recentSales: number;
  subscriptionStatus: "active" | "trial" | "expired";
  trialDaysLeft?: number;
  subscriptionDaysLeft?: number;
  subscriptionEndDate?: Date;
  quickActionsEnabled: boolean;
  hideTrialMessage: boolean;
}

const quickActions = [
  { label: "Produtos", path: "/produtos", image: quickActionProdutos },
  { label: "Venda", path: "/pdv", image: quickActionVenda },
  { label: "Clientes", path: "/clientes", image: quickActionClientes },
  { label: "Fornecedores", path: "/fornecedores", image: quickActionFornecedores },
  { label: "Histórico", path: "/historico", image: quickActionHistorico },
  { label: "Relatórios", path: "/relatorios", image: quickActionRelatorios },
  { label: "Configurações", path: "/configuracoes", image: quickActionConfiguracoes },
  { label: "Assinatura", path: "/assinatura", image: quickActionAssinatura },
  { label: "Calculadora", path: "#calculadora", image: quickActionCalculadora, isModal: true },
  { label: "Bônus", path: "/resgate-semanal", image: quickActionBonus },
];

const Dashboard = () => {
  const { hasPermission, isAdmin, getEffectiveUserId } = usePermissions();
  const [data, setData] = useState<DashboardData>({
    salesToday: 0,
    salesMonth: 0,
    lowStockProducts: 0,
    recentSales: 0,
    subscriptionStatus: "trial",
    trialDaysLeft: 0,
    subscriptionDaysLeft: 0,
    subscriptionEndDate: undefined,
    quickActionsEnabled: false,
    hideTrialMessage: false,
  });
  const [loading, setLoading] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);

  // Filter quick actions by permissions
  const filteredQuickActions = quickActions.filter((action) => {
    if (action.isModal) return true; // Calculadora always visible
    const permKey = QUICK_ACTION_PERMISSIONS[action.path];
    if (permKey) return hasPermission(permKey);
    return true;
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // For employees, use admin's user_id to query data
      const effectiveUserId = getEffectiveUserId() || user.id;

      const isMissingTableError = (err: any) => err?.code === "PGRST205";

      // Buscar perfil
      const { data: profile } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("user_id", effectiveUserId)
        .maybeSingle();

      // Store settings é opcional
      let quickActionsEnabled = true;
      let hideTrialMessage = false;
      const { data: storeSettings, error: storeSettingsError } = await supabase
        .from("store_settings")
        .select("quick_actions_enabled, hide_trial_message")
        .eq("user_id", effectiveUserId)
        .maybeSingle();

      if (!storeSettingsError && storeSettings) {
        quickActionsEnabled = storeSettings.quick_actions_enabled ?? true;
        hideTrialMessage = storeSettings.hide_trial_message ?? false;
      }

      // Calcular período de teste (3 dias)
      const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
      const trialEnd = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const isTrialActive = now <= trialEnd;

      let trialDaysLeft = 0;
      let subscriptionDaysLeft = 0;
      let subscriptionEndDate: Date | undefined = undefined;
      let subscriptionStatus: "active" | "trial" | "expired" = "expired";

      if (isTrialActive) {
        const diffTime = trialEnd.getTime() - now.getTime();
        trialDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        subscriptionStatus = "trial";
        subscriptionEndDate = trialEnd;
        subscriptionDaysLeft = trialDaysLeft;
      }

      // Vendas de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: salesToday, error: salesTodayError } = await supabase
        .from("sales")
        .select("total_amount")
        .eq("user_id", effectiveUserId)
        .gte("created_at", today.toISOString());

      const totalToday = isMissingTableError(salesTodayError)
        ? 0
        : (salesToday?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0);

      // Vendas do mês
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const { data: salesMonth, error: salesMonthError } = await supabase
        .from("sales")
        .select("total_amount")
        .eq("user_id", effectiveUserId)
        .gte("created_at", firstDayOfMonth.toISOString());

      const totalMonth = isMissingTableError(salesMonthError)
        ? 0
        : (salesMonth?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0);

      // Produtos com estoque baixo
      const { data: productsForStock, error: productsError } = await supabase
        .from("products")
        .select("id, stock_quantity, min_stock_quantity")
        .eq("user_id", effectiveUserId);

      const lowStockCount = isMissingTableError(productsError)
        ? 0
        : (productsForStock?.filter(
            (product) => product.stock_quantity <= (product.min_stock_quantity ?? 0)
          ).length || 0);

      // Vendas recentes
      const { data: recentSales, error: recentSalesError } = await supabase
        .from("sales")
        .select("id")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false })
        .limit(5);

      setData({
        salesToday: isMissingTableError(salesTodayError) ? 0 : totalToday,
        salesMonth: isMissingTableError(salesMonthError) ? 0 : totalMonth,
        lowStockProducts: lowStockCount,
        recentSales: isMissingTableError(recentSalesError) ? 0 : (recentSales?.length || 0),
        subscriptionStatus,
        trialDaysLeft,
        subscriptionDaysLeft,
        subscriptionEndDate,
        quickActionsEnabled,
        hideTrialMessage,
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLoader pageName="Dashboard">
        <DashboardSkeleton />
      </PageLoader>
    );
  }

  return (
    <PageLoader pageName="Dashboard">
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">Visão geral do seu negócio</p>
      </div>

      {/* Status da Assinatura */}
      {!data.hideTrialMessage && data.subscriptionStatus === "trial" && (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 shadow-lg animate-scale-in">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full blur-2xl" />
          <CardHeader className="relative pb-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    Período de Teste Ativo
                  </CardTitle>
                  <CardDescription className="text-muted-foreground/80">
                    Explore todos os recursos do sistema
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md px-4 py-1.5 text-sm font-semibold animate-pulse">
                {data.trialDaysLeft} {data.trialDaysLeft === 1 ? 'dia' : 'dias'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative pt-2">
            <Link to="/assinatura">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:scale-[1.02]">
                Assinar Agora
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!data.hideTrialMessage && data.subscriptionStatus === "expired" && (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-500/10 via-rose-500/10 to-pink-500/10 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-rose-500/5" />
          <CardHeader className="relative pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 shadow-lg">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                  Assinatura Expirada
                </CardTitle>
                <CardDescription className="text-muted-foreground/80">
                  Renove para continuar usando o sistema
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative pt-2">
            <Link to="/assinatura">
              <Button className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]">
                Renovar Assinatura
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!data.hideTrialMessage && data.subscriptionStatus === "active" && (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-teal-500/10 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-green-500/5" />
          <CardHeader className="relative pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                    Assinatura Ativa
                  </CardTitle>
                  {data.subscriptionEndDate && (
                    <CardDescription className="text-muted-foreground/80">
                      Válido até {data.subscriptionEndDate.toLocaleDateString('pt-BR')}
                    </CardDescription>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 shadow-md px-4 py-1.5 text-sm font-semibold">
                  {data.subscriptionDaysLeft} {data.subscriptionDaysLeft === 1 ? 'dia' : 'dias'}
                </Badge>
                <span className="text-xs text-muted-foreground">restantes</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative pt-2">
            <Link to="/assinatura">
              <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
                Renovar Plano
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Ações Rápidas com Logos */}
      {data.quickActionsEnabled && (
        <div className="grid grid-cols-4 md:grid-cols-10 gap-4">
          {filteredQuickActions.map((action) => (
            action.isModal ? (
              <button 
                key={action.path} 
                onClick={() => setShowCalculator(true)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-card border border-border p-2 transition-all group-hover:scale-105 group-hover:shadow-lg">
                  <img 
                    src={action.image} 
                    alt={action.label} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xs md:text-sm font-medium text-center text-muted-foreground group-hover:text-foreground transition-colors">
                  {action.label}
                </span>
              </button>
            ) : (
              <Link key={action.path} to={action.path} className="flex flex-col items-center gap-2 group">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-card border border-border p-2 transition-all group-hover:scale-105 group-hover:shadow-lg">
                  <img 
                    src={action.image} 
                    alt={action.label} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xs md:text-sm font-medium text-center text-muted-foreground group-hover:text-foreground transition-colors">
                  {action.label}
                </span>
              </Link>
            )
          ))}
        </div>
      )}

      {/* Modal da Calculadora PIX */}
      <PixFeeCalculator open={showCalculator} onOpenChange={setShowCalculator} />

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="metric-card animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendas Hoje</CardTitle>
            <div className="icon-gradient-primary">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              R$ {data.salesToday.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Faturamento do dia</p>
          </CardContent>
        </Card>

        <Card className="metric-card animate-fade-in delay-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendas do Mês</CardTitle>
            <div className="icon-gradient-accent">
              <ShoppingCart className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">
              R$ {data.salesMonth.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Faturamento mensal</p>
          </CardContent>
        </Card>

        <Card className="metric-card animate-fade-in delay-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estoque Baixo</CardTitle>
            <div className="icon-gradient-warning">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">Produtos precisam reposição</p>
          </CardContent>
        </Card>

        <Card className="metric-card animate-fade-in delay-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Últimas Vendas</CardTitle>
            <div className="icon-gradient-info">
              <Package className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.recentSales}</div>
            <p className="text-xs text-muted-foreground mt-1">Transações recentes</p>
          </CardContent>
        </Card>
      </div>
    </div>
    </PageLoader>
  );
};

export default Dashboard;