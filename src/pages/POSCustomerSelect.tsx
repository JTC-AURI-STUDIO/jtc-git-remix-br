import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, User, ArrowLeft, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  name: string;
  cpf: string;
  current_balance: number;
}

const POSCustomerSelect = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (!error) setCustomers(data || []);
    setLoading(false);
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectCustomer = (customer: Customer) => {
    sessionStorage.setItem("pos_selected_customer", JSON.stringify(customer));
    navigate("/pdv", { state: { fromCustomerSelect: true } });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/pdv", { state: { fromCustomerSelect: true } })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Selecionar Cliente</h1>
            <p className="text-sm text-muted-foreground">Escolha o cliente para a venda fiado</p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/clientes/novo")}
          className="bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent-hover"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CPF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 text-lg"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <Card
            key={customer.id}
            className="cursor-pointer hover:border-primary hover:shadow-lg transition-all"
            onClick={() => selectCustomer(customer)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                {customer.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">CPF:</span> {customer.cpf}</p>
                <p className={`font-semibold ${customer.current_balance < 0 ? "text-destructive" : customer.current_balance > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                  {customer.current_balance < 0
                    ? `Devendo: R$ ${(-customer.current_balance).toFixed(2)}`
                    : customer.current_balance > 0
                    ? `Crédito: R$ ${customer.current_balance.toFixed(2)}`
                    : "Sem pendências"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg text-muted-foreground">
            {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          </p>
        </div>
      )}
    </div>
  );
};

export default POSCustomerSelect;
