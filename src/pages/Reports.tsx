import { useState, useEffect } from "react";
import PageLoader from "@/components/PageLoader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Calendar, TrendingUp, Package, DollarSign, Download, Eye, Percent } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { ReportsSkeleton } from "@/components/skeletons";

interface SaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name?: string;
  cost_price?: number;
}

interface Sale {
  id: string;
  created_at: string;
  total_amount: number;
  discount: number;
  payment_method: string;
  customer_id: string | null;
  customer_name?: string;
  items: SaleItem[];
}

interface ProductSale {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  total_cost: number;
  margin: number;
}

const Reports = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAllSales, setShowAllSales] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [startDate, endDate, showAllSales]);

  const loadData = async () => {
    setIsLoading(true);
    await fetchSalesData();
    setIsLoading(false);
  };

  const formatDateInput = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 8);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`;
  };

  const parseDate = (dateStr: string) => {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return null;
  };

  const isMissingTableError = (error: any) =>
    error?.code === "PGRST205" || error?.code === "42P01";

  const fetchSalesData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("sales")
      .select(`
        *,
        customers (name)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!showAllSales && startDate && endDate) {
      const parsedStart = parseDate(startDate);
      const parsedEnd = parseDate(endDate);
      if (parsedStart && parsedEnd) {
        query = query
          .gte("created_at", `${parsedStart}T00:00:00`)
          .lte("created_at", `${parsedEnd}T23:59:59`);
      }
    }

    const { data: salesData, error: salesError } = await query;

    if (salesError) {
      if (isMissingTableError(salesError)) {
        setSales([]);
        setProductSales([]);
        return;
      }
      toast({ title: "Erro ao carregar vendas", variant: "destructive" });
      return;
    }

    // Buscar itens de cada venda com preço de custo
    const salesWithItems = await Promise.all(
      (salesData || []).map(async (sale) => {
        const { data: items } = await supabase
          .from("sale_items")
          .select(`
            *,
            products (name, cost_price)
          `)
          .eq("sale_id", sale.id);

        return {
          ...sale,
          customer_name: sale.customers?.name,
          items: items?.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            product_name: item.products?.name,
            cost_price: item.products?.cost_price || 0,
          })) || [],
        };
      })
    );

    setSales(salesWithItems);

    // Calcular produtos mais vendidos com margem
    const productMap = new Map<string, { quantity: number; revenue: number; cost: number; name: string }>();

    for (const sale of salesWithItems) {
      for (const item of sale.items) {
        const existing = productMap.get(item.product_id) || {
          quantity: 0,
          revenue: 0,
          cost: 0,
          name: item.product_name || "Produto",
        };

        productMap.set(item.product_id, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.quantity * item.unit_price,
          cost: existing.cost + item.quantity * (item.cost_price || 0),
          name: existing.name,
        });
      }
    }

    const productSalesArray = Array.from(productMap.values())
      .map((p) => ({
        product_name: p.name,
        total_quantity: p.quantity,
        total_revenue: p.revenue,
        total_cost: p.cost,
        margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.total_quantity - a.total_quantity);

    setProductSales(productSalesArray);
  };

  const calculateSaleMargin = (sale: Sale) => {
    const revenue = sale.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const cost = sale.items.reduce((sum, item) => sum + item.quantity * (item.cost_price || 0), 0);
    return revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
  };

  const calculateSaleProfit = (sale: Sale) => {
    const revenue = sale.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const cost = sale.items.reduce((sum, item) => sum + item.quantity * (item.cost_price || 0), 0);
    return revenue - cost;
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalCost = sales.reduce((sum, sale) => 
    sale.items.reduce((itemSum, item) => itemSum + item.quantity * (item.cost_price || 0), 0) + sum, 0
  );
  const totalProfit = totalRevenue - totalCost;
  const totalMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
  const totalDiscount = sales.reduce((sum, sale) => sum + (sale.discount || 0), 0);
  const totalTransactions = sales.length;

  const paymentMethodSummary = sales.reduce((acc, sale) => {
    acc[sale.payment_method] = (acc[sale.payment_method] || 0) + sale.total_amount;
    return acc;
  }, {} as Record<string, number>);

  const exportToCSV = () => {
    const headers = ["Data", "Valor Total", "Desconto", "Margem", "Forma de Pagamento"];
    const rows = sales.map((sale) => [
      format(new Date(sale.created_at), "dd/MM/yyyy HH:mm"),
      sale.total_amount.toFixed(2),
      (sale.discount || 0).toFixed(2),
      calculateSaleMargin(sale).toFixed(1) + "%",
      sale.payment_method,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${showAllSales ? "completo" : `${startDate.replace(/\//g, "-")}-${endDate.replace(/\//g, "-")}`}.csv`;
    a.click();
    toast({ title: "Relatório exportado com sucesso" });
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      credit: "Crédito",
      debit: "Débito",
      pix: "PIX",
      cash: "Dinheiro",
      fiado: "Fiado",
      credito: "Crédito Cliente",
    };
    return methods[method] || method;
  };

  const viewSaleDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setShowDetails(true);
  };

  if (isLoading) {
    return (
      <PageLoader pageName="Relatórios">
        <ReportsSkeleton />
      </PageLoader>
    );
  }

  return (
    <PageLoader pageName="Relatórios">
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-hidden animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Relatórios
          </h1>
          <p className="text-muted-foreground text-sm">Análise de vendas e desempenho</p>
        </div>
        <Button onClick={exportToCSV} size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:scale-[1.02]">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={showAllSales}
            onCheckedChange={setShowAllSales}
          />
          <Label className="text-sm">Ver todas as vendas</Label>
        </div>

        {!showAllSales && (
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-2 w-full sm:w-auto">
              <Label className="text-sm">Data Inicial</Label>
              <Input
                value={startDate}
                onChange={(e) => setStartDate(formatDateInput(e.target.value))}
                placeholder="DD/MM/AAAA"
                className="w-full sm:w-40"
                maxLength={10}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2 w-full sm:w-auto">
              <Label className="text-sm">Data Final</Label>
              <Input
                value={endDate}
                onChange={(e) => setEndDate(formatDateInput(e.target.value))}
                placeholder="DD/MM/AAAA"
                className="w-full sm:w-40"
                maxLength={10}
                inputMode="numeric"
              />
            </div>
            <Button onClick={fetchSalesData} size="sm" className="w-full sm:w-auto">
              <Calendar className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="metric-card animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
            <div className="icon-gradient-primary p-2">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              R$ {totalRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card animate-fade-in delay-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Lucro</CardTitle>
            <div className="icon-gradient-accent p-2">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold text-accent">R$ {totalProfit.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="metric-card animate-fade-in delay-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Margem</CardTitle>
            <div className="icon-gradient-info p-2">
              <Percent className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold">{totalMargin.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card className="metric-card animate-fade-in delay-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Vendas</CardTitle>
            <div className="icon-gradient-warning p-2">
              <Package className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold">{totalTransactions}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1">
          <TabsTrigger value="sales" className="text-xs md:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">Vendas</TabsTrigger>
          <TabsTrigger value="products" className="text-xs md:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">Produtos</TabsTrigger>
          <TabsTrigger value="payment" className="text-xs md:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">Pagamento</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Histórico de Vendas</CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[30%]">Data</TableHead>
                    <TableHead className="text-xs w-[25%]">Valor</TableHead>
                    <TableHead className="text-xs w-[25%]">Margem</TableHead>
                    <TableHead className="text-xs w-[20%] text-right">Ver</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                        Nenhuma venda registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-xs truncate">{format(new Date(sale.created_at), "dd/MM/yy HH:mm")}</TableCell>
                        <TableCell className="text-xs font-medium truncate">R$ {sale.total_amount.toFixed(2)}</TableCell>
                        <TableCell className="text-xs truncate">
                          <span className={calculateSaleMargin(sale) > 0 ? "text-green-600" : "text-red-500"}>
                            {calculateSaleMargin(sale).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => viewSaleDetails(sale)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Produtos Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[40%]">Produto</TableHead>
                    <TableHead className="text-xs w-[15%]">Qtd</TableHead>
                    <TableHead className="text-xs w-[25%]">Faturamento</TableHead>
                    <TableHead className="text-xs w-[20%]">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                        Nenhum produto vendido
                      </TableCell>
                    </TableRow>
                  ) : (
                    productSales.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-xs font-medium truncate">{product.product_name}</TableCell>
                        <TableCell className="text-xs">{product.total_quantity}</TableCell>
                        <TableCell className="text-xs truncate">R$ {product.total_revenue.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">
                          <span className={product.margin > 0 ? "text-green-600" : "text-red-500"}>
                            {product.margin.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Resumo por Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[60%]">Forma de Pagamento</TableHead>
                    <TableHead className="text-xs w-[40%]">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(paymentMethodSummary).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8 text-muted-foreground text-sm">
                        Nenhuma venda registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    Object.entries(paymentMethodSummary).map(([method, total]) => (
                      <TableRow key={method}>
                        <TableCell className="text-xs capitalize font-medium truncate">{getPaymentMethodLabel(method)}</TableCell>
                        <TableCell className="text-xs truncate">R$ {total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Detalhes da Venda */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium text-sm">
                    {format(new Date(selectedSale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium text-sm">{selectedSale.customer_name || "Cliente Avulso"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pagamento</p>
                  <p className="font-medium text-sm">{getPaymentMethodLabel(selectedSale.payment_method)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Margem de Lucro</p>
                  <p className={`font-medium text-sm ${calculateSaleMargin(selectedSale) > 0 ? "text-green-600" : "text-red-500"}`}>
                    {calculateSaleMargin(selectedSale).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-sm">Itens da Venda</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Produto</TableHead>
                        <TableHead className="text-xs text-center">Qtd</TableHead>
                        <TableHead className="text-xs text-right">Preço</TableHead>
                        <TableHead className="text-xs text-right">Custo</TableHead>
                        <TableHead className="text-xs text-right">Margem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.items.map((item, idx) => {
                        const itemRevenue = item.quantity * item.unit_price;
                        const itemCost = item.quantity * (item.cost_price || 0);
                        const itemMargin = itemRevenue > 0 ? ((itemRevenue - itemCost) / itemRevenue) * 100 : 0;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">{item.product_name}</TableCell>
                            <TableCell className="text-xs text-center">{item.quantity}</TableCell>
                            <TableCell className="text-xs text-right">{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell className="text-xs text-right">{formatCurrency(item.cost_price || 0)}</TableCell>
                            <TableCell className="text-xs text-right">
                              <span className={itemMargin > 0 ? "text-green-600" : "text-red-500"}>
                                {itemMargin.toFixed(1)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(selectedSale.total_amount + selectedSale.discount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Desconto:</span>
                  <span>{formatCurrency(selectedSale.discount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lucro:</span>
                  <span className="text-green-600 font-medium">{formatCurrency(calculateSaleProfit(selectedSale))}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedSale.total_amount)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </PageLoader>
  );
};

export default Reports;