import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLoader from "@/components/PageLoader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Users, DollarSign, CreditCard, Eye, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionBlocker from "@/components/SubscriptionBlocker";
import { CustomersSkeleton } from "@/components/skeletons";

interface Customer {
  id: string;
  name: string;
  cpf: string;
  birth_date: string | null;
  address: string;
  phone: string | null;
  current_balance: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPaymentConfirmOpen, setIsPaymentConfirmOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditFromChange, setCreditFromChange] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<{
    debt: number;
    paid: number;
    change: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    birth_date: "",
    address: "",
    phone: "",
  });
  const { toast } = useToast();
  const { isActive, isExpired, isTrial, loading } = useSubscription();

  useEffect(() => {
    loadCustomers();
  }, []);

  const isMissingTableError = (error: any) =>
    error?.code === "PGRST205" || error?.code === "42P01";

  const fetchCustomers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      if (isMissingTableError(error)) {
        setCustomers([]);
        return;
      }
      toast({ title: "Erro ao carregar clientes", variant: "destructive" });
      return;
    }

    setCustomers(data || []);
  };

  const fetchTransactions = async (customerId: string) => {
    const { data, error } = await supabase
      .from("customer_transactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        setTransactions([]);
        return;
      }
      toast({ title: "Erro ao carregar transações", variant: "destructive" });
      return;
    }

    setTransactions(data || []);
  };

  const loadCustomers = async () => {
    setIsLoading(true);
    await fetchCustomers();
    setIsLoading(false);
  };

  useEffect(() => {
    if (selectedCustomer) {
      fetchTransactions(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  // Bloquear se assinatura expirada
  if (!loading && isExpired) {
    return <SubscriptionBlocker isTrial={isTrial} />;
  }

  if (isLoading) {
    return (
      <PageLoader pageName="Clientes">
        <CustomersSkeleton />
      </PageLoader>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cpf || !formData.address) {
      toast({
        title: "Campos obrigatórios",
        description: "CPF e Endereço são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("customers").insert({
      user_id: user.id,
      name: formData.name,
      cpf: formData.cpf,
      birth_date: formData.birth_date || null,
      address: formData.address,
      phone: formData.phone || null,
    });

    if (error) {
      toast({ title: "Erro ao cadastrar cliente", variant: "destructive" });
      return;
    }

    toast({ title: "Cliente cadastrado com sucesso!" });
    setIsAddDialogOpen(false);
    setFormData({ name: "", cpf: "", birth_date: "", address: "", phone: "" });
    fetchCustomers();
  };

  const handlePaymentStep1 = () => {
    if (!selectedCustomer || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }

    const currentDebt = -selectedCustomer.current_balance;
    const change = amount - currentDebt;

    if (change > 0) {
      setPaymentData({
        debt: currentDebt,
        paid: amount,
        change: change,
      });
      setIsPaymentDialogOpen(false);
      setIsPaymentConfirmOpen(true);
    } else {
      // Pagamento parcial ou igual
      finalizePayment(amount, 0);
    }
  };

  const finalizePayment = async (paidAmount: number, creditAmount: number) => {
    if (!selectedCustomer || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentDebt = -selectedCustomer.current_balance;
      const change = paidAmount - currentDebt;
      const finalCredit = creditAmount;
      const toReturn = change - finalCredit;

      const newBalance = finalCredit;
      
      await supabase.from("customers").update({ current_balance: newBalance }).eq("id", selectedCustomer.id);
      await supabase.from("customer_transactions").insert({
        customer_id: selectedCustomer.id,
        user_id: user.id,
        type: "payment",
        amount: paidAmount,
        description: finalCredit > 0 
          ? `Pagamento de ${formatCurrency(paidAmount)} (${formatCurrency(finalCredit)} deixado como crédito, ${formatCurrency(toReturn)} devolvido)`
          : `Pagamento de ${formatCurrency(paidAmount)} (${formatCurrency(toReturn)} devolvido)`,
      });

      toast({ title: "Pagamento registrado com sucesso!" });
      setPaymentAmount("");
      setCreditFromChange("");
      setPaymentData(null);
      setIsPaymentConfirmOpen(false);
      fetchCustomers();
      const updated = customers.find(c => c.id === selectedCustomer.id);
      if (updated) setSelectedCustomer(updated);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizePayment = () => {
    if (!paymentData) return;
    
    const creditValue = parseFloat(creditFromChange) || 0;
    if (creditValue < 0 || creditValue > paymentData.change) {
      toast({ title: "Valor de crédito inválido", variant: "destructive" });
      return;
    }

    finalizePayment(paymentData.paid, creditValue);
  };

  const handleCredit = async () => {
    if (!selectedCustomer || !creditAmount || isProcessing) return;

    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newBalance = selectedCustomer.current_balance + amount;
      await supabase.from("customers").update({ current_balance: newBalance }).eq("id", selectedCustomer.id);
      await supabase.from("customer_transactions").insert({
        customer_id: selectedCustomer.id,
        user_id: user.id,
        type: "credit",
        amount: amount,
        description: `Crédito deixado de ${formatCurrency(amount)}`,
      });

      toast({ title: "Crédito registrado com sucesso!" });
      setCreditAmount("");
      setIsCreditDialogOpen(false);
      fetchCustomers();
      if (selectedCustomer) {
        const updated = customers.find(c => c.id === selectedCustomer.id);
        if (updated) setSelectedCustomer(updated);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageLoader pageName="Clientes">
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Clientes
          </h1>
          <p className="text-muted-foreground">Gerencie seus clientes e saldos</p>
        </div>
        <Button onClick={() => navigate("/clientes/novo")} className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:scale-[1.02]">
          <UserPlus className="w-4 h-4" />
          Cadastrar Cliente
        </Button>
      </div>

      {selectedCustomer ? (
        <div className="space-y-6">
          <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
            ← Voltar para lista
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>{selectedCustomer.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p className="font-medium">{selectedCustomer.cpf}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{selectedCustomer.phone || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="font-medium">{selectedCustomer.address}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Atual</p>
                    <p className={`text-2xl font-bold ${selectedCustomer.current_balance < 0 ? "text-destructive" : "text-green-600"}`}>
                      {selectedCustomer.current_balance < 0 ? `Devendo: ${formatCurrency(-selectedCustomer.current_balance)}` : `Crédito: ${formatCurrency(selectedCustomer.current_balance)}`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="flex-1 gap-2 border-red-500 text-red-500 hover:bg-red-50 disabled:opacity-50"
                        disabled={selectedCustomer.current_balance >= 0}
                      >
                        <DollarSign className="w-4 h-4" />
                        Registrar Pagamento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Registrar Pagamento</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="payment">Valor do Pagamento</Label>
                          <Input
                            id="payment"
                            type="number"
                            step="0.01"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <Button onClick={handlePaymentStep1} className="w-full">Confirmar</Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1 gap-2 border-green-500 text-green-500 hover:bg-green-50">
                        <CreditCard className="w-4 h-4" />
                        Deixar Crédito
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Registrar Crédito</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="credit">Valor do Crédito</Label>
                          <Input
                            id="credit"
                            type="number"
                            step="0.01"
                            value={creditAmount}
                            onChange={(e) => setCreditAmount(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <Button onClick={handleCredit} className="w-full" disabled={isProcessing}>
                          {isProcessing ? "Processando..." : "Confirmar Crédito"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <Dialog open={isPaymentConfirmOpen} onOpenChange={setIsPaymentConfirmOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmação de Pagamento</DialogTitle>
                    </DialogHeader>
                    {paymentData && (
                      <div className="space-y-4">
                        <div className="space-y-2 p-4 bg-muted rounded-lg">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Valor da dívida:</span>
                            <span className="font-bold text-red-500">{formatCurrency(paymentData.debt)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Valor pago:</span>
                            <span className="font-bold">{formatCurrency(paymentData.paid)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-sm text-muted-foreground">Troco total:</span>
                            <span className="font-bold text-green-600">{formatCurrency(paymentData.change)}</span>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="creditFromChange">Deixar como crédito (opcional)</Label>
                          <Input
                            id="creditFromChange"
                            type="number"
                            step="0.01"
                            value={creditFromChange}
                            onChange={(e) => setCreditFromChange(e.target.value)}
                            placeholder="0.00"
                            max={paymentData.change}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Máximo: {formatCurrency(paymentData.change)}
                          </p>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-medium text-blue-900">Valor a devolver para o cliente:</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(paymentData.change - (parseFloat(creditFromChange) || 0))}
                          </p>
                        </div>

                        <Button onClick={handleFinalizePayment} className="w-full" disabled={isProcessing}>
                          {isProcessing ? "Processando..." : "Atualizar"}
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Histórico de Transações</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactions.map((t) => (
                    <div key={t.id} className="flex justify-between items-center p-2 bg-muted rounded">
                      <div>
                        <p className="text-sm font-medium">
                          {t.type === "debt" && "Compra a prazo"}
                          {t.type === "payment" && "Pagamento"}
                          {t.type === "credit" && "Crédito deixado"}
                        </p>
                        {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <p className={`font-bold ${t.type === "debt" ? "text-destructive" : "text-green-600"}`}>
                        {t.type === "debt" ? "-" : "+"}{formatCurrency(t.amount)}
                      </p>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma transação registrada</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {customer.name}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/clientes/editar/${customer.id}`)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">CPF:</span> {customer.cpf}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Telefone:</span> {customer.phone || "—"}
                  </p>
                  <div className="pt-2 border-t">
                    <p className={`font-bold ${customer.current_balance < 0 ? "text-destructive" : "text-green-600"}`}>
                      {customer.current_balance < 0
                        ? `Devendo: ${formatCurrency(-customer.current_balance)}`
                        : customer.current_balance > 0
                        ? `Crédito: ${formatCurrency(customer.current_balance)}`
                        : "Sem pendências"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {customers.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum cliente cadastrado
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <p className="text-sm font-medium mt-1">{selectedCustomer.name}</p>
              </div>
              <div>
                <Label>CPF</Label>
                <p className="text-sm font-medium mt-1">{selectedCustomer.cpf}</p>
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <p className="text-sm font-medium mt-1">
                  {selectedCustomer.birth_date 
                    ? new Date(selectedCustomer.birth_date).toLocaleDateString("pt-BR")
                    : "—"}
                </p>
              </div>
              <div>
                <Label>Endereço</Label>
                <p className="text-sm font-medium mt-1">{selectedCustomer.address}</p>
              </div>
              <div>
                <Label>Telefone</Label>
                <p className="text-sm font-medium mt-1">{selectedCustomer.phone || "—"}</p>
              </div>
              <div>
                <Label>Saldo Atual</Label>
                <p className={`text-lg font-bold mt-1 ${selectedCustomer.current_balance < 0 ? "text-destructive" : "text-green-600"}`}>
                  {selectedCustomer.current_balance < 0
                    ? `Devendo: ${formatCurrency(-selectedCustomer.current_balance)}`
                    : selectedCustomer.current_balance > 0
                    ? `Crédito: ${formatCurrency(selectedCustomer.current_balance)}`
                    : "Sem pendências"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
    </PageLoader>
  );
};

export default Customers;
