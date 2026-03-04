import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Minus, Trash2, DollarSign, ShoppingCart, ArrowRight, Download, FileText, X, User, QrCode, CheckCircle, Camera, Mail, Printer, XCircle, Clock, RefreshCw, Copy, ArrowUp, ArrowDown, Percent } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Imagens dos métodos de pagamento
import paymentCredit from "@/assets/payment-credit.jpg";
import paymentDebit from "@/assets/payment-debit.jpg";
import paymentPix from "@/assets/payment-pix.png";
import paymentCash from "@/assets/payment-cash.png";
import paymentFiado from "@/assets/payment-fiado.png";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionBlocker from "@/components/SubscriptionBlocker";
import jsPDF from "jspdf";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import PageLoader from "@/components/PageLoader";
import { POSSkeleton } from "@/components/skeletons";

interface Product {
  id: string;
  name: string;
  price: number;
  promotional_price: number | null;
  stock_quantity: number;
  internal_code: string | null;
  barcode: string | null;
  photos: string[] | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface PaymentEntry {
  method: string;
  amount: number;
}

interface SaleData {
  id: string;
  total_amount: number;
  discount: number;
  payment_method: string;
  created_at: string;
  customer_name?: string;
  credit_used?: number;
  remaining_payment_method?: string;
  remaining_amount?: number;
  change_amount?: number;
  payments?: PaymentEntry[];
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

interface Customer {
  id: string;
  name: string;
  cpf: string;
  current_balance: number;
}

interface PixSettings {
  pix_key_type: string | null;
  pix_key: string | null;
  pix_receiver_name: string | null;
  pix_mode: string | null;
}

const POS = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerBrowser, setShowCustomerBrowser] = useState(false);
  const [currentStep, setCurrentStep] = useState<"cart" | "payment" | "receipt">("cart");
  const [saleData, setSaleData] = useState<SaleData | null>(null);
  const [showFullscreenBrowser, setShowFullscreenBrowser] = useState(false);
  const [storeName, setStoreName] = useState("Loja");
  const [pixSettings, setPixSettings] = useState<PixSettings | null>(null);
  const [showPixQrCode, setShowPixQrCode] = useState(false);
  const [pixPaymentLoading, setPixPaymentLoading] = useState(false);
  const [pixQrCodeImage, setPixQrCodeImage] = useState<string | null>(null);
  const [pixCopyPaste, setPixCopyPaste] = useState<string | null>(null);
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);
  const [pixPaymentStatus, setPixPaymentStatus] = useState<"waiting" | "approved" | "expired">("waiting");
  const [pixTimeRemaining, setPixTimeRemaining] = useState(300); // 5 minutos em segundos
  const [pixPaymentAmount, setPixPaymentAmount] = useState(0);
  const [pixManualConfirmed, setPixManualConfirmed] = useState(false); // Novo: PIX manual confirmado
  const pixPollingRef = useRef<NodeJS.Timeout | null>(null);
  const pixCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailToSend, setEmailToSend] = useState("");
  
  // Estados para pagamento múltiplo
  const [paymentMode, setPaymentMode] = useState<"single" | "multiple" | null>(null);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState("");
  const [printerWidth, setPrinterWidth] = useState<"80mm" | "58mm">("80mm");
  
  // Estados para taxa PIX
  const [showPixFeeDialog, setShowPixFeeDialog] = useState(false);
  const [pixPassFeeToCustomer, setPixPassFeeToCustomer] = useState<boolean | null>(null);
  const [pixOriginalAmount, setPixOriginalAmount] = useState(0);
  const [pixFinalAmount, setPixFinalAmount] = useState(0);
  const [pixFeeAmount, setPixFeeAmount] = useState(0);
  const [pixYouReceive, setPixYouReceive] = useState(0);
  
  // Estado para alerta de voltar após PIX aprovado
  const [showBackWarningDialog, setShowBackWarningDialog] = useState(false);
  
  const { toast } = useToast();
  const { isActive, isExpired, isTrial, loading } = useSubscription();

  const isMissingTableError = (error: any) =>
    error?.code === "PGRST205" || error?.code === "42P01";

  const fetchProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProductsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (error) {
      if (isMissingTableError(error)) {
        setProducts([]);
      } else {
        toast({ title: "Erro ao carregar produtos", variant: "destructive" });
      }
    } else {
      setProducts(data || []);
    }
    setProductsLoading(false);
  };

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
    } else {
      setCustomers(data || []);
    }
  };

  const fetchStoreName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("store_settings")
      .select("store_name, pix_key_type, pix_key, pix_receiver_name, logo_url, pix_mode, mercado_pago_cpf, mercado_pago_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data?.store_name) {
      setStoreName(data.store_name);
    }
    
    if (data?.logo_url) {
      setLogoUrl(data.logo_url);
    }
    
    // Verificar se PIX está configurado (manual OU automático)
    const isManualConfigured = (!data?.pix_mode || data?.pix_mode === 'manual') && data?.pix_key && data?.pix_receiver_name;
    const isAutomaticConfigured = data?.pix_mode === 'automatic' && data?.mercado_pago_cpf && data?.mercado_pago_name;
    
    if (isManualConfigured || isAutomaticConfigured) {
      setPixSettings({
        pix_key_type: data.pix_key_type,
        pix_key: data.pix_key,
        pix_receiver_name: data.pix_receiver_name,
        pix_mode: data.pix_mode || 'manual',
      });
    }
  };

  // Função para tocar som de notificação
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Som de sucesso (2 beeps)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscillator.start(audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.stop(audioContext.currentTime + 0.2);
      
      // Segundo beep
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        oscillator2.frequency.setValueAtTime(1000, audioContext.currentTime);
        gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
        
        oscillator2.start(audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator2.stop(audioContext.currentTime + 0.3);
      }, 200);
    } catch (error) {
      console.log('Erro ao tocar som:', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchStoreName();
    fetchCustomers();

    // Realtime: atualizar produtos automaticamente
    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load cart from sessionStorage (when returning from product select page)
  const location = useLocation();
  useEffect(() => {
    if ((location.state as any)?.fromProductSelect) {
      const savedCart = sessionStorage.getItem("pos_cart");
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch {}
      }
    }
    if ((location.state as any)?.fromCustomerSelect) {
      const savedCustomer = sessionStorage.getItem("pos_selected_customer");
      if (savedCustomer) {
        try {
          setSelectedCustomer(JSON.parse(savedCustomer));
          setPaymentMethod("fiado");
        } catch {}
      }
    }
  }, [location.state]);


  // Gerar payload PIX (formato EMV)
  const generatePixPayload = (amount: number): string => {
    if (!pixSettings?.pix_key || !pixSettings?.pix_receiver_name) return "";
    
    const formatField = (id: string, value: string): string => {
      const len = value.length.toString().padStart(2, '0');
      return `${id}${len}${value}`;
    };

    // Payload Format Indicator
    let payload = formatField("00", "01");
    
    // Merchant Account Information (PIX)
    const gui = formatField("00", "BR.GOV.BCB.PIX");
    const key = formatField("01", pixSettings.pix_key);
    const merchantAccountInfo = `${gui}${key}`;
    payload += formatField("26", merchantAccountInfo);
    
    // Merchant Category Code
    payload += formatField("52", "0000");
    
    // Transaction Currency (BRL = 986)
    payload += formatField("53", "986");
    
    // Transaction Amount
    payload += formatField("54", amount.toFixed(2));
    
    // Country Code
    payload += formatField("58", "BR");
    
    // Merchant Name
    const merchantName = pixSettings.pix_receiver_name.substring(0, 25);
    payload += formatField("59", merchantName);
    
    // Merchant City
    payload += formatField("60", "CIDADE");
    
    // CRC16 placeholder
    payload += "6304";
    
    // Calculate CRC16
    const crc = calculateCRC16(payload);
    payload = payload.slice(0, -4) + formatField("63", crc);
    
    return payload;
  };

  // Cálculo CRC16-CCITT-FALSE
  const calculateCRC16 = (str: string): string => {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  };

  // Limpar polling e countdown ao fechar diálogo
  const cleanupPixTimers = useCallback(() => {
    if (pixPollingRef.current) {
      clearInterval(pixPollingRef.current);
      pixPollingRef.current = null;
    }
    if (pixCountdownRef.current) {
      clearInterval(pixCountdownRef.current);
      pixCountdownRef.current = null;
    }
  }, []);

  // Verificar status do pagamento PIX
  const checkPixPaymentStatus = useCallback(async (paymentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-store-payment-status', {
        body: { paymentId },
      });

      if (error) {
        console.error('Erro ao verificar status do pagamento:', error);
        return;
      }

      if (data?.status === 'approved') {
        setPixPaymentStatus('approved');
        cleanupPixTimers();
        
        // Tocar som de notificação
        playNotificationSound();
        
        // Adicionar pagamento automaticamente
        if (paymentMode === "multiple") {
          setPayments(prev => [...prev, { method: "pix", amount: pixPaymentAmount }]);
          setCurrentPaymentAmount("");
        }
        
        toast({ title: "Pagamento PIX confirmado!" });
        
        // Fechar diálogo após 2 segundos
        setTimeout(() => {
          setShowPixQrCode(false);
          setPaymentMethod(paymentMode === "multiple" ? "" : "pix");
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  }, [paymentMode, pixPaymentAmount, cleanupPixTimers, toast, playNotificationSound]);

  // Iniciar polling e countdown para PIX automático
  const startPixAutomaticFlow = useCallback((paymentId: string, amount: number) => {
    setPixPaymentId(paymentId);
    setPixPaymentStatus('waiting');
    setPixTimeRemaining(300); // 5 minutos
    setPixPaymentAmount(amount);

    // Polling a cada 3 segundos para verificar status
    pixPollingRef.current = setInterval(() => {
      checkPixPaymentStatus(paymentId);
    }, 3000);

    // Countdown de 1 em 1 segundo
    pixCountdownRef.current = setInterval(() => {
      setPixTimeRemaining(prev => {
        if (prev <= 1) {
          cleanupPixTimers();
          setPixPaymentStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [checkPixPaymentStatus, cleanupPixTimers]);

  const PIX_FEE_RATE = 0.0049; // 0.49%

  // Função para abrir diálogo de taxa antes do PIX automático
  const showPixFeeQuestion = (amount: number) => {
    if (!pixSettings) {
      toast({
        title: "PIX não configurado",
        description: "Configure sua chave PIX nas Configurações para aceitar pagamentos via PIX.",
        variant: "destructive",
      });
      return;
    }

    // Para PIX automático, mostrar pergunta sobre taxa
    if (pixSettings.pix_mode === 'automatic') {
      // Calculate fee - round UP to match Mercado Pago behavior (minimum 1 centavo)
      const rawFee = amount * PIX_FEE_RATE;
      const fee = amount > 0 ? Math.max(0.01, Math.ceil(rawFee * 100) / 100) : 0;
      setPixOriginalAmount(amount);
      setPixFeeAmount(fee);
      setPixPassFeeToCustomer(null);
      setPixFinalAmount(amount);
      setPixYouReceive(amount - fee);
      setShowPixFeeDialog(true);
    } else {
      // PIX manual: abrir diretamente
      openPixDialog(amount, false, amount);
    }
  };

  // Confirmar taxa e gerar QR Code
  const confirmPixFeeAndGenerate = () => {
    const passToCustomer = pixPassFeeToCustomer === true;
    const finalAmount = passToCustomer ? pixOriginalAmount + pixFeeAmount : pixOriginalAmount;
    const youReceive = passToCustomer ? pixOriginalAmount : pixOriginalAmount - pixFeeAmount;
    
    setPixFinalAmount(finalAmount);
    setPixYouReceive(youReceive);
    setShowPixFeeDialog(false);
    
    openPixDialog(finalAmount, passToCustomer, pixOriginalAmount);
  };

  const openPixDialog = async (amount: number, passedFeeToCustomer: boolean = false, originalAmount: number = 0) => {
    if (!pixSettings) {
      toast({
        title: "PIX não configurado",
        description: "Configure sua chave PIX nas Configurações para aceitar pagamentos via PIX.",
        variant: "destructive",
      });
      return;
    }

    // Limpar timers anteriores
    cleanupPixTimers();
    setPixPaymentStatus('waiting');
    setPixTimeRemaining(300);
    setPixPaymentId(null);

    if (pixSettings.pix_mode === 'automatic') {
      try {
        setPixPaymentLoading(true);
        setShowPixQrCode(true);
        setPixQrCodeImage(null);
        setPixCopyPaste(null);
        setPixPaymentAmount(amount);

        const { data, error } = await supabase.functions.invoke('create-store-pix-payment', {
          body: {
            amount,
            saleId: `pdv-sale-${Date.now()}`,
          },
        });

        if (error || !data?.success) {
          console.error('Erro ao criar pagamento PIX automático', error || data);
          toast({
            title: "Erro ao gerar QR Code PIX",
            description: data?.details || "Verifique as configurações do Mercado Pago.",
            variant: "destructive",
          });
          setShowPixQrCode(false);
          return;
        }

        const qrCodeBase64 = (data as any).qrCodeBase64 as string | undefined;
        const qrCode = (data as any).qrCode as string | undefined;
        const copyPaste = (data as any).pixCopyPaste as string | undefined;
        const paymentId = (data as any).paymentId as string;

        if (qrCodeBase64) {
          setPixQrCodeImage(`data:image/png;base64,${qrCodeBase64}`);
        } else if (qrCode) {
          setPixQrCodeImage(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`);
        }
        
        if (copyPaste) {
          setPixCopyPaste(copyPaste);
        }

        // Iniciar fluxo automático com polling e countdown
        if (paymentId) {
          startPixAutomaticFlow(paymentId, amount);
        }
      } catch (error) {
        console.error('Erro ao gerar QR Code PIX automático', error);
        toast({
          title: "Erro ao gerar QR Code PIX",
          description: "Tente novamente em alguns instantes.",
          variant: "destructive",
        });
        setShowPixQrCode(false);
      } finally {
        setPixPaymentLoading(false);
      }
    } else {
      // PIX manual: apenas abre o diálogo que usa o payload EMV atual
      setPixPaymentLoading(false);
      setPixQrCodeImage(null);
      setShowPixQrCode(true);
    }
  };

  // Gerar novo QR Code PIX (após expiração)
  const regeneratePixQrCode = async () => {
    const amount = paymentMode === "multiple" 
      ? (parseFloat(currentPaymentAmount) || remainingToPay) 
      : total;
    // Para regenerar, usa o mesmo valor que já foi calculado (pixFinalAmount se disponível)
    if (pixSettings?.pix_mode === 'automatic' && pixFinalAmount > 0) {
      await openPixDialog(pixFinalAmount, pixPassFeeToCustomer === true, pixOriginalAmount);
    } else {
      await openPixDialog(amount, false, amount);
    }
  };

  // Limpar timers ao fechar diálogo
  useEffect(() => {
    if (!showPixQrCode) {
      cleanupPixTimers();
    }
  }, [showPixQrCode, cleanupPixTimers]);

  // Limpar timers ao desmontar componente
  useEffect(() => {
    return () => {
      cleanupPixTimers();
    };
  }, [cleanupPixTimers]);

  // Formatar tempo restante
  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePixPayment = () => {
    // Verificar se PIX está configurado (manual OU automático)
    const isManualConfigured = (!pixSettings?.pix_mode || pixSettings?.pix_mode === 'manual') && pixSettings?.pix_key && pixSettings?.pix_receiver_name;
    const isAutomaticConfigured = pixSettings?.pix_mode === 'automatic';
    
    if (!isManualConfigured && !isAutomaticConfigured) {
      toast({ 
        title: "PIX não configurado", 
        description: "Configure sua chave PIX nas Configurações para aceitar pagamentos via PIX.",
        variant: "destructive" 
      });
      return;
    }
    setPaymentMethod("pix");
    showPixFeeQuestion(total);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.internal_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast({ title: "Estoque insuficiente", variant: "destructive" });
        return;
      }
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    setSearchTerm("");
  };

  const handleBarcodeScan = (barcode: string) => {
    // Verificar se os produtos já foram carregados
    if (productsLoading) {
      toast({ 
        title: "Aguarde", 
        description: "Carregando produtos...",
      });
      return;
    }

    if (products.length === 0) {
      toast({ 
        title: "Nenhum produto disponível", 
        description: "Cadastre produtos com estoque disponível.",
        variant: "destructive" 
      });
      return;
    }

    // Normalizar o código lido (remover espaços)
    const normalizedBarcode = barcode.replace(/\s/g, "").trim();
    
    const product = products.find(p => {
      // Normalizar os códigos do produto também
      const productBarcode = p.barcode?.replace(/\s/g, "").trim() || "";
      const productInternalCode = p.internal_code?.replace(/\s/g, "").trim() || "";
      
      return productBarcode === normalizedBarcode || 
             productInternalCode === normalizedBarcode ||
             // Também verificar se contém (para códigos parciais)
             (productBarcode && productBarcode.includes(normalizedBarcode)) ||
             (productInternalCode && productInternalCode.includes(normalizedBarcode));
    });
    
    if (product) {
      addToCart(product);
      toast({ title: "Produto adicionado", description: product.name });
    } else {
      toast({ 
        title: "Produto não encontrado", 
        description: `Código: ${barcode}`,
        variant: "destructive" 
      });
    }
  };

  // Função para buscar preview do produto pelo código de barras
  const getProductPreview = (barcode: string) => {
    const normalizedBarcode = barcode.replace(/\s/g, "").trim();
    
    const product = products.find(p => {
      const productBarcode = p.barcode?.replace(/\s/g, "").trim() || "";
      const productInternalCode = p.internal_code?.replace(/\s/g, "").trim() || "";
      
      return productBarcode === normalizedBarcode || 
             productInternalCode === normalizedBarcode ||
             (productBarcode && productBarcode.includes(normalizedBarcode)) ||
             (productInternalCode && productInternalCode.includes(normalizedBarcode));
    });
    
    if (product) {
      return {
        name: product.name,
        image: product.photos?.[0] || undefined
      };
    }
    return null;
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) return item;
        if (newQuantity > item.product.stock_quantity) {
          toast({ title: "Estoque insuficiente", variant: "destructive" });
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const getItemPrice = (item: CartItem) => {
    const price = item.product.promotional_price || item.product.price;
    return price * item.quantity;
  };

  const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item), 0);
  const total = subtotal - discount;

  const goToPayment = () => {
    if (cart.length === 0) {
      toast({ title: "Carrinho vazio", description: "Adicione produtos ao carrinho primeiro", variant: "destructive" });
      return;
    }
    setPaymentMode(null);
    setPayments([]);
    setCurrentPaymentAmount("");
    setPaymentMethod("");
    setPixManualConfirmed(false); // Resetar confirmação do PIX manual
    setCurrentStep("payment");
  };

  // Calcular total pago e restante para pagamento múltiplo
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingToPay = total - totalPaid;
  const changeAmount = totalPaid > total ? totalPaid - total : 0;

  // Adicionar pagamento no modo múltiplo
  const addPayment = () => {
    if (!paymentMethod) {
      toast({ title: "Selecione uma forma de pagamento", variant: "destructive" });
      return;
    }
    const amount = parseFloat(currentPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Digite um valor válido", variant: "destructive" });
      return;
    }
    if (paymentMethod === "fiado" && !selectedCustomer) {
      toast({ 
        title: "Cliente não selecionado", 
        description: "Selecione um cliente para pagamento fiado",
        variant: "destructive" 
      });
      return;
    }
    setPayments([...payments, { method: paymentMethod, amount }]);
    setCurrentPaymentAmount("");
    setPaymentMethod("");
  };

  // Remover pagamento
  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const generateSaleId = (saleNumber: number) => {
    const firstLetter = storeName.charAt(0).toUpperCase();
    const lastLetter = storeName.charAt(storeName.length - 1).toUpperCase();
    const paddedNumber = String(saleNumber).padStart(6, '0');
    return `${firstLetter}${lastLetter}-${paddedNumber}`;
  };

  const finalizeSale = async () => {
    if (isProcessingSale) return;
    
    // Validações para pagamento único
    if (paymentMode === "single") {
      if (!paymentMethod) {
        toast({ title: "Selecione a forma de pagamento", variant: "destructive" });
        return;
      }
      if (paymentMethod === "fiado" && !selectedCustomer) {
        toast({ 
          title: "Cliente não selecionado", 
          description: "Por favor, selecione um cliente para venda a prazo",
          variant: "destructive" 
        });
        return;
      }
    }
    
    // Validações para pagamento múltiplo
    if (paymentMode === "multiple") {
      if (payments.length === 0) {
        toast({ title: "Adicione pelo menos uma forma de pagamento", variant: "destructive" });
        return;
      }
      if (totalPaid < total) {
        toast({ 
          title: "Valor insuficiente", 
          description: `Faltam R$ ${remainingToPay.toFixed(2)} para completar o pagamento`,
          variant: "destructive" 
        });
        return;
      }
      // Verificar se há pagamento fiado sem cliente selecionado
      const hasFiado = payments.some(p => p.method === "fiado");
      if (hasFiado && !selectedCustomer) {
        toast({ 
          title: "Cliente não selecionado", 
          description: "Selecione um cliente para pagamento fiado",
          variant: "destructive" 
        });
        return;
      }
    }

    if (!paymentMode) {
      toast({ title: "Selecione o tipo de pagamento", variant: "destructive" });
      return;
    }

    setIsProcessingSale(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obter o número da última venda para gerar o ID
      const { count } = await supabase
        .from("sales")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id);

      const saleNumber = (count || 0) + 1;
      const customSaleId = generateSaleId(saleNumber);

      // Determinar forma de pagamento final
      let finalPaymentMethod = paymentMethod;
      let finalPaymentStatus = "paid";
      let creditUsed = 0;
      let calculatedChange = 0;
      
      if (paymentMode === "multiple") {
        // Para pagamento múltiplo, usar "multiplo" como valor do banco
        finalPaymentMethod = "multiplo";
        calculatedChange = changeAmount;
        // Se tiver fiado, é pending
        if (payments.some(p => p.method === "fiado")) {
          finalPaymentStatus = "pending";
        }
      } else {
        // Pagamento único
        if (paymentMethod === "fiado") {
          finalPaymentStatus = "pending";
        }
        // Verificar se cliente tem crédito disponível
        if (selectedCustomer && selectedCustomer.current_balance > 0) {
          creditUsed = Math.min(selectedCustomer.current_balance, total);
          const remainingAfterCredit = total - creditUsed;
          
          // Se o crédito cobriu tudo
          if (remainingAfterCredit === 0) {
            finalPaymentMethod = "credito";
          }
        }
      }

      // Criar venda
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert([{
          user_id: user.id,
          total_amount: total,
          discount: discount,
          payment_method: finalPaymentMethod,
          customer_id: selectedCustomer?.id || null,
          payment_status: finalPaymentStatus,
        }])
        .select()
        .single();

      if (saleError) {
        console.error("Erro ao criar venda:", saleError);
        toast({ 
          title: "Erro ao finalizar venda", 
          description: saleError.message,
          variant: "destructive" 
        });
        return;
      }

      // Criar itens da venda
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.promotional_price || item.product.price,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) {
        console.error("Erro ao criar itens:", itemsError);
        toast({ 
          title: "Erro ao registrar itens", 
          description: itemsError.message,
          variant: "destructive" 
        });
        return;
      }

      // Atualizar estoque
      for (const item of cart) {
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock_quantity: item.product.stock_quantity - item.quantity })
          .eq("id", item.product.id);

        if (stockError) {
          console.error("Erro ao atualizar estoque:", stockError);
        }
      }

      // Calcular valor restante após crédito (para pagamento único)
      const remainingAfterCredit = paymentMode === "single" ? total - creditUsed : total;

      // Processar pagamento com crédito e/ou outras formas
      if (selectedCustomer && paymentMode === "single") {
        if (creditUsed > 0) {
          // Descontar crédito do cliente
          const newBalance = selectedCustomer.current_balance - creditUsed;
          
          const { error: balanceError } = await supabase
            .from("customers")
            .update({ current_balance: newBalance })
            .eq("id", selectedCustomer.id);

          if (balanceError) {
            console.error("Erro ao atualizar saldo:", balanceError);
            toast({ 
              title: "Erro ao atualizar crédito do cliente", 
              description: balanceError.message,
              variant: "destructive" 
            });
            return;
          }

          // Registrar transação de uso de crédito
          const { error: creditTransactionError } = await supabase
            .from("customer_transactions")
            .insert({
              customer_id: selectedCustomer.id,
              user_id: user.id,
              type: "payment",
              amount: creditUsed,
              description: `Crédito usado - Venda ${customSaleId}`,
            });

          if (creditTransactionError) {
            console.error("Erro ao criar transação de crédito:", creditTransactionError);
          }
        }

        // Se ainda resta valor e é fiado, adicionar dívida
        if (remainingAfterCredit > 0 && paymentMethod === "fiado") {
          const currentBalance = selectedCustomer.current_balance - creditUsed;
          const newBalance = currentBalance - remainingAfterCredit;
          
          const { error: balanceError } = await supabase
            .from("customers")
            .update({ current_balance: newBalance })
            .eq("id", selectedCustomer.id);

          if (balanceError) {
            console.error("Erro ao atualizar saldo:", balanceError);
            toast({ 
              title: "Erro ao atualizar saldo do cliente", 
              description: balanceError.message,
              variant: "destructive" 
            });
            return;
          }

          const { error: transactionError } = await supabase
            .from("customer_transactions")
            .insert({
              customer_id: selectedCustomer.id,
              user_id: user.id,
              type: "debt",
              amount: remainingAfterCredit,
              description: `Compra a prazo - Venda ${customSaleId}`,
            });

          if (transactionError) {
            console.error("Erro ao criar transação:", transactionError);
            toast({ 
              title: "Erro ao registrar transação", 
              description: transactionError.message,
              variant: "destructive" 
            });
            return;
          }
        }
      }

      // Processar pagamento múltiplo com fiado
      if (paymentMode === "multiple" && selectedCustomer) {
        const fiadoPayment = payments.find(p => p.method === "fiado");
        if (fiadoPayment) {
          const newBalance = selectedCustomer.current_balance - fiadoPayment.amount;
          
          await supabase
            .from("customers")
            .update({ current_balance: newBalance })
            .eq("id", selectedCustomer.id);

          await supabase
            .from("customer_transactions")
            .insert({
              customer_id: selectedCustomer.id,
              user_id: user.id,
              type: "debt",
              amount: fiadoPayment.amount,
              description: `Compra a prazo - Venda ${customSaleId}`,
            });
        }
      }

      // Preparar dados do comprovante
      setSaleData({
        id: customSaleId,
        total_amount: total,
        discount: discount,
        payment_method: finalPaymentMethod,
        created_at: sale.created_at,
        customer_name: selectedCustomer?.name,
        credit_used: creditUsed > 0 ? creditUsed : undefined,
        remaining_payment_method: paymentMode === "single" && creditUsed > 0 && remainingAfterCredit > 0 ? paymentMethod : undefined,
        remaining_amount: paymentMode === "single" && creditUsed > 0 && remainingAfterCredit > 0 ? remainingAfterCredit : undefined,
        change_amount: calculatedChange > 0 ? calculatedChange : undefined,
        payments: paymentMode === "multiple" ? payments : undefined,
        items: cart.map(item => ({
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.promotional_price || item.product.price,
        })),
      });

      setCurrentStep("receipt");
      toast({ title: "Venda finalizada com sucesso!" });
    } catch (error) {
      console.error("Erro geral ao finalizar venda:", error);
      toast({ 
        title: "Erro ao finalizar venda", 
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive" 
      });
    } finally {
      setIsProcessingSale(false);
    }
  };

  const downloadReceipt = async (format: "pdf" | "txt") => {
    if (!saleData) return;

    if (format === "txt") {
      const content = generateReceiptContent(saleData);
      const blob = new Blob([content], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comprovante-${saleData.id}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Comprovante TXT baixado!" });
    } else {
      await generatePDF(saleData);
      toast({ title: "Comprovante PDF baixado!" });
    }
  };

  const openEmailDialog = () => {
    setEmailToSend("");
    setShowEmailDialog(true);
  };

  const handleSendEmail = async () => {
    if (!saleData || !emailToSend) {
      toast({ title: "Digite o e-mail do cliente", variant: "destructive" });
      return;
    }

    const paymentMethodLabels: Record<string, string> = {
      credit: "Cartão de Crédito",
      debit: "Cartão de Débito",
      pix: "PIX",
      cash: "Dinheiro",
      fiado: "Fiado (A Prazo)",
      credito: "Crédito do Cliente",
    };

    const saleDate = format(new Date(saleData.created_at), "dd/MM/yyyy 'às' HH:mm");
    const subject = encodeURIComponent(`Comprovante de Venda - ${storeName} - ${saleDate}`);
    
    let body = `Olá${saleData.customer_name ? ` ${saleData.customer_name}` : ""},\n\n`;
    body += `Segue o comprovante da sua compra realizada em ${storeName}.\n\n`;
    body += `Data: ${saleDate}\n`;
    body += `ID da Venda: ${saleData.id}\n`;
    
    if (saleData.credit_used && saleData.remaining_amount) {
      body += `Formas de Pagamento:\n`;
      body += `  - Crédito: R$ ${saleData.credit_used.toFixed(2)}\n`;
      body += `  - ${paymentMethodLabels[saleData.remaining_payment_method || ""] || saleData.remaining_payment_method}: R$ ${saleData.remaining_amount.toFixed(2)}\n\n`;
    } else if (saleData.credit_used) {
      body += `Forma de Pagamento: Crédito do Cliente\n\n`;
    } else {
      body += `Forma de Pagamento: ${paymentMethodLabels[saleData.payment_method] || saleData.payment_method}\n\n`;
    }

    body += `ITENS:\n`;
    body += `----------------------------------------\n`;
    
    saleData.items.forEach(item => {
      body += `${item.product_name}\n`;
      body += `  ${item.quantity}x R$ ${item.unit_price.toFixed(2)} = R$ ${(item.quantity * item.unit_price).toFixed(2)}\n`;
    });
    
    const subtotal = saleData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    body += `----------------------------------------\n`;
    body += `Subtotal: R$ ${subtotal.toFixed(2)}\n`;
    if (saleData.discount > 0) {
      body += `Desconto: R$ ${saleData.discount.toFixed(2)}\n`;
    }
    body += `TOTAL: R$ ${saleData.total_amount.toFixed(2)}\n\n`;
    body += `Obrigado pela preferência!\n`;
    body += `${storeName}`;

    // Registrar na caixa de correios como enviado
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('email_logs').insert({
          user_id: user.id,
          sale_id: saleData.id,
          customer_email: emailToSend,
          sender_email: user.email || '',
          subject: `Comprovante de Venda - ${storeName} - ${saleDate}`,
          document_type: 'comprovante',
          status: 'enviado',
          sent_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Erro ao registrar e-mail:', error);
    }

    const encodedBody = encodeURIComponent(body);
    const mailtoLink = `mailto:${emailToSend}?subject=${subject}&body=${encodedBody}`;
    
    setShowEmailDialog(false);
    setEmailToSend("");
    toast({ title: "Abrindo cliente de e-mail..." });
    
    // Abrir o cliente de e-mail
    window.open(mailtoLink, '_blank');
  };

  const printThermalReceipt = () => {
    if (!saleData) return;

    const paymentMethodLabels: Record<string, string> = {
      credit: "Cartão de Crédito",
      debit: "Cartão de Débito",
      pix: "PIX",
      cash: "Dinheiro",
      fiado: "Fiado (A Prazo)",
      credito: "Crédito do Cliente",
    };

    const saleDate = format(new Date(saleData.created_at), "dd/MM/yyyy HH:mm");
    const subtotal = saleData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    // Gerar info de pagamento
    let paymentInfo = "";
    let paymentLabel = "Pagamento:";
    if (saleData.payments && saleData.payments.length > 0) {
      // Pagamento múltiplo
      paymentLabel = "MÚLTIPLOS PAGAMENTOS:";
      paymentInfo = saleData.payments.map(p => 
        `${paymentMethodLabels[p.method] || p.method}: R$ ${p.amount.toFixed(2)}`
      ).join("<br>");
    } else if (saleData.credit_used && saleData.remaining_amount) {
      paymentInfo = `Crédito: R$ ${saleData.credit_used.toFixed(2)}<br>${paymentMethodLabels[saleData.remaining_payment_method || ""] || saleData.remaining_payment_method}: R$ ${saleData.remaining_amount.toFixed(2)}`;
    } else if (saleData.credit_used) {
      paymentInfo = "Crédito do Cliente";
    } else {
      paymentInfo = paymentMethodLabels[saleData.payment_method] || saleData.payment_method;
    }

    // Configurações baseadas no tamanho da impressora
    const width = printerWidth;
    const fontSize = printerWidth === "58mm" ? "10px" : "12px";
    const storeNameSize = printerWidth === "58mm" ? "14px" : "16px";
    const totalSize = printerWidth === "58mm" ? "12px" : "14px";
    const padding = printerWidth === "58mm" ? "3mm" : "5mm";

    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (!printWindow) {
      toast({ title: "Erro ao abrir janela de impressão", variant: "destructive" });
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Comprovante</title>
        <style>
          @page { margin: 0; size: ${width} auto; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: ${fontSize}; 
            width: ${width}; 
            padding: ${padding};
            line-height: 1.3;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .item { display: flex; justify-content: space-between; margin: 3px 0; }
          .item-name { flex: 1; }
          .item-price { text-align: right; min-width: 60px; }
          .total-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .store-name { font-size: ${storeNameSize}; font-weight: bold; margin-bottom: 4px; }
          .change { background: #f0f0f0; padding: 5px; margin: 5px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center store-name">${storeName}</div>
        <div class="center">COMPROVANTE DE VENDA</div>
        <div class="divider"></div>
        
        <div>Data: ${saleDate}</div>
        <div>ID: ${saleData.id}</div>
        ${saleData.customer_name ? `<div class="bold">Cliente: ${saleData.customer_name}</div>` : ""}
        
        <div class="divider"></div>
        <div class="center bold">ITENS</div>
        <div class="divider"></div>
        
        ${saleData.items.map(item => `
          <div style="font-size: ${printerWidth === "58mm" ? "9px" : "11px"};">${item.product_name}</div>
          <div class="item">
            <span>${item.quantity}x R$ ${item.unit_price.toFixed(2)}</span>
            <span class="item-price">R$ ${(item.quantity * item.unit_price).toFixed(2)}</span>
          </div>
        `).join("")}
        
        <div class="divider"></div>
        
        <div class="total-row">
          <span>Subtotal:</span>
          <span>R$ ${subtotal.toFixed(2)}</span>
        </div>
        ${saleData.discount > 0 ? `
          <div class="total-row">
            <span>Desconto:</span>
            <span>- R$ ${saleData.discount.toFixed(2)}</span>
          </div>
        ` : ""}
        <div class="total-row bold" style="font-size: ${totalSize};">
          <span>TOTAL:</span>
          <span>R$ ${saleData.total_amount.toFixed(2)}</span>
        </div>
        
        <div class="divider"></div>
        <div class="bold">${paymentLabel}</div>
        <div>${paymentInfo}</div>
        
        ${saleData.change_amount && saleData.change_amount > 0 ? `
          <div class="change center">
            TROCO: R$ ${saleData.change_amount.toFixed(2)}
          </div>
        ` : ""}
        
        <div class="divider"></div>
        <div class="center" style="margin-top: 8px;">Obrigado pela preferência!</div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    toast({ title: "Enviando para impressora..." });
  };

  const generatePDF = async (sale: SaleData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Adicionar logo se existir
    if (logoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            const logoSize = 25;
            doc.addImage(img, "JPEG", (pageWidth - logoSize) / 2, yPos, logoSize, logoSize);
            resolve();
          };
          img.onerror = () => resolve(); // Continua sem logo se falhar
          img.src = logoUrl;
        });
        yPos += 30;
      } catch {
        // Continua sem logo se falhar
      }
    }

    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(storeName || "LOJA", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("COMPROVANTE DE VENDA", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Informações da venda
    doc.setFontSize(10);
    doc.text(`Data: ${format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm")}`, 20, yPos);
    yPos += 7;
    doc.text(`ID da Venda: ${sale.id}`, 20, yPos);
    yPos += 7;

    // Nome do cliente (se houver)
    if (sale.customer_name) {
      doc.setFont("helvetica", "bold");
      doc.text(`Cliente: ${sale.customer_name}`, 20, yPos);
      doc.setFont("helvetica", "normal");
      yPos += 7;
    }

    // Forma de pagamento
    const paymentMethodLabels: Record<string, string> = {
      credit: "Cartão de Crédito",
      debit: "Cartão de Débito",
      pix: "PIX",
      cash: "Dinheiro",
      fiado: "Fiado (A Prazo)",
      credito: "Crédito do Cliente",
    };
    
    if (sale.payments && sale.payments.length > 0) {
      // Pagamento múltiplo
      doc.setFont("helvetica", "bold");
      doc.text("MÚLTIPLOS PAGAMENTOS:", 20, yPos);
      doc.setFont("helvetica", "normal");
      yPos += 7;
      sale.payments.forEach(p => {
        doc.text(`  - ${paymentMethodLabels[p.method] || p.method}: R$ ${p.amount.toFixed(2)}`, 20, yPos);
        yPos += 6;
      });
    } else if (sale.credit_used && sale.remaining_amount) {
      doc.text("Formas de Pagamento:", 20, yPos);
      yPos += 7;
      doc.text(`  - Crédito: R$ ${sale.credit_used.toFixed(2)}`, 20, yPos);
      yPos += 7;
      doc.text(`  - ${paymentMethodLabels[sale.remaining_payment_method || ""] || sale.remaining_payment_method}: R$ ${sale.remaining_amount.toFixed(2)}`, 20, yPos);
      yPos += 7;
    } else if (sale.credit_used) {
      doc.text(`Forma de Pagamento: Crédito do Cliente`, 20, yPos);
      yPos += 7;
    } else {
      doc.text(`Forma de Pagamento: ${paymentMethodLabels[sale.payment_method] || sale.payment_method}`, 20, yPos);
      yPos += 7;
    }
    yPos += 3;

    // Linha separadora
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Título dos produtos
    doc.setFont("helvetica", "bold");
    doc.text("PRODUTOS", 20, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");

    // Lista de produtos
    const subtotal = sale.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    
    sale.items.forEach((item, index) => {
      const itemTotal = item.quantity * item.unit_price;
      doc.text(`${index + 1}. ${item.product_name}`, 20, yPos);
      yPos += 5;
      doc.text(`   ${item.quantity} x R$ ${item.unit_price.toFixed(2)} = R$ ${itemTotal.toFixed(2)}`, 20, yPos);
      yPos += 7;
    });

    yPos += 5;

    // Linha separadora
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Totais
    doc.text(`Subtotal:`, 20, yPos);
    doc.text(`R$ ${subtotal.toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });
    yPos += 7;

    if (sale.discount > 0) {
      doc.text(`Desconto:`, 20, yPos);
      doc.text(`- R$ ${sale.discount.toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });
      yPos += 7;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`TOTAL:`, 20, yPos);
    doc.text(`R$ ${sale.total_amount.toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });
    yPos += 15;

    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Mensagem final
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("Obrigado pela preferência!", pageWidth / 2, yPos, { align: "center" });

    // Salvar PDF
    doc.save(`comprovante-${sale.id}.pdf`);
  };

  const generateReceiptContent = (sale: SaleData) => {
    const paymentMethodLabels: Record<string, string> = {
      credit: "Cartão de Crédito",
      debit: "Cartão de Débito",
      pix: "PIX",
      cash: "Dinheiro",
      fiado: "Fiado (A Prazo)",
      credito: "Crédito do Cliente",
    };

    const subtotal = sale.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    let paymentInfo = "";
    if (sale.payments && sale.payments.length > 0) {
      // Pagamento múltiplo
      paymentInfo = `MÚLTIPLOS PAGAMENTOS:\n${sale.payments.map(p => 
        `  - ${paymentMethodLabels[p.method] || p.method}: R$ ${p.amount.toFixed(2)}`
      ).join('\n')}`;
    } else if (sale.credit_used && sale.remaining_amount) {
      paymentInfo = `Formas de Pagamento:
  - Crédito: R$ ${sale.credit_used.toFixed(2)}
  - ${paymentMethodLabels[sale.remaining_payment_method || ""] || sale.remaining_payment_method}: R$ ${sale.remaining_amount.toFixed(2)}`;
    } else if (sale.credit_used) {
      paymentInfo = `Forma de Pagamento: Crédito do Cliente`;
    } else {
      paymentInfo = `Forma de Pagamento: ${paymentMethodLabels[sale.payment_method] || sale.payment_method}`;
    }

    let content = `
================================================
          ${storeName || "LOJA"} - COMPROVANTE
================================================

Data: ${format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm")}
ID da Venda: ${sale.id}
${sale.customer_name ? `Cliente: ${sale.customer_name}\n` : ""}
${paymentInfo}

------------------------------------------------
              ITENS VENDIDOS
------------------------------------------------

`;

    sale.items.forEach((item, index) => {
      const itemTotal = item.quantity * item.unit_price;
      content += `${index + 1}. ${item.product_name}\n`;
      content += `   Qtd: ${item.quantity} x R$ ${item.unit_price.toFixed(2)} = R$ ${itemTotal.toFixed(2)}\n\n`;
    });

    content += `------------------------------------------------\n`;
    content += `Subtotal:              R$ ${subtotal.toFixed(2)}\n`;
    if (sale.discount > 0) {
      content += `Desconto:              R$ ${sale.discount.toFixed(2)}\n`;
    }
    content += `TOTAL:                 R$ ${sale.total_amount.toFixed(2)}\n`;
    content += `------------------------------------------------\n`;
    content += `\n`;
    content += `================================================\n`;
    content += `       Obrigado pela preferência!\n`;
    content += `================================================\n`;

    return content;
  };

  const newSale = () => {
    setCart([]);
    setDiscount(0);
    setPaymentMethod("");
    setSelectedCustomer(null);
    setCurrentStep("cart");
    setSaleData(null);
    setPaymentMode(null);
    setPayments([]);
    setCurrentPaymentAmount("");
    fetchProducts();
  };

  const paymentMethods = [
    { value: "credit", label: "Cartão de Crédito", image: paymentCredit },
    { value: "debit", label: "Cartão de Débito", image: paymentDebit },
    { value: "pix", label: "PIX", image: paymentPix },
    { value: "cash", label: "Dinheiro", image: paymentCash },
    { value: "fiado", label: "Fiado", image: paymentFiado },
  ];

  if (!loading && isExpired) {
    return <SubscriptionBlocker isTrial={isTrial} />;
  }

  return (
    <PageLoader pageName="Venda">
      {productsLoading ? (
        <POSSkeleton />
      ) : (
        <div className="p-6 overflow-hidden">
          <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">PDV - Ponto de Venda</h1>
        <p className="text-muted-foreground">Sistema de vendas</p>
      </div>


      {/* Etapa 1: Carrinho */}
      {currentStep === "cart" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto por nome, código interno ou código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowBarcodeScanner(true)}
                title="Ler código de barras com câmera"
                disabled={productsLoading}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  sessionStorage.setItem("pos_cart", JSON.stringify(cart));
                  navigate("/pdv/produtos");
                }}
              >
                Ver Produtos
              </Button>
            </div>

            {searchTerm && (
              <Card className="border-primary-light">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {filteredProducts.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">Nenhum produto encontrado</p>
                    ) : (
                      filteredProducts.slice(0, 5).map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 hover:bg-accent-light rounded-lg cursor-pointer transition-colors"
                          onClick={() => addToCart(product)}
                        >
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Estoque: {product.stock_quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-accent">
                              R$ {(product.promotional_price || product.price).toFixed(2)}
                            </p>
                            {product.promotional_price && (
                              <p className="text-xs line-through text-muted-foreground">
                                R$ {product.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Carrinho
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-16 w-16 mx-auto mb-2 opacity-50" />
                    <p>Carrinho vazio</p>
                  </div>
                ) : (
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-[30%]">Produto</TableHead>
                        <TableHead className="text-xs w-[18%]">Preço</TableHead>
                        <TableHead className="text-xs w-[25%]">Qtd</TableHead>
                        <TableHead className="text-xs w-[17%]">Total</TableHead>
                        <TableHead className="text-xs w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => (
                        <TableRow key={item.product.id}>
                          <TableCell className="font-medium text-xs truncate">{item.product.name}</TableCell>
                          <TableCell className="text-xs">
                            R$ {(item.product.promotional_price || item.product.price).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.product.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-xs">{item.quantity}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.product.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-xs">R$ {getItemPrice(item).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2">
                    <Label>Desconto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex justify-between text-xl font-bold border-t pt-2">
                    <span>Total:</span>
                    <span className="text-accent">R$ {total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full h-14 text-lg bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent-hover"
              onClick={goToPayment}
              disabled={cart.length === 0}
            >
              <ArrowRight className="mr-2 h-5 w-5" />
              Continuar para Pagamento
            </Button>
          </div>
        </div>
      )}

      {/* Etapa 2: Pagamento */}
      {currentStep === "payment" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo da Compra</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span>{item.product.name} x{item.quantity}</span>
                    <span>R$ {getItemPrice(item).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Desconto:</span>
                    <span className="text-accent">- R$ {discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total:</span>
                    <span className="text-accent">R$ {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seleção do Modo de Pagamento */}
          {!paymentMode && (
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-24 flex-col border-2 hover:border-primary hover:bg-primary-light"
                    onClick={() => setPaymentMode("single")}
                  >
                    <DollarSign className="h-8 w-8 mb-2" />
                    <span className="text-sm font-medium">Pagamento Único</span>
                    <span className="text-xs text-muted-foreground">Tudo em uma forma</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex-col border-2 hover:border-accent hover:bg-accent-light"
                    onClick={() => setPaymentMode("multiple")}
                  >
                    <img src={paymentCredit} alt="Múltiplo" className="h-8 w-8 mb-2 rounded object-cover" />
                    <span className="text-sm font-medium">Pagamento Múltiplo</span>
                    <span className="text-xs text-muted-foreground">Dividir em várias formas</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagamento Único */}
          {paymentMode === "single" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Forma de Pagamento</span>
                  <Button variant="ghost" size="sm" onClick={() => setPaymentMode(null)}>
                    Voltar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {paymentMethods.map((method) => (
                    <Button
                      key={method.value}
                      variant={paymentMethod === method.value ? "default" : "outline"}
                      className={`h-24 flex-col ${
                        paymentMethod === method.value
                          ? "bg-accent hover:bg-accent-hover border-2 border-accent"
                          : ""
                      }`}
                      disabled={pixPaymentStatus === 'approved'}
                      onClick={() => {
                        if (pixPaymentStatus === 'approved') return;
                        if (method.value === "pix") {
                          handlePixPayment();
                        } else {
                          setPaymentMethod(method.value);
                          if (method.value === "fiado") {
                            navigate("/pdv/clientes");
                          }
                        }
                      }}
                    >
                      <img src={method.image} alt={method.label} className="h-10 w-10 mb-2 rounded object-cover" />
                      <span className="text-sm">{method.label}</span>
                    </Button>
                  ))}
                </div>

                {paymentMethod === "fiado" && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    {selectedCustomer ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Cliente selecionado:</p>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{selectedCustomer.name}</p>
                            <p className="text-xs text-muted-foreground">CPF: {selectedCustomer.cpf}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => navigate("/pdv/clientes")}>
                            Trocar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-2">
                        <p className="text-sm text-destructive font-medium">Por favor, selecione um cliente.</p>
                        <Button variant="outline" size="sm" onClick={() => navigate("/pdv/clientes")}>
                          Selecionar Cliente
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pagamento Múltiplo */}
          {paymentMode === "multiple" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pagamento Múltiplo</span>
                  <Button variant="ghost" size="sm" onClick={() => setPaymentMode(null)}>
                    Voltar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Lista de pagamentos adicionados */}
                {payments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Pagamentos adicionados:</p>
                    {payments.map((payment, index) => {
                      const methodLabel = paymentMethods.find(m => m.value === payment.method)?.label || payment.method;
                      return (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span>{methodLabel}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">R$ {payment.amount.toFixed(2)}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => removePayment(index)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="border-t pt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Total pago:</span>
                        <span className="font-semibold">R$ {totalPaid.toFixed(2)}</span>
                      </div>
                      {remainingToPay > 0 ? (
                        <div className="flex justify-between text-sm text-destructive">
                          <span>Falta pagar:</span>
                          <span className="font-semibold">R$ {remainingToPay.toFixed(2)}</span>
                        </div>
                      ) : changeAmount > 0 ? (
                        <div className="flex justify-between text-lg text-green-600 font-bold bg-green-50 p-2 rounded">
                          <span>TROCO:</span>
                          <span>R$ {changeAmount.toFixed(2)}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Adicionar novo pagamento - só mostra se ainda falta pagar */}
                {remainingToPay > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Adicionar pagamento:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {paymentMethods.map((method) => (
                        <Button
                          key={method.value}
                          variant={paymentMethod === method.value ? "default" : "outline"}
                          className={`h-20 flex-col text-xs p-2 ${
                            paymentMethod === method.value ? "bg-accent hover:bg-accent-hover" : ""
                          }`}
                          onClick={() => {
                            setPaymentMethod(method.value);
                            if (method.value === "fiado") {
                              navigate("/pdv/clientes");
                            }
                            // Mostrar QR code PIX automaticamente em múltiplos pagamentos
                            if (method.value === "pix") {
                              const isManualConfigured = (!pixSettings?.pix_mode || pixSettings?.pix_mode === 'manual') && pixSettings?.pix_key && pixSettings?.pix_receiver_name;
                              const isAutomaticConfigured = pixSettings?.pix_mode === 'automatic';

                              if (!isManualConfigured && !isAutomaticConfigured) {
                                toast({
                                  title: "PIX não configurado",
                                  description: "Configure o PIX nas configurações antes de usar este método",
                                  variant: "destructive",
                                });
                                setPaymentMethod("");
                                return;
                              }

                              setPaymentMethod("pix");
                              const amountForPix = paymentMode === "multiple"
                                ? (parseFloat(currentPaymentAmount) || remainingToPay)
                                : total;
                              showPixFeeQuestion(amountForPix);
                            }
                          }}
                        >
                          <img src={method.image} alt={method.label} className="h-8 w-8 mb-1 rounded object-contain" />
                          <span className="text-center leading-tight">{method.label}</span>
                        </Button>
                      ))}
                    </div>

                  {paymentMethod && (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Valor"
                        value={currentPaymentAmount}
                        onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={addPayment}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  )}

                  {paymentMethod === "fiado" && selectedCustomer && (
                    <div className="p-2 bg-muted rounded text-sm">
                      Cliente: <span className="font-semibold">{selectedCustomer.name}</span>
                    </div>
                  )}
                </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dialog do QR Code PIX */}
          <Dialog open={showPixQrCode} onOpenChange={(open) => {
            // Se tentar fechar após pagamento aprovado, mostrar confirmação
            if (!open && pixPaymentStatus === 'approved') {
              // Permitir fechar normalmente após aprovação
              cleanupPixTimers();
              setShowPixQrCode(false);
              return;
            }
            // Se tentar fechar durante aguardando, permitir (cancelar)
            if (!open) cleanupPixTimers();
            setShowPixQrCode(open);
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  Pagamento PIX
                  {pixSettings?.pix_mode === 'automatic' && pixPaymentStatus === 'waiting' && (
                    <span className="ml-auto text-sm font-normal text-muted-foreground flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTimeRemaining(pixTimeRemaining)}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              {/* Estado: Aguardando pagamento */}
              {pixPaymentStatus === 'waiting' && (
                <div className="flex flex-col items-center space-y-4 py-4">
                  {/* Barra de progresso para PIX automático */}
                  {pixSettings?.pix_mode === 'automatic' && !pixPaymentLoading && (
                    <div className="w-full space-y-2">
                      <Progress value={(pixTimeRemaining / 300) * 100} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground">
                        Aguardando pagamento...
                      </p>
                    </div>
                  )}

                  <div className="bg-white p-4 rounded-lg">
                    {pixSettings?.pix_mode === 'automatic' ? (
                      pixPaymentLoading || !pixQrCodeImage ? (
                        <div className="w-[200px] h-[200px] flex items-center justify-center">
                          <div className="text-center">
                            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Gerando QR Code PIX...</p>
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={pixQrCodeImage}
                          alt="QR Code PIX"
                          width={200}
                          height={200}
                        />
                      )
                    ) : (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatePixPayload(paymentMode === "multiple" ? parseFloat(currentPaymentAmount) || remainingToPay : total))}`}
                        alt="QR Code PIX"
                        width={200}
                        height={200}
                      />
                    )}
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-2xl font-bold text-accent">
                      R$ {(pixSettings?.pix_mode === 'automatic'
                        ? pixPaymentAmount
                        : (paymentMode === "multiple" ? parseFloat(currentPaymentAmount) || remainingToPay : total)
                      ).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Escaneie o QR Code para pagar</p>
                    {pixSettings?.pix_mode === 'manual' && (
                      <p className="text-xs text-muted-foreground">Recebedor: {pixSettings?.pix_receiver_name}</p>
                    )}
                  </div>

                  {/* Botão de copiar código PIX para modo automático */}
                  {pixSettings?.pix_mode === 'automatic' && pixCopyPaste && !pixPaymentLoading && (
                    <div className="w-full space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={pixCopyPaste}
                          readOnly
                          className="flex-1 px-3 py-2 text-xs rounded-md border bg-muted truncate"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(pixCopyPaste);
                              toast({ title: "Código PIX copiado!" });
                            } catch (error) {
                              toast({ title: "Erro ao copiar", variant: "destructive" });
                            }
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        Ou copie o código acima para pagar
                      </p>
                    </div>
                  )}

                  {/* Botão de confirmar apenas para PIX manual */}
                  {pixSettings?.pix_mode !== 'automatic' && (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        if (paymentMode === "multiple") {
                          const amount = parseFloat(currentPaymentAmount) || remainingToPay;
                          setPayments([...payments, { method: "pix", amount }]);
                          setCurrentPaymentAmount("");
                        }
                        setShowPixQrCode(false);
                        setPaymentMethod(paymentMode === "multiple" ? "" : "pix");
                        setPixManualConfirmed(true); // Marcar PIX manual como confirmado
                        toast({ title: "Pagamento PIX confirmado!" });
                      }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirmar Pagamento
                    </Button>
                  )}
                </div>
              )}

              {/* Estado: Pagamento confirmado */}
              {pixPaymentStatus === 'approved' && (
                <div className="flex flex-col items-center space-y-4 py-8">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-bold text-green-600">Pagamento Confirmado!</p>
                    <p className="text-2xl font-bold">
                      R$ {pixPaymentAmount.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">O pagamento foi recebido com sucesso</p>
                  </div>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setShowPixQrCode(false);
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Continuar
                  </Button>
                </div>
              )}

              {/* Estado: QR Code expirado */}
              {pixPaymentStatus === 'expired' && (
                <div className="flex flex-col items-center space-y-4 py-8">
                  <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-12 w-12 text-red-600" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-bold text-red-600">QR Code Expirado</p>
                    <p className="text-sm text-muted-foreground">
                      Nenhum pagamento foi concluído com este QR Code.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Este QR Code expirou. Por favor, gere um novo QR Code.
                    </p>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={regeneratePixQrCode}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Gerar Novo QR Code
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowPixQrCode(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>




          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                // Se PIX automático foi aprovado, mostrar alerta de confirmação
                if (pixPaymentStatus === 'approved' && pixSettings?.pix_mode === 'automatic') {
                  setShowBackWarningDialog(true);
                  return;
                }
                setCurrentStep("cart");
              }}
            >
              Voltar
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-success to-accent hover:opacity-90"
              onClick={finalizeSale}
              disabled={
                isProcessingSale || 
                !paymentMode ||
                (paymentMode === "single" && !paymentMethod) ||
                (paymentMode === "single" && paymentMethod === "pix" && pixSettings?.pix_mode === 'automatic' && pixPaymentStatus !== 'approved') ||
                (paymentMode === "single" && paymentMethod === "pix" && pixSettings?.pix_mode !== 'automatic' && !pixManualConfirmed) ||
                (paymentMode === "multiple" && (payments.length === 0 || totalPaid < total))
              }
            >
              <DollarSign className="mr-2 h-5 w-5" />
              {isProcessingSale ? "Processando..." : "Finalizar Venda"}
            </Button>
          </div>

          {/* AlertDialog de aviso ao voltar após PIX aprovado */}
          <AlertDialog open={showBackWarningDialog} onOpenChange={setShowBackWarningDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Pagamento já realizado</AlertDialogTitle>
                <AlertDialogDescription>
                  O pagamento PIX já foi confirmado. Se você voltar, precisará realizar um novo pagamento para concluir a venda.
                  <br /><br />
                  Deseja realmente voltar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    // Limpar estados do PIX
                    setPixPaymentStatus("waiting");
                    setPixQrCodeImage(null);
                    setPixCopyPaste(null);
                    setPixPaymentId(null);
                    setPixPaymentAmount(0);
                    setPixTimeRemaining(300);
                    setPixManualConfirmed(false);
                    cleanupPixTimers();
                    // Voltar para o carrinho
                    setCurrentStep("cart");
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, voltar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Etapa 3: Comprovante */}
      {currentStep === "receipt" && saleData && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-success">
            <CardHeader className="bg-success-light">
              <CardTitle className="flex items-center gap-2 text-success">
                <FileText className="h-6 w-6" />
                Venda Finalizada com Sucesso!
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">ID da Venda</p>
                  <p className="font-mono text-lg font-semibold">{saleData.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(saleData.created_at), "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                </div>

                {saleData.customer_name && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-semibold text-lg">{saleData.customer_name}</p>
                  </div>
                )}

                <div className="border-t border-b py-4 space-y-2">
                  <p className="font-semibold mb-2">Produtos:</p>
                  {saleData.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.product_name} x{item.quantity}</span>
                      <span>R$ {(item.quantity * item.unit_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>R$ {saleData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}</span>
                  </div>
                  {saleData.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Desconto:</span>
                      <span className="text-accent">- R$ {saleData.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold border-t pt-2">
                    <span>Total:</span>
                    <span className="text-success">R$ {saleData.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2 bg-muted p-3 rounded">
                    <span className="text-sm font-medium">Forma de Pagamento:</span>
                    {saleData.credit_used && saleData.remaining_amount ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Crédito:</span>
                          <span className="font-medium">R$ {saleData.credit_used.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>
                            {saleData.remaining_payment_method === "credit" && "Cartão de Crédito"}
                            {saleData.remaining_payment_method === "debit" && "Cartão de Débito"}
                            {saleData.remaining_payment_method === "pix" && "PIX"}
                            {saleData.remaining_payment_method === "cash" && "Dinheiro"}
                            {saleData.remaining_payment_method === "fiado" && "Fiado (A Prazo)"}:
                          </span>
                          <span className="font-medium">R$ {saleData.remaining_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ) : saleData.credit_used ? (
                      <div className="text-sm font-medium">Crédito do Cliente</div>
                    ) : (
                      <div className="text-sm font-medium">
                        {saleData.payment_method === "credit" && "Cartão de Crédito"}
                        {saleData.payment_method === "debit" && "Cartão de Débito"}
                        {saleData.payment_method === "pix" && "PIX"}
                        {saleData.payment_method === "cash" && "Dinheiro"}
                        {saleData.payment_method === "fiado" && "Fiado (A Prazo)"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center pt-4 border-t">
                  <p className="text-sm italic text-muted-foreground">Obrigado pela preferência!</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Baixar Comprovante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Escolha o formato para baixar o comprovante da venda:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-16 flex-col border-2 hover:border-primary hover:bg-primary-light"
                  onClick={() => downloadReceipt("pdf")}
                >
                  <Download className="h-5 w-5 mb-1" />
                  <span className="text-xs">PDF</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex-col border-2 hover:border-accent hover:bg-accent-light"
                  onClick={() => downloadReceipt("txt")}
                >
                  <FileText className="h-5 w-5 mb-1" />
                  <span className="text-xs">TXT</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex-col border-2 hover:border-blue-500 hover:bg-blue-50"
                  onClick={openEmailDialog}
                >
                  <Mail className="h-5 w-5 mb-1" />
                  <span className="text-xs">E-mail</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex-col border-2 hover:border-green-500 hover:bg-green-50"
                  onClick={printThermalReceipt}
                >
                  <Printer className="h-5 w-5 mb-1" />
                  <span className="text-xs">Imprimir</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full h-14 text-lg bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent-hover"
            onClick={newSale}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Nova Venda
          </Button>
        </div>
      )}




      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleBarcodeScan}
        getProductPreview={getProductPreview}
      />

      {/* Dialog de Enviar por E-mail */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Comprovante por E-mail</DialogTitle>
            <DialogDescription>
              Digite o e-mail do cliente para enviar o comprovante
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer-email-pos">E-mail do Cliente</Label>
              <Input
                id="customer-email-pos"
                type="email"
                placeholder="cliente@email.com"
                value={emailToSend}
                onChange={(e) => setEmailToSend(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Ao clicar em "Me Direcionar", seu cliente de e-mail será aberto com o comprovante pronto para enviar.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendEmail} disabled={!emailToSend}>
              <Mail className="h-4 w-4 mr-2" />
              Me Direcionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Taxa PIX */}
      <Dialog open={showPixFeeDialog} onOpenChange={setShowPixFeeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Percent className="h-5 w-5 text-primary" />
              </div>
              Taxa PIX (0,49%)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Valor da venda */}
            <div className="p-4 bg-white dark:bg-card rounded-lg text-center border">
              <p className="text-sm text-foreground font-medium">Valor da venda</p>
              <p className="text-2xl font-bold text-foreground">
                {pixOriginalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>

            {/* Taxa info */}
            <div className="flex items-center justify-center gap-2 py-2 px-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <span className="text-sm text-foreground">
                Taxa: <span className="font-semibold text-amber-600">
                  {pixFeeAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </span>
            </div>

            {/* Pergunta sobre repasse */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-center text-foreground">Repassar taxa para o cliente?</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={pixPassFeeToCustomer === true ? "default" : "outline"}
                  className={`h-14 flex-col ${pixPassFeeToCustomer === true ? "bg-primary" : ""}`}
                  onClick={() => {
                    setPixPassFeeToCustomer(true);
                    setPixFinalAmount(pixOriginalAmount + pixFeeAmount);
                    setPixYouReceive(pixOriginalAmount);
                  }}
                >
                  <ArrowUp className="h-5 w-5 mb-1" />
                  Sim
                </Button>
                <Button
                  variant={pixPassFeeToCustomer === false ? "default" : "outline"}
                  className={`h-14 flex-col ${pixPassFeeToCustomer === false ? "bg-primary" : ""}`}
                  onClick={() => {
                    setPixPassFeeToCustomer(false);
                    setPixFinalAmount(pixOriginalAmount);
                    setPixYouReceive(pixOriginalAmount - pixFeeAmount);
                  }}
                >
                  <ArrowDown className="h-5 w-5 mb-1" />
                  Não
                </Button>
              </div>
            </div>

            {/* Resultados */}
            {pixPassFeeToCustomer !== null && (
              <div className="space-y-3 p-4 bg-white dark:bg-card rounded-xl border">
                {/* Detalhamento */}
                {pixPassFeeToCustomer && (
                  <div className="text-sm text-foreground bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                    <p>Valor original: R$ {pixOriginalAmount.toFixed(2)}</p>
                    <p>+ Taxa (0,49%): R$ {pixFeeAmount.toFixed(4)}</p>
                  </div>
                )}
                {!pixPassFeeToCustomer && (
                  <div className="text-sm text-foreground bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                    <p>Valor original: R$ {pixOriginalAmount.toFixed(2)}</p>
                    <p>- Taxa (0,49%): R$ {pixFeeAmount.toFixed(4)}</p>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-foreground font-medium">Cliente paga:</span>
                  <span className={`font-bold text-lg ${pixPassFeeToCustomer ? "text-amber-600" : "text-foreground"}`}>
                    R$ {pixFinalAmount.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <span className="text-foreground font-medium">Você recebe:</span>
                  <span className="font-bold text-xl text-green-600">
                    R$ {pixYouReceive.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Botão gerar QR */}
            <Button 
              className="w-full h-12"
              disabled={pixPassFeeToCustomer === null}
              onClick={confirmPixFeeAndGenerate}
            >
              <QrCode className="h-5 w-5 mr-2" />
              Gerar QR Code PIX
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      )}
    </PageLoader>
  );
};

export default POS;
