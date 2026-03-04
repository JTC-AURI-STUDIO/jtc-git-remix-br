import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const CustomerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!id);

  const [form, setForm] = useState({
    name: "",
    cpf: "",
    birth_date: "",
    address: "",
    phone: "",
  });

  const setFormCb = useCallback((d: typeof form) => setForm(d), []);
  const { clearPersisted } = useFormPersistence("customer_form", form, setFormCb, { enabled: !isEditing });

  const isMissingTableError = (error: any) =>
    error?.code === "PGRST205" || error?.code === "42P01";

  useEffect(() => {
    if (id) loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoading(false); return; }

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && !isMissingTableError(error)) {
      toast({ title: "Erro ao carregar cliente", variant: "destructive" });
      navigate("/clientes");
      return;
    }

    if (!data) {
      toast({ title: "Cliente não encontrado", variant: "destructive" });
      navigate("/clientes");
      return;
    }

    setForm({
      name: data.name || "",
      cpf: data.cpf || "",
      birth_date: data.birth_date || "",
      address: data.address || "",
      phone: data.phone || "",
    });
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!form.cpf || !form.address) {
      toast({ title: "CPF e Endereço são obrigatórios", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsSaving(true);

    const customerData = {
      name: form.name,
      cpf: form.cpf,
      birth_date: form.birth_date || null,
      address: form.address,
      phone: form.phone || null,
      user_id: user.id,
    };

    try {
      if (isEditing) {
        const { error } = await supabase.from("customers").update(customerData).eq("id", id);
        if (error) {
          toast({ title: "Erro ao atualizar cliente", variant: "destructive" });
          return;
        }
        toast({ title: "Cliente atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from("customers").insert(customerData);
        if (error) {
          toast({ title: "Erro ao cadastrar cliente", variant: "destructive" });
          return;
        }
        toast({ title: "Cliente cadastrado com sucesso!" });
      }
      clearPersisted();
      navigate("/clientes");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? "Editar Cliente" : "Novo Cliente"}
        </h1>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome do Cliente</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>CPF *</Label>
          <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Data de Nascimento</Label>
          <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Endereço *</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>

      <div className="flex gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate("/clientes")} disabled={isSaving} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? "Salvando..." : isEditing ? "Atualizar" : "Cadastrar"}
        </Button>
      </div>
    </div>
  );
};

export default CustomerForm;
