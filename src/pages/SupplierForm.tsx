import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const SupplierForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!id);

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

  const setFormCb = useCallback((d: typeof form) => setForm(d), []);
  const { clearPersisted } = useFormPersistence("supplier_form", form, setFormCb, { enabled: !isEditing });

  const isMissingTableError = (error: any) =>
    error?.code === "PGRST205" || error?.code === "42P01";

  useEffect(() => {
    if (id) loadSupplier();
  }, [id]);

  const loadSupplier = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoading(false); return; }

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && !isMissingTableError(error)) {
      toast({ title: "Erro ao carregar fornecedor", variant: "destructive" });
      navigate("/fornecedores");
      return;
    }

    if (!data) {
      toast({ title: "Fornecedor não encontrado", variant: "destructive" });
      navigate("/fornecedores");
      return;
    }

    const doc = data.cnpj || "";
    const numbers = doc.replace(/\D/g, "");
    const docType = numbers.length <= 11 ? "cpf" : "cnpj";

    setForm({
      name: data.name,
      documentType: docType,
      document: data.cnpj || "",
      phone: data.phone || "",
      email: data.email || "",
      address: data.address || "",
      contact_person: data.contact_person || "",
      notes: data.notes || "",
    });
    setIsLoading(false);
  };

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

  const formatDocument = (value: string) => form.documentType === "cpf" ? formatCPF(value) : formatCNPJ(value);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!form.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
      if (isEditing) {
        const { error } = await supabase.from("suppliers").update(supplierData).eq("id", id);
        if (error) {
          toast({ title: "Erro ao atualizar fornecedor", variant: "destructive" });
          return;
        }
        toast({ title: "Fornecedor atualizado com sucesso" });
      } else {
        const { error } = await supabase.from("suppliers").insert([supplierData]);
        if (error) {
          toast({ title: "Erro ao criar fornecedor", variant: "destructive" });
          return;
        }
        toast({ title: "Fornecedor criado com sucesso" });
      }
      clearPersisted();
      navigate("/fornecedores");
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
        <Button variant="ghost" size="icon" onClick={() => navigate("/fornecedores")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? "Editar Fornecedor" : "Novo Fornecedor"}
        </h1>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do fornecedor" />
        </div>

        <div className="space-y-2">
          <Label>Tipo de Documento</Label>
          <Select value={form.documentType} onValueChange={(v: "cpf" | "cnpj") => setForm({ ...form, documentType: v, document: "" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cpf">CPF</SelectItem>
              <SelectItem value="cnpj">CNPJ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{form.documentType === "cpf" ? "CPF" : "CNPJ"}</Label>
          <Input
            value={form.document}
            onChange={(e) => setForm({ ...form, document: formatDocument(e.target.value) })}
            placeholder={form.documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
            inputMode="numeric"
          />
        </div>

        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" inputMode="numeric" />
        </div>

        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@fornecedor.com" />
        </div>

        <div className="space-y-2">
          <Label>Pessoa de Contato</Label>
          <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="Nome do contato" />
        </div>

        <div className="space-y-2">
          <Label>Endereço</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Endereço completo" />
        </div>

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações sobre o fornecedor" />
        </div>
      </div>

      <div className="flex gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate("/fornecedores")} disabled={isSaving} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </div>
  );
};

export default SupplierForm;
