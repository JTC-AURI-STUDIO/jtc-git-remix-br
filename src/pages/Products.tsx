import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageLoader from "@/components/PageLoader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package, Search, MoreVertical, Download, Upload } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionBlocker from "@/components/SubscriptionBlocker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProductsSkeleton } from "@/components/skeletons";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number | null;
  promotional_price: number | null;
  stock_quantity: number;
  barcode: string | null;
  is_active: boolean;
  category_id: string | null;
  supplier_id: string | null;
}

interface Supplier {
  id: string;
  name: string;
}

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isActive, isExpired, isTrial, loading } = useSubscription();

  const [productForm, setProductForm] = useState({
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
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    parent_id: "",
  });

  const isMissingTableError = (error: any) =>
    error?.code === "PGRST205" || error?.code === "42P01";

  const fetchProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        setProducts([]);
        return;
      }
      toast({ title: "Erro ao carregar produtos", variant: "destructive" });
    } else {
      const mappedProducts: Product[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        cost_price: p.cost_price,
        promotional_price: p.promotional_price,
        stock_quantity: p.stock_quantity,
        barcode: p.barcode,
        is_active: p.is_active,
        category_id: p.category_id,
        supplier_id: p.supplier_id,
      }));
      setProducts(mappedProducts);
    }
  };

  const fetchCategories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      if (isMissingTableError(error)) {
        setCategories([]);
        return;
      }
      toast({ title: "Erro ao carregar categorias", variant: "destructive" });
    } else {
      setCategories(data || []);
    }
  };

  const fetchSuppliers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name")
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
    loadData();

    const channel = supabase
      .channel('products-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchProducts(), fetchCategories(), fetchSuppliers()]);
    setIsLoading(false);
  };

  // Bloquear se assinatura expirada
  if (!loading && isExpired) {
    return <SubscriptionBlocker isTrial={isTrial} />;
  }

  if (isLoading) {
    return (
      <PageLoader pageName="Produtos">
        <ProductsSkeleton />
      </PageLoader>
    );
  }

  const handleSaveProduct = async () => {
    if (isSavingProduct) return; // Evitar dupla submissão
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsSavingProduct(true);

    const productData = {
      name: productForm.name,
      description: productForm.description || null,
      cost_price: productForm.cost_price ? parseFloat(productForm.cost_price) : null,
      price: parseFloat(productForm.price),
      promotional_price: productForm.promotional_price ? parseFloat(productForm.promotional_price) : null,
      stock_quantity: parseInt(productForm.stock_quantity) || 0,
      barcode: productForm.barcode || null,
      photos: productForm.photo_url ? [productForm.photo_url] : null,
      category_id: productForm.category_id || null,
      supplier_id: productForm.hasSupplier && productForm.supplier_id ? productForm.supplier_id : null,
      is_active: productForm.is_active,
      user_id: user.id,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) {
          toast({ title: "Erro ao atualizar produto", variant: "destructive" });
        } else {
          toast({ title: "Produto atualizado com sucesso" });
          fetchProducts();
          resetProductForm();
        }
      } else {
        const { error } = await supabase.from("products").insert([productData]);

        if (error) {
          toast({ title: "Erro ao criar produto", variant: "destructive" });
        } else {
          toast({ title: "Produto criado com sucesso" });
          fetchProducts();
          resetProductForm();
        }
      }
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Primeiro, salvar o nome do produto nos itens de venda antes de deletar
    const productToDelete = products.find(p => p.id === id);
    if (productToDelete) {
      // Atualizar sale_items e purchase_items para salvar o nome do produto
      await supabase
        .from("sale_items")
        .update({ product_name: productToDelete.name })
        .eq("product_id", id);
      
      await supabase
        .from("purchase_items")
        .update({ product_name: productToDelete.name })
        .eq("product_id", id);
    }

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      console.error("Erro ao deletar produto:", error);
      toast({
        title: "Erro ao deletar produto",
        description: "Não foi possível excluir o produto. Tente novamente.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Produto deletado com sucesso" });
      fetchProducts();
    }
  };

  const handleSaveCategory = async () => {
    if (isSavingCategory) return; // Evitar dupla submissão
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsSavingCategory(true);

    const categoryData = {
      name: categoryForm.name,
      parent_id: categoryForm.parent_id || null,
      user_id: user.id,
    };

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", editingCategory.id);

        if (error) {
          toast({ title: "Erro ao atualizar categoria", variant: "destructive" });
        } else {
          toast({ title: "Categoria atualizada com sucesso" });
          fetchCategories();
          resetCategoryForm();
        }
      } else {
        const { error } = await supabase.from("categories").insert([categoryData]);

        if (error) {
          toast({ title: "Erro ao criar categoria", variant: "destructive" });
        } else {
          toast({ title: "Categoria criada com sucesso" });
          fetchCategories();
          resetCategoryForm();
        }
      }
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao deletar categoria", variant: "destructive" });
    } else {
      toast({ title: "Categoria deletada com sucesso" });
      fetchCategories();
    }
  };

  const resetProductForm = () => {
    setProductForm({
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
      product_type: "unidade",
    });
    setEditingProduct(null);
    setIsProductDialogOpen(false);
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", parent_id: "" });
    setEditingCategory(null);
    setIsCategoryDialogOpen(false);
  };

  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || "",
      cost_price: product.cost_price?.toString() || "",
      price: product.price.toString(),
      promotional_price: product.promotional_price?.toString() || "",
      stock_quantity: product.stock_quantity.toString(),
      barcode: product.barcode || "",
      category_id: product.category_id || "",
      is_active: product.is_active,
      photo_url: (product as any).photos?.[0] || "",
      hasSupplier: !!product.supplier_id,
      supplier_id: product.supplier_id || "",
      product_type: (product as any).product_type || "unidade",
    });
    setIsProductDialogOpen(true);
  };

  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      parent_id: category.parent_id || "",
    });
    setIsCategoryDialogOpen(true);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryName = (id: string | null) => {
    if (!id) return "-";
    return categories.find(c => c.id === id)?.name || "-";
  };

  const exportProductsToCSV = () => {
    setIsExporting(true);
    try {
      const headers = [
        "nome",
        "descricao",
        "preco_custo",
        "preco",
        "preco_promocional",
        "estoque",
        "codigo_barras",
        "categoria",
        "ativo"
      ];

      const csvRows = [headers.join(";")];

      products.forEach(product => {
        const categoryName = getCategoryName(product.category_id);
        const row = [
          product.name,
          product.description || "",
          product.cost_price?.toString().replace(".", ",") || "",
          product.price.toString().replace(".", ","),
          product.promotional_price?.toString().replace(".", ",") || "",
          product.stock_quantity.toString(),
          product.barcode || "",
          categoryName !== "-" ? categoryName : "",
          product.is_active ? "sim" : "nao"
        ];
        csvRows.push(row.map(field => `"${field}"`).join(";"));
      });

      const csvContent = "\uFEFF" + csvRows.join("\n"); // BOM for UTF-8
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `produtos_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: "Produtos exportados com sucesso!" });
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast({ title: "Erro ao exportar produtos", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const importProductsFromCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ title: "Arquivo vazio ou inválido", variant: "destructive" });
        return;
      }

      // Skip header row
      const dataLines = lines.slice(1);
      let imported = 0;
      let errors = 0;

      for (const line of dataLines) {
        try {
          // Parse CSV with quotes
          const fields = line.match(/("([^"]|"")*"|[^;]*)/g)?.map(f => 
            f.replace(/^"|"$/g, "").replace(/""/g, '"').trim()
          ) || [];

          if (fields.length < 3) continue;

          const [
            nome,
            descricao,
            precoCusto,
            preco,
            precoPromocional,
            estoque,
            codigoBarras,
            categoria,
            ativo
          ] = fields;

          // Find category by name
          let categoryId = null;
          if (categoria) {
            const cat = categories.find(c => c.name.toLowerCase() === categoria.toLowerCase());
            categoryId = cat?.id || null;
          }

          const productData = {
            name: nome,
            description: descricao || null,
            cost_price: precoCusto ? parseFloat(precoCusto.replace(",", ".")) : null,
            price: parseFloat(preco.replace(",", ".")) || 0,
            promotional_price: precoPromocional ? parseFloat(precoPromocional.replace(",", ".")) : null,
            stock_quantity: parseInt(estoque) || 0,
            barcode: codigoBarras || null,
            category_id: categoryId,
            is_active: ativo?.toLowerCase() !== "nao",
            user_id: user.id,
          };

          const { error } = await supabase.from("products").insert([productData]);
          
          if (error) {
            console.error("Erro ao importar produto:", error);
            errors++;
          } else {
            imported++;
          }
        } catch (err) {
          console.error("Erro ao processar linha:", err);
          errors++;
        }
      }

      fetchProducts();
      toast({ 
        title: `Importação concluída`, 
        description: `${imported} produtos importados${errors > 0 ? `, ${errors} erros` : ""}` 
      });
    
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast({ title: "Erro ao importar produtos", variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <PageLoader pageName="Produtos">
    <div className="p-6 space-y-6 overflow-hidden animate-fade-in">
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Produtos
          </h1>
          <p className="text-muted-foreground">Gerencie seus produtos e categorias</p>
        </div>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="products" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Produtos</TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código interno ou código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Import/Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting || isImporting}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportProductsToCSV} disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Exportando..." : "Exportar CSV"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? "Importando..." : "Importar CSV"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={importProductsFromCSV}
              className="hidden"
            />
            
            <Button onClick={() => navigate("/produtos/novo")} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:scale-[1.02]">
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[50%]">Nome</TableHead>
                  <TableHead className="text-xs w-[25%]">Preço</TableHead>
                  <TableHead className="text-xs text-right w-[25%]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      Nenhum produto cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium text-xs truncate">{product.name}</TableCell>
                      <TableCell className="text-xs">
                        {product.promotional_price ? (
                          <span className="text-accent font-semibold">
                            R$ {product.promotional_price.toFixed(2)}
                          </span>
                        ) : (
                          <span>R$ {product.price.toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/produtos/editar/${product.id}`)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteProduct(product.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetCategoryForm(); setIsCategoryDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria Pai (Subcategoria)</Label>
                    <Select
                      value={categoryForm.parent_id}
                      onValueChange={(value) => setCategoryForm({ ...categoryForm, parent_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhuma (Categoria principal)" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.filter(c => !c.parent_id).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetCategoryForm} disabled={isSavingCategory}>Cancelar</Button>
                  <Button onClick={handleSaveCategory} disabled={isSavingCategory}>
                    {isSavingCategory ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[30%]">Nome</TableHead>
                  <TableHead className="text-xs w-[50%]">Tipo</TableHead>
                  <TableHead className="text-xs text-right w-[20%]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Nenhuma categoria cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium text-xs truncate">{category.name}</TableCell>
                      <TableCell>
                        <Badge variant={category.parent_id ? "secondary" : "default"} className="text-[10px] truncate max-w-full">
                          {category.parent_id ? `Sub: ${getCategoryName(category.parent_id)}` : "Principal"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditCategory(category)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCategory(category.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </PageLoader>
  );
};

export default Products;
