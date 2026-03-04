import { useState, useEffect } from "react";
import PageLoader from "@/components/PageLoader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Store, Save, Zap, BookOpen, ShoppingCart, Package, Users, FileText, Settings as SettingsIcon, CreditCard, History, Smartphone, Eye, EyeOff, Gift, Copy, Check, Share2, Download, CheckCircle, Loader2, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    store_name: "",
    commercial_phone: "",
    store_address: "",
    operation_type: "",
    primary_color: "#4C6FFF",
    logo_url: "",
    category: "",
    quick_actions_enabled: false,
    hide_trial_message: false,
    pix_key_type: "",
    pix_key: "",
    pix_receiver_name: "",
    pix_mode: "manual" as "manual" | "automatic",
    mercado_pago_cpf: "",
    mercado_pago_name: "",
  });

  const [mercadoPagoToken, setMercadoPagoToken] = useState("");
  const [showTokenHelp, setShowTokenHelp] = useState(false);
  const [savingToken, setSavingToken] = useState(false);

  const [customCategory, setCustomCategory] = useState("");
  
  // Apenas uma seção aberta por vez
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(prev => prev === section ? null : section);
  };

  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Estado do código de convite
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteCodeLoading, setInviteCodeLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    fetchSettings();
    fetchInviteCode();

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast({
        title: "App instalado com sucesso!",
        description: "O JTC FluxPDV foi adicionado à sua tela inicial",
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const fetchInviteCode = async () => {
    setInviteCodeLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("Usuário não encontrado para buscar código de convite");
        setInviteCodeLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("invite_code")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar código de convite:", error);
      }

      if (data?.invite_code) {
        setInviteCode(data.invite_code);
      } else {
        console.log("Código de convite não encontrado para o usuário:", user.id);
      }
    } catch (err) {
      console.error("Erro inesperado ao buscar código de convite:", err);
    } finally {
      setInviteCodeLoading(false);
    }
  };


  const handleCopyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Compartilhe com seus amigos",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/auth?ref=${inviteCode}`;
    if (navigator.share) {
      navigator.share({
        title: "JTC FluxPDV - Convite",
        text: `Use meu código de convite ${inviteCode} e ganhe 1 mês + 3 dias grátis!`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copiado!",
        description: "Compartilhe o link com seus amigos",
      });
    }
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setIsInstalling(false);
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    } else {
      toast({
        title: "Instalação manual necessária",
        description: "Use o menu do navegador → 'Adicionar à tela inicial'",
      });
    }
  };

  const isMissingTableError = (error: any) =>
    error?.code === "PGRST205" || error?.code === "42P01";

  const fetchSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("store_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      if (!isMissingTableError(error)) {
        toast({ title: "Erro ao carregar configurações", variant: "destructive" });
      }
      return;
    }

    if (data) {
      setSettings({
        store_name: data.store_name || "",
        commercial_phone: data.commercial_phone || "",
        store_address: data.store_address || "",
        operation_type: data.operation_type || "",
        primary_color: data.primary_color || "#4C6FFF",
        logo_url: data.logo_url || "",
        category: data.category || "",
        quick_actions_enabled: data.quick_actions_enabled || false,
        hide_trial_message: data.hide_trial_message || false,
        pix_key_type: data.pix_key_type || "",
        pix_key: data.pix_key || "",
        pix_receiver_name: data.pix_receiver_name || "",
        pix_mode: (data.pix_mode === "automatic" ? "automatic" : "manual") as "manual" | "automatic",
        mercado_pago_cpf: data.mercado_pago_cpf || "",
        mercado_pago_name: data.mercado_pago_name || "",
      });

      // Buscar token do Mercado Pago se houver
      const { data: integrationData } = await supabase
        .from("store_integrations")
        .select("encrypted_token")
        .eq("user_id", user.id)
        .eq("integration_type", "mercado_pago")
        .maybeSingle();
      
      if (integrationData?.encrypted_token) {
        setMercadoPagoToken("••••••••••••••••••••");
      }
      
      // Se a categoria não está na lista padrão, é uma categoria personalizada
      const predefinedCategories = ["mercado", "padaria", "mercearia", "bazar", "papelaria", "restaurante", "lanchonete", "farmacia", "pet_shop"];
      if (data.category && !predefinedCategories.includes(data.category)) {
        setCustomCategory(data.category);
        setSettings(prev => ({ ...prev, category: "outros" }));
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Se a categoria for "outros", usar a categoria personalizada
    const finalSettings = {
      ...settings,
      category: settings.category === "outros" && customCategory ? customCategory : settings.category
    };

    const { data: existing } = await supabase
      .from("store_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from("store_settings")
        .update(finalSettings)
        .eq("user_id", user.id);
      error = result.error;
    } else {
      const result = await supabase
        .from("store_settings")
        .insert([{ ...finalSettings, user_id: user.id }]);
      error = result.error;
    }

    // Salvar token do Mercado Pago se foi alterado
    if (settings.pix_mode === "automatic" && mercadoPagoToken && !mercadoPagoToken.includes("•")) {
      const { data: existingIntegration } = await supabase
        .from("store_integrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("integration_type", "mercado_pago")
        .maybeSingle();

      if (existingIntegration) {
        await supabase
          .from("store_integrations")
          .update({ encrypted_token: mercadoPagoToken })
          .eq("id", existingIntegration.id);
      } else {
        await supabase
          .from("store_integrations")
          .insert({
            user_id: user.id,
            integration_type: "mercado_pago",
            encrypted_token: mercadoPagoToken,
          });
      }
      // Mostrar máscara após salvar
      setMercadoPagoToken("••••••••••••••••••••");
    }

    setLoading(false);

    if (error) {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas com sucesso!" });
      setOpenSection(null);
      window.dispatchEvent(new CustomEvent('store-settings-updated'));
      // Recarregar dados
      fetchSettings();
    }
  };

  const getPixKeyPlaceholder = () => {
    switch (settings.pix_key_type) {
      case "cpf":
        return "000.000.000-00";
      case "cnpj":
        return "00.000.000/0000-00";
      case "email":
        return "email@exemplo.com";
      case "phone":
        return "+5500000000000";
      case "random":
        return "Chave aleatória (32 caracteres)";
      default:
        return "Selecione o tipo de chave primeiro";
    }
  };

  return (
    <PageLoader pageName="Configurações">
    <div className="p-4 md:p-6 space-y-6 w-full max-w-full overflow-x-hidden animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Configurações da Loja
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">Personalize as informações da sua loja</p>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 w-full max-w-2xl">
        {/* Informações da Loja */}
        <Card className="overflow-hidden">
          <Collapsible open={openSection === 'storeInfo'}>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('storeInfo')}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between w-full gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                    <Store className="h-5 w-5 shrink-0" />
                    Informações da Loja
                  </CardTitle>
                  <div className="shrink-0">
                    {openSection === 'storeInfo' ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4 overflow-hidden">
                <div className="space-y-2">
                  <Label>Nome da Loja *</Label>
                  <Input
                    value={settings.store_name}
                    onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                    placeholder="Ex: Minha Loja"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefone Comercial</Label>
                  <Input
                    value={settings.commercial_phone}
                    onChange={(e) => setSettings({ ...settings, commercial_phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Endereço da Loja</Label>
                  <Input
                    value={settings.store_address}
                    onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
                    placeholder="Rua, número, bairro, cidade - estado"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria da Loja *</Label>
                  <Select
                    value={settings.category}
                    onValueChange={(value) => {
                      setSettings({ ...settings, category: value });
                      if (value !== "outros") {
                        setCustomCategory("");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mercado">Mercado</SelectItem>
                      <SelectItem value="padaria">Padaria</SelectItem>
                      <SelectItem value="mercearia">Mercearia</SelectItem>
                      <SelectItem value="bazar">Bazar</SelectItem>
                      <SelectItem value="papelaria">Papelaria</SelectItem>
                      <SelectItem value="restaurante">Restaurante</SelectItem>
                      <SelectItem value="lanchonete">Lanchonete</SelectItem>
                      <SelectItem value="farmacia">Farmácia</SelectItem>
                      <SelectItem value="pet_shop">Pet Shop</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {settings.category === "outros" && (
                    <Input
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Digite a categoria da sua loja"
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Operação</Label>
                  <Input
                    value={settings.operation_type}
                    onChange={(e) => setSettings({ ...settings, operation_type: e.target.value })}
                    placeholder="Ex: Varejo, E-commerce, Atacado"
                  />
                </div>

                <ImageUpload
                  bucket="store-logos"
                  currentImageUrl={settings.logo_url}
                  onImageUploaded={(url) => setSettings({ ...settings, logo_url: url })}
                  label="Logo da Loja"
                />

                <div className="space-y-2">
                  <Label>Cor Primária do Sistema</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.primary_color}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      placeholder="#4C6FFF"
                    />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Configuração PIX */}
        <Card className="overflow-hidden">
          <Collapsible open={openSection === 'pixConfig'}>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('pixConfig')}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between w-full gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                    <Smartphone className="h-5 w-5 shrink-0" />
                    Configuração PIX
                  </CardTitle>
                  <div className="shrink-0">
                    {openSection === 'pixConfig' ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-6 overflow-hidden">
                <p className="text-sm text-muted-foreground">
                  Escolha a forma de pagamento PIX para sua loja:
                </p>

                {/* Seleção de Modo PIX */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Modo de Pagamento</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, pix_mode: "manual" })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        settings.pix_mode === "manual"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          settings.pix_mode === "manual" ? "border-primary bg-primary" : "border-muted-foreground"
                        }`}>
                          {settings.pix_mode === "manual" && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                        <span className="font-medium">PIX Manual</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        QR Code estático com sua chave PIX
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, pix_mode: "automatic" })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        settings.pix_mode === "automatic"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          settings.pix_mode === "automatic" ? "border-primary bg-primary" : "border-muted-foreground"
                        }`}>
                          {settings.pix_mode === "automatic" && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                        <span className="font-medium">PIX Automático</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        Via Mercado Pago (confirma automaticamente)
                      </p>
                    </button>
                  </div>
                </div>

                {/* PIX Manual */}
                {settings.pix_mode === "manual" && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-medium">Configuração PIX Manual</h4>
                    
                    <div className="space-y-2">
                      <Label>Tipo de Chave PIX</Label>
                      <Select
                        value={settings.pix_key_type}
                        onValueChange={(value) => setSettings({ ...settings, pix_key_type: value, pix_key: "" })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de chave" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="phone">Telefone</SelectItem>
                          <SelectItem value="random">Chave Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Chave PIX</Label>
                      <Input
                        value={settings.pix_key}
                        onChange={(e) => setSettings({ ...settings, pix_key: e.target.value })}
                        placeholder={getPixKeyPlaceholder()}
                        disabled={!settings.pix_key_type}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Nome do Recebedor</Label>
                      <Input
                        value={settings.pix_receiver_name}
                        onChange={(e) => setSettings({ ...settings, pix_receiver_name: e.target.value })}
                        placeholder="Nome que aparecerá no PIX"
                        disabled={!settings.pix_key_type}
                      />
                    </div>

                    {settings.pix_key && settings.pix_receiver_name && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">
                          ✓ PIX Manual configurado!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* PIX Automático (Mercado Pago) */}
                {settings.pix_mode === "automatic" && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-medium">Configuração PIX Automático (Mercado Pago)</h4>
                    
                    <div className="space-y-2">
                      <Label>Access Token (Token Key)</Label>
                      <Input
                        type="password"
                        value={mercadoPagoToken}
                        onChange={(e) => setMercadoPagoToken(e.target.value)}
                        placeholder="APP_USR-xxxxx..."
                      />
                      <p className="text-xs text-muted-foreground">
                        O token será armazenado de forma segura e nunca será exposto.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>CPF do Titular da Conta</Label>
                      <Input
                        value={settings.mercado_pago_cpf}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length > 11) value = value.slice(0, 11);
                          if (value.length > 9) {
                            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
                          } else if (value.length > 6) {
                            value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
                          } else if (value.length > 3) {
                            value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
                          }
                          setSettings({ ...settings, mercado_pago_cpf: value });
                        }}
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Nome do Titular da Conta</Label>
                      <Input
                        value={settings.mercado_pago_name}
                        onChange={(e) => setSettings({ ...settings, mercado_pago_name: e.target.value })}
                        placeholder="Nome completo do titular"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTokenHelp(!showTokenHelp)}
                      >
                        {showTokenHelp ? "Fechar" : "Como conseguir meu Token Key?"}
                      </Button>
                    </div>

                    {showTokenHelp && (
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-2">
                        <h5 className="font-medium text-blue-700">Como obter o Access Token:</h5>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Acesse <a href="https://www.mercadopago.com.br/developers" target="_blank" rel="noopener noreferrer" className="text-primary underline">mercadopago.com.br/developers</a></li>
                          <li>Faça login com sua conta Mercado Pago</li>
                          <li>Vá em "Suas integrações" → "Criar aplicação"</li>
                          <li>Após criar, clique na aplicação</li>
                          <li>Em "Credenciais de produção", copie o "Access Token"</li>
                          <li>Cole o token no campo acima</li>
                        </ol>
                        <p className="text-xs text-amber-600 mt-2">
                          ⚠️ Use as credenciais de PRODUÇÃO, não de teste.
                        </p>
                      </div>
                    )}

                    {mercadoPagoToken && settings.mercado_pago_cpf && settings.mercado_pago_name && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">
                          ✓ PIX Automático configurado! Pagamentos serão confirmados automaticamente.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Ações Rápidas */}
        <Card className="overflow-hidden">
          <Collapsible open={openSection === 'quickActions'}>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('quickActions')}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between w-full gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                    <Zap className="h-5 w-5 shrink-0" />
                    Ações Rápidas
                  </CardTitle>
                  <div className="shrink-0">
                    {openSection === 'quickActions' ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-6 overflow-hidden">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <Label className="text-sm">Ativar Ações Rápidas</Label>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Exibe atalhos com ícones no Dashboard
                    </p>
                  </div>
                  <Switch
                    checked={settings.quick_actions_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, quick_actions_enabled: checked })}
                    className="shrink-0"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <Label className="text-sm">Ocultar Mensagem do Período de Teste</Label>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Esconde o aviso de teste/assinatura no Dashboard
                    </p>
                  </div>
                  <Switch
                    checked={settings.hide_trial_message}
                    onCheckedChange={(checked) => setSettings({ ...settings, hide_trial_message: checked })}
                    className="shrink-0"
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Meu Código de Convite */}
        <Card className="border-accent/30 bg-accent/5 overflow-hidden">
          <Collapsible open={openSection === 'inviteCode'}>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('inviteCode')}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between w-full gap-2">
                  <CardTitle className="flex items-center gap-2 text-accent text-sm md:text-base">
                    <Gift className="h-5 w-5 shrink-0" />
                    Meu Código de Convite
                  </CardTitle>
                  <div className="shrink-0">
                    {openSection === 'inviteCode' ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4 overflow-hidden">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Compartilhe seu código e ganhe <strong className="text-accent">1 mês grátis</strong> quando alguém se cadastrar usando ele!
                </p>

                <div className="bg-background rounded-xl p-4 md:p-6 text-center space-y-4 border border-accent/20">
                  <div className="text-2xl md:text-4xl font-mono font-bold tracking-widest text-primary break-all">
                    {inviteCodeLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-lg text-muted-foreground">Carregando...</span>
                      </div>
                    ) : inviteCode ? (
                      inviteCode
                    ) : (
                      <span className="text-lg text-destructive">Código não encontrado</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Button
                      onClick={handleCopyCode}
                      variant="outline"
                      className="gap-2"
                      disabled={!inviteCode || inviteCodeLoading}
                      size="sm"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copiado!" : "Copiar"}
                    </Button>
                    
                    <Button
                      onClick={handleShare}
                      className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
                      disabled={!inviteCode || inviteCodeLoading}
                      size="sm"
                    >
                      <Share2 className="h-4 w-4" />
                      Compartilhar
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 md:p-4 text-xs md:text-sm space-y-2">
                  <h4 className="font-semibold text-foreground">Como funciona:</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Você ganha <strong>1 mês grátis</strong> para cada pessoa que usar seu código</li>
                    <li>• Seu amigo ganha <strong>1 mês + 3 dias grátis</strong> ao se cadastrar</li>
                    <li>• Cada dispositivo só pode usar o código <strong>uma vez</strong></li>
                  </ul>
                </div>

              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Baixar App */}
        <Card className="border-primary/30 bg-primary/5 overflow-hidden">
          <Collapsible open={openSection === 'downloadApp'}>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('downloadApp')}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between w-full gap-2">
                  <CardTitle className="flex items-center gap-2 text-primary text-sm md:text-base">
                    <Download className="h-5 w-5 shrink-0" />
                    Baixar App
                  </CardTitle>
                  <div className="shrink-0">
                    {openSection === 'downloadApp' ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4 overflow-hidden">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Instale o JTC FluxPDV como um aplicativo no seu celular! Acesso rápido e sem barra do navegador.
                </p>

                {isInstalled ? (
                  <div className="p-3 md:p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-green-600 text-sm md:text-base">App já instalado!</p>
                      <p className="text-xs md:text-sm text-muted-foreground">O JTC FluxPDV está na sua tela inicial</p>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleInstallApp}
                    className="w-full h-12 md:h-14 text-sm md:text-lg gap-2 md:gap-3"
                    disabled={isInstalling}
                  >
                  {isInstalling ? (
                      <>
                        <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin shrink-0" />
                        Instalando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                        📲 Clique para instalar
                      </>
                    )}
                  </Button>
                )}

                <div className="bg-muted/50 rounded-lg p-3 md:p-4 text-xs md:text-sm space-y-2 md:space-y-3">
                  <h4 className="font-semibold text-foreground">Benefícios do App:</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>✅ Acesso rápido pela tela inicial</li>
                    <li>✅ Abre em tela cheia</li>
                    <li>✅ Carrega mais rápido</li>
                    <li>✅ Experiência mais fluida</li>
                  </ul>
                </div>

                {!isInstalled && (
                  <div className="bg-muted/50 rounded-lg p-3 md:p-4 text-xs md:text-sm space-y-2 md:space-y-3">
                    <h4 className="font-semibold text-foreground">📱 Como instalar manualmente:</h4>
                    <div className="space-y-2">
                      <div className="border-l-2 border-primary pl-3">
                        <p className="font-medium">No Android:</p>
                        <p className="text-muted-foreground">Menu (⋮) → "Adicionar à tela inicial"</p>
                      </div>
                      <div className="border-l-2 border-primary pl-3">
                        <p className="font-medium">No iPhone/iPad:</p>
                        <p className="text-muted-foreground">Compartilhar (↑) → "Adicionar à Tela de Início"</p>
                      </div>
                    </div>
                  </div>
                )}

              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Button onClick={handleSave} disabled={loading} className="w-full h-12">
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>

        {/* Manual Completo do Sistema - Premium */}
        <Card className="mt-6 overflow-hidden border-0 shadow-lg">
          <Collapsible open={openSection === 'manual'} onOpenChange={() => toggleSection('manual')}>
            <CardHeader 
              className="cursor-pointer bg-gradient-to-br from-primary/5 to-accent/5 border-b border-border/50" 
              onClick={() => toggleSection('manual')}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between w-full gap-2">
                  <CardTitle className="flex items-center gap-3 text-sm md:text-base">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    Manual Completo do Sistema
                  </CardTitle>
                  <div className="shrink-0">
                    {openSection === 'manual' ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="p-4">
                <Accordion type="single" collapsible className="w-full space-y-2">
                  
                  {/* Como Fazer uma Venda */}
                  <AccordionItem value="vendas" className="border rounded-xl px-4 data-[state=open]:bg-muted/20 transition-colors">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <ShoppingCart className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">Como Fazer uma Venda</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4">
                      <div className="space-y-4 ml-1">
                        <div className="relative pl-8 pb-3 border-l-2 border-primary/20 ml-2">
                          <div className="absolute -left-[9px] top-0 w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</div>
                          <h4 className="font-semibold text-foreground text-xs mb-1">Acessar a Tela de Venda</h4>
                          <p className="text-xs">No menu, clique em "Venda" ou use as ações rápidas do Dashboard.</p>
                        </div>
                        <div className="relative pl-8 pb-3 border-l-2 border-primary/20 ml-2">
                          <div className="absolute -left-[9px] top-0 w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">2</div>
                          <h4 className="font-semibold text-foreground text-xs mb-1">Adicionar Produtos</h4>
                          <div className="text-xs space-y-1 bg-muted/30 rounded-lg p-2.5">
                            <p>• <strong>Busca por nome:</strong> Digite e selecione o produto</p>
                            <p>• <strong>Código de barras:</strong> Digite ou use a câmera para escanear</p>
                            <p>• <strong>Lista completa:</strong> Clique em "Ver Produtos" para selecionar vários</p>
                          </div>
                        </div>
                        <div className="relative pl-8 pb-3 border-l-2 border-primary/20 ml-2">
                          <div className="absolute -left-[9px] top-0 w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">3</div>
                          <h4 className="font-semibold text-foreground text-xs mb-1">Ajustar Quantidades e Desconto</h4>
                          <p className="text-xs">Use + e - para alterar quantidades. Digite o desconto em reais se desejar.</p>
                        </div>
                        <div className="relative pl-8 pb-3 border-l-2 border-primary/20 ml-2">
                          <div className="absolute -left-[9px] top-0 w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">4</div>
                          <h4 className="font-semibold text-foreground text-xs mb-1">Selecionar Cliente (Opcional)</h4>
                          <p className="text-xs">Associe a venda a um cliente. <strong>Obrigatório</strong> para vendas no fiado. Crédito do cliente é descontado automaticamente.</p>
                        </div>
                        <div className="relative pl-8 pb-3 border-l-2 border-primary/20 ml-2">
                          <div className="absolute -left-[9px] top-0 w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">5</div>
                          <h4 className="font-semibold text-foreground text-xs mb-1">Forma de Pagamento</h4>
                          <div className="text-xs space-y-1 bg-muted/30 rounded-lg p-2.5">
                            <p>• <strong>Cartão Crédito/Débito:</strong> Cliente paga na maquininha</p>
                            <p>• <strong>PIX Manual:</strong> QR Code estático (configurar chave PIX)</p>
                            <p>• <strong>PIX Automático:</strong> QR Code dinâmico com confirmação automática</p>
                            <p>• <strong>Dinheiro:</strong> Pagamento em espécie</p>
                            <p>• <strong>Fiado:</strong> Venda a prazo (precisa selecionar cliente)</p>
                          </div>
                        </div>
                        <div className="relative pl-8 ml-2">
                          <div className="absolute -left-[9px] top-0 w-[18px] h-[18px] rounded-full bg-accent text-accent-foreground flex items-center justify-center text-[10px] font-bold">6</div>
                          <h4 className="font-semibold text-foreground text-xs mb-1">Finalizar Venda</h4>
                          <p className="text-xs">O sistema gera ID automático, atualiza estoque, registra no histórico e disponibiliza recibo PDF/TXT.</p>
                        </div>

                        <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mt-3">
                          <h4 className="font-semibold text-foreground text-xs mb-1 flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-accent" />
                            PIX Automático (Mercado Pago)
                          </h4>
                          <p className="text-xs">QR Code com valor exato → Cliente paga → Confirmação em até 15 seg com som → Venda finalizada automaticamente. Opção de repassar taxa (0.49%) ao cliente. QR Code expira em 15 minutos.</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Gerenciamento de Produtos */}
                  <AccordionItem value="produtos" className="border rounded-xl px-4 data-[state=open]:bg-muted/20 transition-colors">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">Gerenciamento de Produtos</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4">
                      <div className="space-y-3 ml-1">
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">📦 Cadastrar Produto</h4>
                          <p>Menu → Produtos → Novo Produto. Preencha: <strong>Nome</strong>, <strong>Preço de Custo</strong>, <strong>Preço de Venda</strong>, <strong>Estoque</strong>. Campos opcionais: descrição, código de barras, preço promocional, categoria, fornecedor e fotos.</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">✏️ Editar / Excluir</h4>
                          <p>Clique no ícone de <strong>lápis</strong> para editar ou <strong>lixeira</strong> para excluir. Produtos já vendidos não podem ser excluídos, mas podem ser inativados.</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">📊 Controle de Estoque</h4>
                          <p>Estoque atualizado automaticamente a cada venda. Margem de lucro calculada automaticamente. Ajuste manual editando o produto.</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">🏷️ Categorias</h4>
                          <p>Aba Categorias → Nova Categoria. Crie subcategorias selecionando uma categoria pai.</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">📤 Importar / Exportar</h4>
                          <p>Menu (⋮) → "Exportar CSV" para baixar ou "Importar CSV" para adicionar produtos em massa.</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Gerenciamento de Fornecedores */}
                  <AccordionItem value="fornecedores" className="border rounded-xl px-4 data-[state=open]:bg-muted/20 transition-colors">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">Gerenciamento de Fornecedores</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4">
                      <div className="space-y-3 ml-1">
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">🏭 Cadastrar Fornecedor</h4>
                          <p>Menu → Fornecedores → Novo Fornecedor. Preencha: <strong>Nome</strong>, tipo de documento (<strong>CPF</strong> ou <strong>CNPJ</strong> com formatação automática). Opcionais: telefone, e-mail, endereço, contato e observações.</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">🔗 Vincular a Produto</h4>
                          <p>Ao cadastrar/editar um produto, ative "Tem Fornecedor?" e selecione na lista. Isso facilita o controle de origem dos produtos.</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Gerenciamento de Clientes */}
                  <AccordionItem value="clientes" className="border rounded-xl px-4 data-[state=open]:bg-muted/20 transition-colors">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">Gerenciamento de Clientes</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4">
                      <div className="space-y-3 ml-1">
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">👤 Cadastrar Cliente</h4>
                          <p>Menu → Clientes → Novo Cliente. Preencha: <strong>Nome</strong>, <strong>CPF</strong> (formatação automática), data de nascimento, endereço e telefone.</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">💳 Sistema de Fiado</h4>
                          <p>Na venda, selecione o cliente → escolha "Fiado" como pagamento. O valor fica como dívida. Para registrar pagamento: Clientes → ícone de dinheiro → digite o valor. Se pagar a mais, escolha devolver troco ou converter em crédito.</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">💰 Crédito Antecipado</h4>
                          <p>Cliente deposita valor adiantado que é usado automaticamente nas próximas compras. Ex: Deposita R$200, compra R$80, sobra R$120 de crédito.</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">📋 Histórico do Cliente</h4>
                          <p>Clique no cliente para ver todas as transações: compras, pagamentos e créditos depositados.</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Histórico de Vendas */}
                  <AccordionItem value="historico" className="border rounded-xl px-4 data-[state=open]:bg-muted/20 transition-colors">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <History className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">Histórico de Vendas</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4">
                      <div className="space-y-3 ml-1">
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">📋 Visualizar Vendas</h4>
                          <p>Menu → Histórico. Cada venda mostra: ID (ex: ML-000001), data/hora, cliente, valor total e forma de pagamento.</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">👁️ Detalhes e Lucro</h4>
                          <p>Clique no ícone de <strong>olho</strong> para ver todos os produtos vendidos, quantidades, preços e lucro por item.</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">📥 Recibo</h4>
                          <p>Ícone de download → escolha <strong>PDF</strong> (com logo) ou <strong>TXT</strong> (texto simples).</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">❌ Cancelar Venda</h4>
                          <p>Ícone de cancelar → confirme. O sistema devolve estoque, remove dívida do fiado e restaura crédito usado automaticamente.</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Relatórios */}
                  <AccordionItem value="relatorios" className="border rounded-xl px-4 data-[state=open]:bg-muted/20 transition-colors">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">Relatórios</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4">
                      <div className="space-y-3 ml-1">
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">📊 Gerar Relatório</h4>
                          <p>Menu → Relatórios → Defina data inicial e final → Clique "Filtrar". Ative "Ver todas as vendas" para período completo.</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">📈 Métricas Disponíveis</h4>
                          <p>• <strong>Faturamento:</strong> Total de vendas (quanto entrou)</p>
                          <p>• <strong>Lucro:</strong> Faturamento menos custo (quanto sobrou)</p>
                          <p>• <strong>Margem:</strong> % de lucro sobre faturamento</p>
                          <p>• <strong>Vendas:</strong> Quantidade total realizada</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Configurações da Loja */}
                  <AccordionItem value="config" className="border rounded-xl px-4 data-[state=open]:bg-muted/20 transition-colors">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <SettingsIcon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">Configurações da Loja</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4">
                      <div className="space-y-3 ml-1">
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">🏪 Informações da Loja</h4>
                          <p>Configurações → Informações da Loja. Preencha nome, telefone, endereço, categoria, logo e cor primária. Clique "Salvar".</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">📱 PIX Manual</h4>
                          <p>Configurações → PIX → Selecione "PIX Manual". Escolha tipo de chave (CPF, CNPJ, e-mail, telefone ou aleatória), digite a chave e o nome do recebedor.</p>
                        </div>
                        <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-accent" />
                            PIX Automático (Mercado Pago)
                          </h4>
                          <p>Selecione "PIX Automático" → Obtenha o Access Token em mercadopago.com.br/developers → Suas integrações → Criar aplicação → Copie o Access Token de Produção (APP_USR-...) → Cole e salve.</p>
                          <p className="text-accent font-medium mt-1">✅ QR Code dinâmico + confirmação automática + som de notificação</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">⚡ Ações Rápidas</h4>
                          <p>Ative em Configurações → Ações Rápidas. São atalhos com ícones no Dashboard para acessar funções rapidamente.</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Baixar o App */}
                  <AccordionItem value="app" className="border rounded-xl px-4 data-[state=open]:bg-muted/20 transition-colors">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Smartphone className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">Baixar o App no Celular</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4">
                      <div className="space-y-3 ml-1">
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">🤖 Android</h4>
                          <p>Configurações → Baixar App → "Instalar App". Ou use o menu do navegador (⋮) → "Adicionar à tela inicial".</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">🍎 iPhone/iPad</h4>
                          <p>Abra no Safari → Toque em Compartilhar (↑) → "Adicionar à Tela de Início" → Confirme.</p>
                        </div>
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs">
                          <p><strong>Vantagens:</strong> Acesso rápido, tela cheia sem barra do navegador e carregamento mais rápido.</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Sistema de Convite */}
                  <AccordionItem value="convite" className="border rounded-xl px-4 data-[state=open]:bg-muted/20 transition-colors">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-accent/10">
                          <Gift className="h-4 w-4 text-accent" />
                        </div>
                        <span className="font-medium text-sm">Sistema de Convite</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4">
                      <div className="space-y-3 ml-1">
                        <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">🎁 Benefícios</h4>
                          <p>• <strong>Você (quem convida):</strong> +30 dias grátis</p>
                          <p>• <strong>Seu amigo:</strong> 33 dias grátis (1 mês + 3 dias)</p>
                          <p>• Convide quantas pessoas quiser!</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">📤 Como Compartilhar</h4>
                          <p>Configurações → Meu Código de Convite → "Copiar" ou "Compartilhar" via WhatsApp, Instagram, etc.</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">📋 Regras</h4>
                          <p>Seu código pode ser usado por várias pessoas. Cada pessoa usa um código por dispositivo. Benefício aplicado no cadastro.</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Assinatura */}
                  <AccordionItem value="assinatura" className="border rounded-xl px-4 data-[state=open]:bg-muted/20 transition-colors">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <CreditCard className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">Assinatura e Planos</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4">
                      <div className="space-y-3 ml-1">
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">🆓 Período de Teste</h4>
                          <p>3 dias grátis ao criar conta. Com código de convite: <strong className="text-accent">33 dias grátis!</strong></p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">💳 Planos</h4>
                          <p>• <strong>3 Meses:</strong> R$ 29,99 (90 dias)</p>
                          <p>• <strong>1 Ano:</strong> R$ 69,99 (365 dias) — mais econômico!</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">📲 Como Assinar</h4>
                          <p>Menu → Assinatura → Escolha o plano → "Comprar com PIX" → Escaneie o QR Code → Pagamento confirmado em até 15 seg → Plano ativado com confete! 🎉</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <h4 className="font-semibold text-foreground">⏰ Quando Expira</h4>
                          <p>Você continua acessando o sistema, mas só pode visualizar dados. Para voltar a vender, renove a assinatura.</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </div>
    </PageLoader>
  );
};

export default Settings;
