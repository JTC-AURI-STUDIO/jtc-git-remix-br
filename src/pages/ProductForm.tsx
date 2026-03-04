import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ImageUpload } from "@/components/ImageUpload";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface Supplier {
  id: string;
  name: string;
}

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    cost_price: "",
    price: "",
    promotional_price: "",
    stock_quantity: "",
    barcode: "",
    category_id: "",
    is_active: true,
    photo_url: "",
    hasSupplier: false,
    supplier_id: "",
    product_type: "unidade" as "peso" | "unidade" | "servico",
    hasStock: true,
    hasBarcode: true,
  });

  // Persist form data for 24h (only for new products)
  const setFormCb = useCallback((d: typeof form) => setForm(d), []);
  const { clearPersisted } = useFormPersistence("product_form", form, setFormCb, { enabled: !isEditing });

  const isMissingTableError = (error: any) =>
    error?.code === "PGRST205" || error?.code === "42P01";

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoading(false); return; }

    // Fetch categories & suppliers in parallel
    const [catRes, supRes] = await Promise.all([
      supabase.from("categories").select("*").eq("user_id", user.id).order("name"),
      supabase.from("suppliers").select("id, name").eq("user_id", user.id).order("name"),
    ]);

    if (!isMissingTableError(catRes.error)) setCategories(catRes.data || []);
    if (!isMissingTableError(supRes.error)) setSuppliers(supRes.data || []);

    // If editing, load product
    if (id) {
      const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !product) {
        toast({ title: "Produto não encontrado", variant: "destructive" });
        navigate("/produtos");
        return;
      }

      setForm({
        name: product.name,
        description: product.description || "",
        cost_price: product.cost_price?.toString() || "",
        price: product.price.toString(),
        promotional_price: product.promotional_price?.toString() || "",
        stock_quantity: product.stock_quantity.toString(),
        barcode: product.barcode || "",
        category_id: product.category_id || "",
        is_active: product.is_active,
        photo_url: product.photos?.[0] || "",
        hasSupplier: !!product.supplier_id,
        supplier_id: product.supplier_id || "",
        product_type: product.product_type || "unidade",
        hasStock: product.product_type === "servico" ? (product.stock_quantity > 0) : true,
        hasBarcode: product.product_type === "servico" ? !!product.barcode : true,
      });
    }

    setIsLoading(false);
  };

  const handleSave = async () => {
    if (isSaving) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!form.name.trim() || !form.price) {
      toast({ title: "Nome e preço são obrigatórios", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    const isService = form.product_type === "servico";

    const productData = {
      name: form.name,
      description: form.description || null,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      price: parseFloat(form.price),
      promotional_price: form.promotional_price ? parseFloat(form.promotional_price) : null,
      stock_quantity: (isService && !form.hasStock) ? 0 : (parseInt(form.stock_quantity) || 0),
      barcode: (isService && !form.hasBarcode) ? null : (form.barcode || null),
      photos: form.photo_url ? [form.photo_url] : null,
      category_id: form.category_id || null,
      supplier_id: form.hasSupplier && form.supplier_id ? form.supplier_id : null,
      is_active: form.is_active,
      user_id: user.id,
      product_type: form.product_type,
    };

    try {
      if (isEditing) {
        const { error } = await supabase.from("products").update(productData).eq("id", id);
        if (error) {
          toast({ title: "Erro ao atualizar produto", variant: "destructive" });
          return;
        }
        toast({ title: "Produto atualizado com sucesso" });
      } else {
        const { error } = await supabase.from("products").insert([productData]);
        if (error) {
          toast({ title: "Erro ao criar produto", variant: "destructive" });
          return;
        }
        toast({ title: "Produto criado com sucesso" });
      }
      clearPersisted();
      navigate("/produtos");
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
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/produtos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? "Editar Produto" : "Novo Produto"}
        </h1>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Produto *</Label>
            <Select value={form.product_type} onValueChange={(v: any) => setForm({ ...form, product_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unidade">Unidade</SelectItem>
                <SelectItem value="peso">Peso (kg)</SelectItem>
                <SelectItem value="servico">Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {form.product_type === "servico" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch checked={form.hasStock} onCheckedChange={(checked) => setForm({ ...form, hasStock: checked, stock_quantity: checked ? form.stock_quantity : "0" })} />
              <Label>Tem estoque?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={form.hasBarcode} onCheckedChange={(checked) => setForm({ ...form, hasBarcode: checked, barcode: checked ? form.barcode : "" })} />
              <Label>Tem código de barras?</Label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categories.filter(c => !c.parent_id).map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(form.product_type !== "servico" || form.hasStock) && (
            <div className="space-y-2">
              <Label>Estoque Atual *</Label>
              <Input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Preço de Custo</Label>
            <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Preço de Venda *</Label>
            <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Preço Promocional</Label>
          <Input type="number" step="0.01" value={form.promotional_price} onChange={(e) => setForm({ ...form, promotional_price: e.target.value })} />
        </div>

        {(form.product_type !== "servico" || form.hasBarcode) && (
          <div className="space-y-2">
            <Label>Código de Barras</Label>
            <div className="flex gap-2">
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="flex-1" />
              <Button type="button" variant="outline" size="icon" onClick={() => setIsBarcodeScannerOpen(true)}>
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch checked={form.hasSupplier} onCheckedChange={(checked) => setForm({ ...form, hasSupplier: checked, supplier_id: checked ? form.supplier_id : "" })} />
            <Label>Tem Fornecedor?</Label>
          </div>
          {form.hasSupplier && (
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <ImageUpload
          bucket="product-photos"
          currentImageUrl={form.photo_url}
          onImageUploaded={(url) => setForm({ ...form, photo_url: url })}
          label="Foto do Produto (opcional)"
        />

        <div className="flex items-center space-x-2">
          <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
          <Label>Produto Ativo</Label>
        </div>
      </div>

      <div className="flex gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate("/produtos")} disabled={isSaving} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <BarcodeScanner
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScan={(code) => {
          setForm({ ...form, barcode: code });
          setIsBarcodeScannerOpen(false);
        }}
      />
    </div>
  );
};

export default ProductForm;
