import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Minus, ShoppingCart, ArrowLeft, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/BarcodeScanner";

interface Product {
  id: string;
  name: string;
  price: number;
  promotional_price: number | null;
  stock_quantity: number;
  barcode: string | null;
  photos: string[] | null;
  product_type?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const POSProductSelect = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Load cart from sessionStorage
  useEffect(() => {
    const savedCart = sessionStorage.getItem("pos_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {}
    }
  }, []);

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel('products-select-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (!error) setProducts(data || []);
    setLoading(false);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (product.product_type !== 'servico' && existing.quantity >= product.stock_quantity) {
        toast({ title: "Estoque insuficiente", variant: "destructive" });
        return;
      }
      setCart(cart.map(item =>
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (item.product.product_type !== 'servico' && newQty > item.product.stock_quantity) {
          toast({ title: "Estoque insuficiente", variant: "destructive" });
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handleBarcodeScan = (barcode: string) => {
    const normalized = barcode.replace(/\s/g, "").trim();
    const product = products.find(p => {
      const pb = p.barcode?.replace(/\s/g, "").trim() || "";
      return pb === normalized || pb.includes(normalized);
    });
    if (product) {
      addToCart(product);
      toast({ title: "Produto adicionado", description: product.name });
    } else {
      toast({ title: "Produto não encontrado", description: `Código: ${barcode}`, variant: "destructive" });
    }
  };

  const getProductPreview = (barcode: string) => {
    const normalized = barcode.replace(/\s/g, "").trim();
    const product = products.find(p => {
      const pb = p.barcode?.replace(/\s/g, "").trim() || "";
      return pb === normalized || pb.includes(normalized);
    });
    return product ? { name: product.name, image: product.photos?.[0] } : null;
  };

  const handleConfirm = () => {
    sessionStorage.setItem("pos_cart", JSON.stringify(cart));
    navigate("/pdv", { state: { fromProductSelect: true } });
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
          <Button variant="ghost" size="icon" onClick={() => { sessionStorage.setItem("pos_cart", JSON.stringify(cart)); navigate("/pdv", { state: { fromProductSelect: true } }); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Selecionar Produtos</h1>
            <p className="text-sm text-muted-foreground">{totalItems} {totalItems === 1 ? 'item' : 'itens'} no carrinho</p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={() => setShowBarcodeScanner(true)}>
          <Camera className="h-5 w-5" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou código de barras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 text-lg"
        />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredProducts.map((product) => {
          const photoUrl = product.photos?.[0];
          const cartItem = cart.find(item => item.product.id === product.id);
          const inCart = !!cartItem;

          return (
            <Card
              key={product.id}
              className={`hover:border-primary hover:shadow-lg transition-all group relative ${inCart ? 'border-2 border-accent' : ''}`}
            >
              <CardContent className="p-3 space-y-2">
                {inCart && (
                  <div className="absolute top-2 right-2 bg-accent text-accent-foreground rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs shadow-lg z-10">
                    {cartItem?.quantity}
                  </div>
                )}
                {photoUrl ? (
                  <img src={photoUrl} alt={product.name} className="w-full h-24 md:h-32 object-cover rounded-lg" />
                ) : (
                  <div className="w-full h-24 md:h-32 bg-muted rounded-lg flex items-center justify-center">
                    <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <h3 className="font-semibold text-xs md:text-sm line-clamp-2 group-hover:text-primary">{product.name}</h3>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  {product.product_type === 'servico' ? 'Serviço' : `Estoque: ${product.stock_quantity}`}
                </p>
                <div className="space-y-1">
                  {product.promotional_price ? (
                    <>
                      <p className="text-[10px] md:text-xs line-through text-muted-foreground">R$ {product.price.toFixed(2)}</p>
                      <p className="text-base md:text-lg font-bold text-accent">R$ {product.promotional_price.toFixed(2)}</p>
                    </>
                  ) : (
                    <p className="text-base md:text-lg font-bold text-accent">R$ {product.price.toFixed(2)}</p>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  {inCart && (
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => {
                      if (cartItem && cartItem.quantity === 1) removeFromCart(product.id);
                      else updateQuantity(product.id, -1);
                    }}>
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="default" size="sm" className={`${inCart ? "flex-1" : "w-full"} h-8`} onClick={() => addToCart(product)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg text-muted-foreground">
            {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto disponível"}
          </p>
        </div>
      )}

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t z-30">
        <Button
          className="w-full h-14 text-lg bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent-hover"
          onClick={handleConfirm}
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          Continuar com {totalItems} {totalItems === 1 ? 'item' : 'itens'}
        </Button>
      </div>

      {/* Extra padding for fixed bottom bar */}
      <div className="h-20" />

      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleBarcodeScan}
        getProductPreview={getProductPreview}
      />
    </div>
  );
};

export default POSProductSelect;
