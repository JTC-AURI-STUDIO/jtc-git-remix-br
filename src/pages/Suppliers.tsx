import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLoader from "@/components/PageLoader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Truck } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionBlocker from "@/components/SubscriptionBlocker";

interface Supplier {
  id: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  contact_person: string | null;
  notes: string | null;
}

const Suppliers = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { isExpired, isTrial, loading } = useSubscription();

  const [form, setForm] = useState({
    name: "",
    documentType: "cnpj" as "cpf" | "cnpj",
    document: "",
    phone: "",
    email: "",
    address: "",
    contact_person: "",
    notes: "",
  });

  const isMissingTableError = (error: any) =>
    error?.code === "PGRST205" || error?.code === "42P01";

  const fetchSuppliers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      if (isMissingTableError(error)) {
        setSuppliers([]);
        return;
      }
      toast({ title: "Erro ao carregar fornecedores", variant: "destructive" });
    } else {
      setSuppliers(data || []);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  if (!loading && isExpired) {
    return <SubscriptionBlocker isTrial={isTrial} />;
  }

  const handleSave = async () => {
    if (isSaving) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!form.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    const supplierData = {
      name: form.name,
      cnpj: form.document || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      contact_person: form.contact_person || null,
      notes: form.notes || null,
      user_id: user.id,
    };

    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update(supplierData)
          .eq("id", editingSupplier.id);

        if (error) {
          toast({ title: "Erro ao atualizar fornecedor", variant: "destructive" });
        } else {
          toast({ title: "Fornecedor atualizado com sucesso" });
          fetchSuppliers();
          resetForm();
        }
      } else {
        const { error } = await supabase.from("suppliers").insert([supplierData]);

        if (error) {
          toast({ title: "Erro ao criar fornecedor", variant: "destructive" });
        } else {
          toast({ title: "Fornecedor criado com sucesso" });
          fetchSuppliers();
          resetForm();
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao deletar fornecedor", variant: "destructive" });
    } else {
      toast({ title: "Fornecedor deletado com sucesso" });
      fetchSuppliers();
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      documentType: "cnpj",
      document: "",
      phone: "",
      email: "",
      address: "",
      contact_person: "",
      notes: "",
    });
    setEditingSupplier(null);
    setIsDialogOpen(false);
  };

  const startEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    
    // Detectar tipo de documento baseado no formato
    const doc = supplier.cnpj || "";
    const numbers = doc.replace(/\D/g, "");
    const docType = numbers.length <= 11 ? "cpf" : "cnpj";
    
    setForm({
      name: supplier.name,
      documentType: docType,
      document: supplier.cnpj || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      contact_person: supplier.contact_person || "",
      notes: supplier.notes || "",
    });
    setIsDialogOpen(true);
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 14);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
  };

  const formatDocument = (value: string) => {
    if (form.documentType === "cpf") {
      return formatCPF(value);
    }
    return formatCNPJ(value);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const handleDocumentTypeChange = (type: "cpf" | "cnpj") => {
    setForm({ ...form, documentType: type, document: "" });
  };

  return (
    <PageLoader pageName="Fornecedores">
    <div className="p-6 space-y-6 overflow-hidden animate-fade-in">
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Fornecedores
          </h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores</p>
        </div>
        <Button onClick={() => navigate("/fornecedores/novo")} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:scale-[1.02]">
          <Plus className="mr-2 h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className="empty-state">
          <Truck className="empty-state-icon" />
          <h3 className="text-lg font-semibold">Nenhum fornecedor encontrado</h3>
          <p className="text-muted-foreground mt-1">Comece cadastrando seu primeiro fornecedor.</p>
        </div>
      ) : (
        <div className="table-modern">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Nome</TableHead>
                <TableHead className="w-[25%]">Telefone</TableHead>
                <TableHead className="w-[25%]">Contato</TableHead>
                <TableHead className="w-[15%] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id} className="group">
                  <TableCell className="font-medium truncate">{supplier.name}</TableCell>
                  <TableCell className="truncate">{supplier.phone || "-"}</TableCell>
                  <TableCell className="truncate">{supplier.contact_person || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/fornecedores/editar/${supplier.id}`)} className="opacity-70 group-hover:opacity-100 transition-opacity">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier.id)} className="opacity-70 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
    </PageLoader>
  );
};

export default Suppliers;