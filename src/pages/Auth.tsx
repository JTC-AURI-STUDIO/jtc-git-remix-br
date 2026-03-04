import { useState, useEffect } from "react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, Gift, Eye, EyeOff, Loader2, CheckCircle2, XCircle, AlertTriangle, ChevronRight, ChevronLeft, HelpCircle, ExternalLink, ShoppingCart, Package, TrendingUp, Check, MapPin, Ticket, User } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { signIn, signUp, type SignUpData, validateInviteCode } from "@/lib/auth";
import { isValidCPF, isValidCNPJ } from "@/lib/cpfValidator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { fetchCEP, fetchEstados, fetchCidades, type Estado, type Cidade } from "@/lib/location";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auth state
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login state
  const [showUnconfirmedEmailUI, setShowUnconfirmedEmailUI] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [showBlockedAccountDialog, setShowBlockedAccountDialog] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [signupExpired, setSignupExpired] = useState(false);
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);


  // Register state
  const [registerStep, setRegisterStep] = useState(1);
  const [accountCreated, setAccountCreated] = useState(false);
  const [docType, setDocType] = useState<"cpf" | "cnpj">("cpf");
  const [formData, setFormData] = useState({
    fullName: "",
    cpf: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    cep: "",
    number: "",
  });
  const [addressData, setAddressData] = useState({
    street: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  // Persist form data for 24h (survives refresh/offline)
  const { clearPersisted: clearFormPersist } = useFormPersistence("auth_register", formData, setFormData);
  const { clearPersisted: clearAddressPersist } = useFormPersistence("auth_address", addressData, setAddressData);
  const [selectedEstado, setSelectedEstado] = useState("");
  const [selectedCidade, setSelectedCidade] = useState("");
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [isFetchingCEP, setIsFetchingCEP] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Invite code
  const [hasInviteCode, setHasInviteCode] = useState<boolean | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [codeValidationStatus, setCodeValidationStatus] = useState<"idle" | "valid" | "invalid" | "used">("idle");
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
  }, [navigate]);

  useEffect(() => {
    fetchEstados().then(setEstados);
  }, []);

  useEffect(() => {
    if (selectedEstado) {
      fetchCidades(selectedEstado).then(setCidades);
    } else {
      setCidades([]);
    }
  }, [selectedEstado]);

  // Countdown timer for unconfirmed email
  useEffect(() => {
    if (!showUnconfirmedEmailUI || !unconfirmedEmail) return;

    const fetchCreatedAt = async () => {
      const { data } = await (supabase.rpc as any)('get_profile_created_at_by_email', { p_email: unconfirmedEmail });
      if (!data || data.length === 0) return;

      const createdAt = new Date(data[0].created_at);
      const expiryDate = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

      const interval = setInterval(() => {
        const now = new Date();
        const diff = expiryDate.getTime() - now.getTime();

        if (diff <= 0) {
          clearInterval(interval);
          setSignupExpired(true);
          setCountdown(null);
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown({ hours, minutes, seconds });
      }, 1000);

      return () => clearInterval(interval);
    };

    fetchCreatedAt();
  }, [showUnconfirmedEmailUI, unconfirmedEmail]);

  const handleResendConfirmationEmail = async (email?: string) => {
    const targetEmail = email || formData.email;
    if (!targetEmail) return;

    setIsResendingConfirmation(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: targetEmail });
      if (error) throw error;
      toast({ title: "E-mail reenviado!", description: "Verifique sua caixa de entrada e a pasta de spam." });
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível reenviar o e-mail." });
    } finally {
      setIsResendingConfirmation(false);
    }
  };

  const validateCode = async (code: string) => {
    if (code.length < 6) {
      setCodeValidationStatus("idle");
      return;
    }
    setIsValidatingCode(true);
    const result = await validateInviteCode(code);
    if (result.valid) {
      setCodeValidationStatus("valid");
    } else if (result.alreadyUsed) {
      setCodeValidationStatus("used");
    } else {
      setCodeValidationStatus("invalid");
    }
    setIsValidatingCode(false);
  };

  const handleInviteCodeChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setInviteCode(upperValue);
    if (upperValue.length >= 6) {
      validateCode(upperValue);
    } else {
      setCodeValidationStatus("idle");
    }
  };

  const handleCEPChange = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length === 8) {
      setIsFetchingCEP(true);
      const data = await fetchCEP(cleanCEP);
      if (data) {
        setAddressData(prev => ({
          ...prev,
          city: data.localidade,
          state: data.uf,
        }));
        setSelectedEstado(data.uf);
        setSelectedCidade(data.localidade);
        toast({ title: "CEP encontrado!", description: "Endereço preenchido automaticamente." });
      } else {
        toast({ variant: "destructive", title: "CEP não encontrado", description: "Verifique o CEP digitado." });
      }
      setIsFetchingCEP(false);
    }
  };

  const formatCPFInput = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    let formatted = v;
    if (v.length > 3) formatted = v.slice(0, 3) + "." + v.slice(3);
    if (v.length > 6) formatted = formatted.slice(0, 7) + "." + formatted.slice(7);
    if (v.length > 9) formatted = formatted.slice(0, 11) + "-" + formatted.slice(11);
    return formatted;
  };

  const formatCNPJInput = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 14) v = v.slice(0, 14);
    let formatted = v;
    if (v.length > 2) formatted = v.slice(0, 2) + "." + v.slice(2);
    if (v.length > 5) formatted = formatted.slice(0, 6) + "." + formatted.slice(6);
    if (v.length > 8) formatted = formatted.slice(0, 10) + "/" + formatted.slice(10);
    if (v.length > 12) formatted = formatted.slice(0, 15) + "-" + formatted.slice(15);
    return formatted;
  };

  const formatDocInput = (value: string) => {
    return docType === "cpf" ? formatCPFInput(value) : formatCNPJInput(value);
  };

  const formatPhone = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    let formatted = v;
    if (v.length > 0) formatted = "(" + v;
    if (v.length > 2) formatted = "(" + v.slice(0, 2) + ") " + v.slice(2);
    if (v.length > 7) formatted = "(" + v.slice(0, 2) + ") " + v.slice(2, 7) + "-" + v.slice(7);
    return formatted;
  };

  const formatCEPInput = (value: string) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 5) return v.slice(0, 5) + "-" + v.slice(5);
    return v;
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    const formDataEvent = new FormData(e.currentTarget);
    const identifier = formDataEvent.get("identifier") as string;
    const password = formDataEvent.get("password") as string;

    try {
      const cleanIdentifier = identifier.replace(/\D/g, "");
      const isCPF = /^\d{11}$/.test(cleanIdentifier);

      if (isCPF) {
        const { data: isBlocked } = await (supabase.rpc as any)('is_cpf_blocked', { check_cpf: cleanIdentifier });
        if (isBlocked) {
          setShowBlockedAccountDialog(true);
          setIsLoading(false);
          return;
        }
      }

      await signIn(identifier, password);
      toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
      navigate("/dashboard");
    } catch (error: any) {
      const errorMessage = error.message?.toLowerCase() || "";
      if (errorMessage.includes("email not confirmed") || errorMessage.includes("email_not_confirmed")) {
        const formDataEvent2 = new FormData(e.currentTarget);
        const usedIdentifier = formDataEvent2.get("identifier") as string;
        const cleanId = usedIdentifier.replace(/\D/g, "");
        const isCPF = /^\d{11}$/.test(cleanId);

        if (isCPF) {
          const { data } = await (supabase.rpc as any)('get_user_email_by_cpf', { search_cpf: cleanId });
          if (data && data.length > 0) setUnconfirmedEmail(data[0].email);
        } else {
          setUnconfirmedEmail(usedIdentifier);
        }
        setShowUnconfirmedEmailUI(true);
      } else if (errorMessage.includes("invalid login credentials") || errorMessage.includes("invalid_credentials") || errorMessage.includes("invalid api key") || errorMessage.includes("invalid claim")) {
        setAuthError("E-mail/CPF ou senha incorretos. Verifique seus dados e tente novamente.");
      } else if (errorMessage.includes("cpf não encontrado")) {
        setAuthError("CPF não encontrado. Verifique se digitou corretamente ou crie uma conta.");
      } else if (errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("failed")) {
        setAuthError("Erro de conexão. Verifique sua internet e tente novamente.");
      } else {
        setAuthError("E-mail/CPF ou senha incorretos. Verifique seus dados e tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivateAccount = () => {
    const message = encodeURIComponent("Olá 👋 gostaria de solicitar a reativação da minha conta do JTC FLUX PDV 🔄💻. Desde já, agradeço 🙏");
    window.open(`https://wa.me/5598981091476?text=${message}`, "_blank");
    setShowBlockedAccountDialog(false);
  };

  const getEmailProvider = (email: string): "gmail" | "outlook" | "unknown" => {
    const lowerEmail = email.toLowerCase();
    if (lowerEmail.includes("@gmail.com")) return "gmail";
    if (lowerEmail.includes("@outlook.com") || lowerEmail.includes("@hotmail.com") || lowerEmail.includes("@live.com")) return "outlook";
    return "unknown";
  };

  const isValidEmailProvider = (email: string): boolean => {
    const provider = getEmailProvider(email);
    return provider === "gmail" || provider === "outlook";
  };

  const openEmailApp = () => {
    const provider = getEmailProvider(formData.email);
    if (provider === "gmail") window.open("https://mail.google.com", "_blank");
    else if (provider === "outlook") window.open("https://outlook.live.com", "_blank");
  };

  const validateStep1 = () => {
    if (!formData.fullName.trim()) { setAuthError(docType === "cnpj" ? "Nome fantasia da empresa é obrigatório." : "Nome completo é obrigatório."); return false; }
    const docValue = formData.cpf.replace(/\D/g, "");
    if (docType === "cpf") {
      if (!isValidCPF(docValue)) { setAuthError("CPF inválido. Verifique os números digitados."); return false; }
    } else {
      if (!isValidCNPJ(docValue)) { setAuthError("CNPJ inválido. Verifique os números digitados."); return false; }
    }
    if (!formData.email.includes("@")) { setAuthError("E-mail inválido. Digite um e-mail válido."); return false; }
    if (!isValidEmailProvider(formData.email)) { setAuthError("Só aceitamos e-mails @gmail.com ou @outlook.com."); return false; }
    const phoneValue = formData.phone.replace(/\D/g, "");
    if (phoneValue.length !== 11) { setAuthError("Telefone deve ter 11 dígitos (DDD + número)."); return false; }
    if (formData.password.length < 6) { setAuthError("Senha deve ter no mínimo 6 caracteres."); return false; }
    if (formData.password !== formData.confirmPassword) { setAuthError("As senhas não coincidem. Verifique e tente novamente."); return false; }
    setAuthError(null);
    return true;
  };

  const validateStep2 = () => {
    const cepValue = formData.cep.replace(/\D/g, "");
    if (cepValue.length !== 8) { setAuthError("CEP inválido. Digite um CEP com 8 dígitos."); return false; }
    if (!addressData.street.trim()) { setAuthError("Rua é obrigatória."); return false; }
    if (!formData.number.trim()) { setAuthError("Número é obrigatório."); return false; }
    if (!addressData.neighborhood.trim()) { setAuthError("Bairro é obrigatório."); return false; }
    if (!selectedEstado) { setAuthError("Estado é obrigatório."); return false; }
    if (!selectedCidade) { setAuthError("Cidade é obrigatória."); return false; }
    setAuthError(null);
    return true;
  };

  const handleNextStep = () => {
    setAuthError(null);
    if (registerStep === 1 && validateStep1()) setRegisterStep(2);
    else if (registerStep === 2 && validateStep2()) setRegisterStep(3);
  };

  const handleGoToEmailVerification = async () => {
    if (hasInviteCode && inviteCode && codeValidationStatus !== "valid") {
      setAuthError("Código de convite inválido. Verifique e tente novamente.");
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const cpfValue = formData.cpf.replace(/\D/g, "");
      const { data: isBlocked, error: blockError } = await (supabase.rpc as any)('is_cpf_blocked', { check_cpf: cpfValue });
      if (!blockError && isBlocked) {
        setAuthError("Este CPF está bloqueado e não pode ser utilizado para criar uma nova conta.");
        setIsLoading(false);
        return;
      }

      if (hasInviteCode && inviteCode && codeValidationStatus === "valid") {
        try {
          const response = await supabase.functions.invoke('validate-invite-ip', {
            body: { invite_code: inviteCode, action: 'check' }
          });
          if (!response.error && !response.data.can_use) {
            setAuthError(response.data.message || "Este dispositivo já utilizou este código de convite.");
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error('Erro ao verificar IP:', error);
        }
      }

      const data: SignUpData = {
        fullName: formData.fullName,
        cpf: cpfValue,
        email: formData.email,
        phone: formData.phone,
        cep: formData.cep,
        street: addressData.street,
        number: formData.number,
        neighborhood: addressData.neighborhood,
        city: selectedCidade,
        state: selectedEstado,
        password: formData.password,
        referredByCode: hasInviteCode && codeValidationStatus === "valid" ? inviteCode : undefined,
      };

      await signUp(data);

      if (hasInviteCode && inviteCode && codeValidationStatus === "valid") {
        await supabase.functions.invoke('validate-invite-ip', {
          body: { invite_code: inviteCode, action: 'register' }
        });
      }

      clearFormPersist();
      clearAddressPersist();
      setAccountCreated(true);
      setRegisterStep(4);
      toast({ title: "Conta criada!", description: "Enviamos um link de confirmação para seu e-mail." });

    } catch (error: any) {
      const errorMsg = (error.message || "").toLowerCase();
      if (errorMsg.includes("já está cadastrado") || errorMsg.includes("esqueceu sua senha")) {
        setAuthError("Este e-mail já está cadastrado. Se você esqueceu sua senha, tente recuperá-la na tela de login.");
      } else if (
        errorMsg.includes("já existe um usuário cadastrado") ||
        errorMsg.includes("user already registered") ||
        errorMsg.includes("email address is already registered") ||
        errorMsg.includes("already been registered")
      ) {
        setAuthError("Este e-mail ou CPF já está em uso. Se você já se cadastrou, verifique seu e-mail (e spam) para confirmar. Após 24 horas sem confirmação, o cadastro será liberado.");
      } else {
        setAuthError(error.message || "Não foi possível criar sua conta. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousStep = () => {
    if (registerStep > 1) setRegisterStep(registerStep - 1);
  };

  const resetForm = () => {
    clearFormPersist();
    clearAddressPersist();
    setRegisterStep(1);
    setDocType("cpf");
    setFormData({ fullName: "", cpf: "", email: "", phone: "", password: "", confirmPassword: "", cep: "", number: "" });
    setAddressData({ street: "", neighborhood: "", city: "", state: "" });
    setSelectedEstado("");
    setSelectedCidade("");
    setHasInviteCode(null);
    setInviteCode("");
    setCodeValidationStatus("idle");
    setAccountCreated(false);
  };

  const StepIndicator = ({ step, label, icon: Icon }: { step: number; label: string; icon: any }) => (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-500 ${
        registerStep === step
          ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-110"
          : registerStep > step
            ? "bg-gradient-to-br from-accent to-accent/80 text-white shadow-md shadow-accent/20"
            : "bg-muted/50 text-muted-foreground border border-border/50"
      }`}>
        {registerStep > step ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
      </div>
      <span className={`text-xs font-semibold transition-colors duration-300 ${
        registerStep === step ? "text-primary" : registerStep > step ? "text-accent" : "text-muted-foreground"
      }`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="auth-page-bg">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
        <div className="auth-orb auth-orb-4" />
        <div className="auth-grid-overlay" />
      </div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-20 items-center relative z-10">
        {/* Branding section */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 p-8">
          <div className="space-y-8">
            <div className="flex items-center gap-7">
              <div className="relative group">
                <div className="absolute -inset-3 bg-gradient-to-r from-primary via-accent to-primary rounded-full blur-lg opacity-50 group-hover:opacity-70 transition-all duration-700 animate-[pulse_3s_ease-in-out_infinite]" />
                <div className="relative">
                  <img src={logo} alt="JTC FluxPDV" className="relative w-32 h-32 rounded-full object-cover shadow-2xl ring-2 ring-white/20" />
                  <div className="absolute -bottom-1 -right-1 w-11 h-11 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg shadow-accent/30">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="text-5xl xl:text-6xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">JTC FluxPDV</span>
                </h1>
                <p className="text-lg text-muted-foreground/90 font-normal max-w-xs">
                  O sistema de gestão que sua loja merece
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { icon: ShoppingCart, title: "PDV Rápido e Intuitivo", desc: "Vendas em segundos com interface simplificada", gradient: "from-primary to-primary/70", shadow: "shadow-primary/20" },
              { icon: Package, title: "Controle de Estoque", desc: "Gerencie produtos e fornecedores facilmente", gradient: "from-accent to-accent/70", shadow: "shadow-accent/20" },
              { icon: TrendingUp, title: "Relatórios Inteligentes", desc: "Métricas e insights para seu negócio crescer", gradient: "from-success to-success/70", shadow: "shadow-success/20" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-5 p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-xl group cursor-pointer"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0 shadow-lg ${item.shadow} group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-5 p-5 rounded-2xl bg-gradient-to-r from-accent/15 to-accent/5 border border-accent/30 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <Gift className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="font-bold text-foreground">Programa de Indicação</p>
              <p className="text-sm text-muted-foreground">
                Convide amigos e ganhe <span className="text-accent font-bold">1 mês grátis</span>!
              </p>
            </div>
          </div>
        </div>

        {/* Form card */}
        <Card className="auth-card">
          <div className="auth-card-glow-tr" />
          <div className="auth-card-glow-bl" />

          <CardHeader className="text-center pb-4 pt-8 relative z-10">
            <div className="flex flex-col items-center gap-5 mb-2">
              <div className="relative group">
                <div className="auth-logo-glow" />
                <img src={logo} alt="JTC FluxPDV" className="relative w-20 h-20 rounded-full object-cover shadow-xl ring-2 ring-white/10" />
              </div>
              <div className="text-center space-y-1">
                <CardTitle className="text-3xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">JTC FluxPDV</CardTitle>
                <CardDescription className="text-base text-muted-foreground">Acesse sua conta ou crie uma nova</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative z-10 px-6 pb-8">
            <Tabs defaultValue="login" className="w-full" onValueChange={() => { setRegisterStep(1); setAuthError(null); }}>
              <TabsList className="grid w-full grid-cols-2 mb-8 p-1.5 bg-muted/30 rounded-xl h-14">
                <TabsTrigger value="login" className="auth-tab font-bold text-base rounded-lg transition-all duration-300">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="register" className="auth-tab font-bold text-base rounded-lg transition-all duration-300">
                  Criar Conta
                </TabsTrigger>
              </TabsList>

              {/* LOGIN TAB */}
              <TabsContent value="login" className="space-y-6">
                {showUnconfirmedEmailUI ? (
                  <div className="space-y-5">
                    <div className="text-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${signupExpired ? "bg-green-500/10" : "bg-amber-500/10"}`}>
                        <Mail className={`w-10 h-10 ${signupExpired ? "text-green-500" : "text-amber-500"}`} />
                      </div>
                      <h3 className={`font-semibold text-xl ${signupExpired ? "text-green-600" : "text-amber-600"}`}>
                        {signupExpired ? "Cadastro liberado!" : "E-mail não confirmado"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        {signupExpired
                          ? "O prazo de verificação expirou. Agora você pode criar uma nova conta com este e-mail ou CPF."
                          : "Você ainda não confirmou seu e-mail:"}
                      </p>
                      {!signupExpired && (
                        <p className="font-bold text-primary text-base mt-1 break-all">{unconfirmedEmail}</p>
                      )}
                    </div>

                    {!signupExpired && (
                      <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30 space-y-3">
                        <p className="text-sm text-amber-700 dark:text-amber-400 text-center">
                          ⚠️ Confirme seu e-mail para acessar a conta.
                        </p>
                        {countdown ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex flex-col items-center bg-amber-500/20 rounded-lg px-3 py-2 min-w-[52px]">
                              <span className="text-xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
                                {String(countdown.hours).padStart(2, "0")}
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium uppercase tracking-wide">horas</span>
                            </div>
                            <span className="text-amber-600 font-bold text-xl">:</span>
                            <div className="flex flex-col items-center bg-amber-500/20 rounded-lg px-3 py-2 min-w-[52px]">
                              <span className="text-xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
                                {String(countdown.minutes).padStart(2, "0")}
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium uppercase tracking-wide">min</span>
                            </div>
                            <span className="text-amber-600 font-bold text-xl">:</span>
                            <div className="flex flex-col items-center bg-amber-500/20 rounded-lg px-3 py-2 min-w-[52px]">
                              <span className="text-xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
                                {String(countdown.seconds).padStart(2, "0")}
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium uppercase tracking-wide">seg</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-amber-600 dark:text-amber-500 text-center">Calculando tempo restante...</p>
                        )}
                        <p className="text-xs text-amber-600 dark:text-amber-500 text-center">
                          Após este tempo, e-mail e CPF ficam livres para novo cadastro.
                        </p>
                      </div>
                    )}

                    {signupExpired ? (
                      <Button
                        type="button"
                        className="w-full h-14 text-base font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                        onClick={() => {
                          setShowUnconfirmedEmailUI(false);
                          setUnconfirmedEmail("");
                          setSignupExpired(false);
                          setCountdown(null);
                          const registerTab = document.querySelector('[data-value="register"]') as HTMLButtonElement;
                          registerTab?.click();
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Criar Nova Conta
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          onClick={() => {
                            const provider = getEmailProvider(unconfirmedEmail);
                            if (provider === "gmail") window.open("https://mail.google.com", "_blank");
                            else if (provider === "outlook") window.open("https://outlook.live.com", "_blank");
                          }}
                          className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary to-primary/80"
                        >
                          <ExternalLink className="mr-2 h-5 w-5" />
                          {getEmailProvider(unconfirmedEmail) === "gmail" ? "Abrir Gmail" : "Abrir Outlook"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleResendConfirmationEmail(unconfirmedEmail)}
                          className="w-full h-12"
                          disabled={isResendingConfirmation}
                        >
                          {isResendingConfirmation ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reenviando...</>
                          ) : (
                            "Reenviar e-mail de confirmação"
                          )}
                        </Button>
                      </>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowUnconfirmedEmailUI(false);
                        setUnconfirmedEmail("");
                        setSignupExpired(false);
                        setCountdown(null);
                      }}
                      className="w-full h-12"
                    >
                      Voltar para o Login
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="identifier" className="text-sm font-semibold text-foreground/90">E-mail ou CPF</Label>
                      <Input
                        id="identifier"
                        name="identifier"
                        placeholder="seu@email.com ou 000.000.000-00"
                        required
                        disabled={isLoading}
                        className="h-14 text-base bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl pl-5 placeholder:text-muted-foreground/50 transition-all duration-300"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="relative group">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          required
                          disabled={isLoading}
                          className="h-14 text-base pr-14 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl pl-5 placeholder:text-muted-foreground/50 transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors duration-200 p-1"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Errors shown via modal */}

                    <Button
                      type="submit"
                      className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 rounded-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Entrando...</>
                      ) : (
                        "Entrar na Conta"
                      )}
                    </Button>
                  </form>
                )}

                <div className="lg:hidden pt-6 border-t border-border/30 mt-6">
                  <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20">
                    <Gift className="w-6 h-6 text-accent" />
                    <span className="text-sm text-muted-foreground">Convide amigos e ganhe <strong className="text-accent font-bold">1 mês grátis</strong>!</span>
                  </div>
                </div>
              </TabsContent>

              {/* REGISTER TAB */}
              <TabsContent value="register" className="space-y-5">
                <div className="flex justify-center items-center gap-3 mb-8 py-2">
                  <StepIndicator step={1} label="Dados" icon={User} />
                  <div className={`flex-1 h-1 rounded-full max-w-10 transition-all duration-500 ${registerStep > 1 ? 'bg-gradient-to-r from-accent to-accent/70' : 'bg-muted/50'}`} />
                  <StepIndicator step={2} label="Endereço" icon={MapPin} />
                  <div className={`flex-1 h-1 rounded-full max-w-10 transition-all duration-500 ${registerStep > 2 ? 'bg-gradient-to-r from-accent to-accent/70' : 'bg-muted/50'}`} />
                  <StepIndicator step={3} label="Código" icon={Ticket} />
                  <div className={`flex-1 h-1 rounded-full max-w-10 transition-all duration-500 ${registerStep > 3 ? 'bg-gradient-to-r from-accent to-accent/70' : 'bg-muted/50'}`} />
                  <StepIndicator step={4} label="E-mail" icon={Mail} />
                </div>

                {/* Step 1 */}
                {registerStep === 1 && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="text-center mb-6">
                      <h3 className="font-bold text-xl text-foreground">Dados Pessoais</h3>
                      <p className="text-sm text-muted-foreground mt-1">Preencha suas informações básicas</p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="fullName" className="text-sm font-semibold text-foreground/90">
                        {docType === "cnpj" ? "Nome Fantasia da Empresa" : "Nome Completo"}
                      </Label>
                      <Input
                        id="fullName"
                        placeholder={docType === "cnpj" ? "Digite o nome fantasia da empresa" : "Digite seu nome completo"}
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                        disabled={isLoading}
                        className="h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground/90">Tipo de Cadastro</Label>
                      <RadioGroup
                        value={docType}
                        onValueChange={(val: "cpf" | "cnpj") => {
                          setDocType(val);
                          setFormData({ ...formData, cpf: "" });
                          setCpfError(null);
                        }}
                        className="flex gap-6"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="cpf" id="doc-cpf" />
                          <Label htmlFor="doc-cpf" className="text-sm font-medium cursor-pointer">CPF</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="cnpj" id="doc-cnpj" />
                          <Label htmlFor="doc-cnpj" className="text-sm font-medium cursor-pointer">CNPJ</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="cpf" className="text-sm font-semibold text-foreground/90">{docType === "cpf" ? "CPF" : "CNPJ"}</Label>
                      <Input
                        id="cpf"
                        placeholder={docType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                        value={formData.cpf}
                        onChange={(e) => {
                          const formatted = formatDocInput(e.target.value);
                          setFormData({ ...formData, cpf: formatted });
                          const clean = formatted.replace(/\D/g, "");
                          const expectedLen = docType === "cpf" ? 11 : 14;
                          if (clean.length === expectedLen) {
                            const isValid = docType === "cpf" ? isValidCPF(clean) : isValidCNPJ(clean);
                            setCpfError(!isValid ? `${docType.toUpperCase()} inválido` : null);
                          } else {
                            setCpfError(null);
                          }
                        }}
                        required
                        disabled={isLoading}
                        inputMode="numeric"
                        maxLength={docType === "cpf" ? 14 : 18}
                        className={`h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300 ${cpfError ? "border-destructive ring-destructive/20" : ""}`}
                      />
                      {cpfError && <p className="text-xs text-destructive font-medium">{cpfError}</p>}
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="email" className="text-sm font-semibold text-foreground/90">E-mail</Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          disabled={isLoading}
                          className={`h-12 bg-muted/30 border-border/40 focus:ring-2 rounded-xl transition-all duration-300 pr-28 ${
                            getEmailProvider(formData.email) === "gmail"
                              ? "focus:border-red-400 focus:ring-red-400/20 border-red-400/50"
                              : getEmailProvider(formData.email) === "outlook"
                              ? "focus:border-blue-400 focus:ring-blue-400/20 border-blue-400/50"
                              : (() => { const d = formData.email.split("@")[1] || ""; return formData.email.includes("@") && d.includes("."); })() && getEmailProvider(formData.email) === "unknown"
                              ? "focus:border-destructive focus:ring-destructive/20 border-destructive/50"
                              : "focus:border-primary focus:ring-primary/20"
                          }`}
                        />
                        {(() => {
                          const provider = getEmailProvider(formData.email);
                          const domain = formData.email.split("@")[1] || "";
                          const hasDot = formData.email.includes("@") && domain.includes(".");
                          return (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {provider === "gmail" && (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-400/30 text-red-500 text-xs font-bold">
                                  <span className="text-base leading-none">G</span> Gmail
                                </span>
                              )}
                              {provider === "outlook" && (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-400/30 text-blue-500 text-xs font-bold">
                                  <span className="text-base leading-none">⊞</span> Outlook
                                </span>
                              )}
                              {provider === "unknown" && hasDot && (
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold">
                                  ✕ Inválido
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      {(() => {
                        const provider = getEmailProvider(formData.email);
                        const domain = formData.email.split("@")[1] || "";
                        const hasDot = formData.email.includes("@") && domain.includes(".");
                        return provider === "unknown" && hasDot ? (
                          <p className="text-xs text-destructive font-medium">Apenas @gmail.com ou @outlook.com são aceitos</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Apenas @gmail.com ou @outlook.com</p>
                        );
                      })()}
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="phone" className="text-sm font-semibold text-foreground/90">Telefone</Label>
                      <Input
                        id="phone"
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          setFormData({ ...formData, phone: formatted });
                          const clean = formatted.replace(/\D/g, "");
                          if (clean.length > 0 && clean.length < 11) {
                            setPhoneError("Telefone deve ter 11 dígitos");
                          } else {
                            setPhoneError(null);
                          }
                        }}
                        required
                        disabled={isLoading}
                        inputMode="numeric"
                        maxLength={15}
                        className={`h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300 ${phoneError ? "border-destructive ring-destructive/20" : ""}`}
                      />
                      {phoneError && <p className="text-xs text-destructive font-medium">{phoneError}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="password" className="text-sm font-semibold text-foreground/90">Senha</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Min. 6 caracteres"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            disabled={isLoading}
                            className="h-12 pr-11 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors duration-200"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground/90">Confirmar</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Repita a senha"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                            disabled={isLoading}
                            className={`h-12 pr-11 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300 ${formData.confirmPassword.length > 0 ? (formData.password === formData.confirmPassword ? "border-green-500 ring-green-500/20" : "border-destructive ring-destructive/20") : ""}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors duration-200"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {formData.confirmPassword.length > 0 && (
                      <div className={`flex items-center gap-2 text-xs font-medium ${formData.password === formData.confirmPassword ? "text-green-600" : "text-destructive"}`}>
                        {formData.password === formData.confirmPassword ? (
                          <><CheckCircle2 className="h-4 w-4" /><span>As senhas coincidem</span></>
                        ) : (
                          <><XCircle className="h-4 w-4" /><span>As senhas não coincidem</span></>
                        )}
                      </div>
                    )}

                    {/* Errors shown via modal */}

                    <Button
                      type="button"
                      onClick={handleNextStep}
                      className="w-full h-14 text-base font-bold mt-6 bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 rounded-full"
                      disabled={isLoading}
                    >
                      Próximo
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                )}

                {/* Step 2 */}
                {registerStep === 2 && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="text-center mb-6">
                      <h3 className="font-bold text-xl text-foreground">Endereço</h3>
                      <p className="text-sm text-muted-foreground mt-1">Digite o CEP para preenchimento automático</p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="cep" className="text-sm font-semibold text-foreground/90">CEP</Label>
                      <div className="relative">
                        <Input
                          id="cep"
                          placeholder="00000-000"
                          value={formData.cep}
                          onChange={(e) => {
                            const formatted = formatCEPInput(e.target.value);
                            setFormData({ ...formData, cep: formatted });
                            handleCEPChange(formatted);
                          }}
                          maxLength={9}
                          required
                          disabled={isLoading || isFetchingCEP}
                          inputMode="numeric"
                          className="h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                        />
                        {isFetchingCEP && (
                          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="street" className="text-sm font-semibold text-foreground/90">Rua</Label>
                      <Input
                        id="street"
                        placeholder="Nome da rua"
                        value={addressData.street}
                        onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                        required
                        disabled={isLoading}
                        className="h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="number" className="text-sm font-semibold text-foreground/90">Número</Label>
                        <Input
                          id="number"
                          placeholder="Nº"
                          value={formData.number}
                          onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                          required
                          disabled={isLoading}
                          className="h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="neighborhood" className="text-sm font-semibold text-foreground/90">Bairro</Label>
                        <Input
                          id="neighborhood"
                          placeholder="Seu bairro"
                          value={addressData.neighborhood}
                          onChange={(e) => setAddressData({ ...addressData, neighborhood: e.target.value })}
                          required
                          disabled={isLoading}
                          className="h-12 bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-foreground/90">Estado</Label>
                        <Select value={selectedEstado} onValueChange={setSelectedEstado} disabled={isLoading}>
                          <SelectTrigger className="h-12 bg-muted/30 border-border/40 rounded-xl">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50 rounded-xl">
                            {estados.map((estado) => (
                              <SelectItem key={estado.id} value={estado.sigla}>
                                {estado.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-foreground/90">Cidade</Label>
                        <Select value={selectedCidade} onValueChange={setSelectedCidade} disabled={isLoading || !selectedEstado}>
                          <SelectTrigger className="h-12 bg-muted/30 border-border/40 rounded-xl">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50 max-h-[300px] rounded-xl">
                            {cidades.map((cidade) => (
                              <SelectItem key={cidade.id} value={cidade.nome}>
                                {cidade.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Errors shown via modal */}

                    <div className="flex gap-3 mt-6">
                      <Button type="button" variant="outline" onClick={handlePreviousStep} className="flex-1 h-14 rounded-xl border-border/50 hover:bg-muted/50" disabled={isLoading}>
                        <ChevronLeft className="mr-2 h-5 w-5" />Voltar
                      </Button>
                      <Button type="button" onClick={handleNextStep} className="flex-1 h-14 rounded-full bg-gradient-to-r from-primary via-primary to-primary/90 shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300" disabled={isLoading}>
                        Próximo<ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3 */}
                {registerStep === 3 && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="text-center mb-6">
                      <h3 className="font-bold text-xl text-foreground">Código de Convite</h3>
                      <p className="text-sm text-muted-foreground mt-1">Você tem um código de convite de um amigo?</p>
                    </div>

                    {hasInviteCode === null ? (
                      <div className="space-y-5">
                        <div className="flex gap-4">
                          <Button type="button" variant="outline" className="flex-1 h-16 border-2 border-accent/50 text-accent hover:bg-accent/10 hover:border-accent font-bold text-base rounded-xl transition-all duration-300" onClick={() => setHasInviteCode(true)}>
                            <Gift className="mr-2 h-6 w-6" />Sim, tenho!
                          </Button>
                          <Button type="button" variant="outline" className="flex-1 h-16 border-border/50 hover:bg-muted/50 font-medium text-base rounded-xl" onClick={() => setHasInviteCode(false)}>
                            Não tenho
                          </Button>
                        </div>
                      </div>
                    ) : hasInviteCode ? (
                      <div className="space-y-5">
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-foreground/90">Digite o código</Label>
                          <div className="relative">
                            <Input
                              value={inviteCode}
                              onChange={(e) => handleInviteCodeChange(e.target.value)}
                              placeholder="Ex: ABC123"
                              maxLength={8}
                              className="h-16 uppercase font-mono text-2xl tracking-[0.3em] text-center bg-muted/30 border-border/40 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all duration-300"
                              disabled={isLoading}
                              autoCapitalize="characters"
                              style={{ textTransform: 'uppercase' }}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              {isValidatingCode && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                              {!isValidatingCode && codeValidationStatus === "valid" && <CheckCircle2 className="h-7 w-7 text-accent" />}
                              {!isValidatingCode && (codeValidationStatus === "invalid" || codeValidationStatus === "used") && <XCircle className="h-7 w-7 text-destructive" />}
                            </div>
                          </div>
                          {codeValidationStatus === "valid" && (
                            <div className="bg-gradient-to-r from-accent/15 to-accent/5 p-4 rounded-xl border border-accent/30 text-center">
                              <p className="text-sm text-accent font-bold">🎉 Código válido! Você ganhará 1 mês + 3 dias grátis!</p>
                            </div>
                          )}
                          {codeValidationStatus === "invalid" && (
                            <div className="bg-destructive/10 p-4 rounded-xl border border-destructive/30 text-center">
                              <p className="text-sm text-destructive font-medium">Código inválido. Verifique e tente novamente.</p>
                            </div>
                          )}
                          {codeValidationStatus === "used" && (
                            <div className="bg-destructive/10 p-4 rounded-xl border border-destructive/30 text-center">
                              <p className="text-sm text-destructive font-medium">Este código já foi utilizado.</p>
                            </div>
                          )}
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-full" onClick={() => { setHasInviteCode(false); setInviteCode(""); setCodeValidationStatus("idle"); }}>
                          Na verdade, não tenho código
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-muted/20 rounded-2xl p-6 border border-border/30 text-center">
                        <p className="text-muted-foreground">
                          Sem código? Sem problema! Você ainda ganha <strong className="text-foreground">3 dias grátis</strong>.
                        </p>
                        <Button type="button" variant="ghost" size="sm" className="mt-4 text-accent hover:text-accent hover:bg-accent/10 font-medium" onClick={() => setHasInviteCode(true)}>
                          Na verdade, tenho um código!
                        </Button>
                      </div>
                    )}

                    {/* Errors shown via modal */}

                    <div className="flex gap-3 mt-8">
                      <Button type="button" variant="outline" onClick={handlePreviousStep} className="flex-1 h-14 rounded-xl border-border/50 hover:bg-muted/50" disabled={isLoading}>
                        <ChevronLeft className="mr-2 h-5 w-5" />Voltar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleGoToEmailVerification}
                        className="flex-1 h-14 rounded-full bg-gradient-to-r from-primary via-primary to-primary/90 shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
                        disabled={isLoading || hasInviteCode === null || (hasInviteCode && codeValidationStatus !== "valid" && inviteCode.length > 0)}
                      >
                        Próximo<ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>

                    <p className="text-xs text-center text-muted-foreground pt-2">
                      {hasInviteCode && codeValidationStatus === "valid"
                        ? "Você ganhará 1 mês + 3 dias de teste grátis! 🎉"
                        : "Você ganhará 3 dias de teste grátis"}
                    </p>
                  </div>
                )}

                {/* Step 4 */}
                {registerStep === 4 && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="text-center mb-6">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/10">
                        <Mail className="w-12 h-12 text-primary" />
                      </div>
                      <h3 className="font-bold text-2xl text-foreground">
                        Confirme seu E-mail
                      </h3>
                      <p className="text-sm text-muted-foreground mt-3">Enviamos um link de confirmação para:</p>
                      <p className="font-bold text-primary text-lg mt-2 break-all bg-primary/5 py-2 px-4 rounded-lg inline-block">
                        {formData.email}
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-destructive/15 to-destructive/5 rounded-xl p-5 border border-destructive/30">
                      <p className="text-sm text-destructive text-center font-bold">
                        ⚠️ Sua conta só será ativada após confirmar o e-mail!
                      </p>
                      <p className="text-xs text-destructive/80 text-center mt-2">
                        Sem a confirmação, você não conseguirá fazer login.
                      </p>
                    </div>

                    <div className="bg-muted/20 rounded-xl p-4 border border-border/30 text-center">
                      <p className="text-sm text-muted-foreground">
                        Verifique também a pasta de <strong>spam</strong>. Só aceitamos <span className="text-primary font-semibold">@gmail.com</span> ou <span className="text-primary font-semibold">@outlook.com</span>
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={openEmailApp}
                      className="w-full h-16 text-lg font-bold bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary shadow-xl hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 rounded-xl"
                    >
                      <ExternalLink className="mr-3 h-6 w-6" />
                      {getEmailProvider(formData.email) === "gmail" ? "Abrir Gmail" : "Abrir Outlook"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (session?.user?.email_confirmed_at) {
                            toast({ title: "E-mail confirmado!", description: "Redirecionando para o dashboard..." });
                            navigate("/dashboard");
                            return;
                          }
                          // Tenta fazer login para verificar se já confirmou
                          const { data, error } = await supabase.auth.signInWithPassword({
                            email: formData.email,
                            password: formData.password,
                          });
                          if (!error && data?.user?.email_confirmed_at) {
                            toast({ title: "E-mail confirmado!", description: "Redirecionando para o dashboard..." });
                            navigate("/dashboard");
                          } else {
                            if (!error && data?.session) await supabase.auth.signOut();
                            toast({ variant: "destructive", title: "E-mail ainda não confirmado", description: "Clique no link que enviamos para seu e-mail antes de continuar." });
                          }
                        } catch {
                          toast({ variant: "destructive", title: "E-mail ainda não confirmado", description: "Clique no link que enviamos para seu e-mail." });
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="w-full h-14 rounded-xl border-primary/50 text-primary hover:bg-primary/10 font-bold"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Verificando...</>
                      ) : (
                        <><CheckCircle2 className="mr-2 h-5 w-5" />Já confirmei meu e-mail</>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleResendConfirmationEmail()}
                      className="w-full h-14 rounded-xl border-border/50 hover:bg-muted/50"
                      disabled={isResendingConfirmation}
                    >
                      {isResendingConfirmation ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Reenviando...</>
                      ) : (
                        "Reenviar e-mail de confirmação"
                      )}
                    </Button>

                    <Button type="button" variant="ghost" onClick={resetForm} className="w-full h-12 text-muted-foreground hover:text-foreground">
                      Voltar para o Login
                    </Button>

                    <p className="text-sm text-center text-muted-foreground pt-2">
                      {hasInviteCode && codeValidationStatus === "valid"
                        ? "🎉 Após confirmar, você terá 1 mês + 3 dias grátis!"
                        : "Após confirmar, você terá 3 dias de teste grátis!"}
                    </p>
                  </div>
                )}

                {/* Manual */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full h-12 text-muted-foreground hover:text-foreground hover:bg-muted/30 mt-6 rounded-xl" type="button">
                      <HelpCircle className="mr-2 h-5 w-5" />
                      Manual: Como Criar Minha Conta
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0 gap-0 rounded-2xl">
                    <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground rounded-t-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl text-primary-foreground">
                          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                            <HelpCircle className="h-5 w-5" />
                          </div>
                          Como Criar Sua Conta
                        </DialogTitle>
                      </DialogHeader>
                      <p className="text-primary-foreground/80 text-sm mt-2">
                        Siga as <strong>4 etapas</strong> abaixo para criar sua conta rapidamente.
                      </p>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="relative pl-10 pb-4 border-l-2 border-primary/20 ml-3">
                        <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md">1</div>
                        <h3 className="font-semibold text-foreground text-sm mb-2">Dados Pessoais & Senha</h3>
                        <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
                          <p>• <strong>Nome Completo:</strong> Seu nome e sobrenome</p>
                          <p>• <strong>CPF:</strong> Será validado automaticamente (formato: 000.000.000-00)</p>
                          <p>• <strong>E-mail:</strong> Aceitamos apenas <strong className="text-primary">@gmail.com</strong> ou <strong className="text-primary">@outlook.com</strong></p>
                          <p>• <strong>Telefone:</strong> 11 dígitos com DDD (formato: (00) 00000-0000)</p>
                          <p>• <strong>Senha:</strong> Mínimo 6 caracteres — a confirmação valida em tempo real ✅</p>
                        </div>
                      </div>
                      <div className="relative pl-10 pb-4 border-l-2 border-primary/20 ml-3">
                        <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md">2</div>
                        <h3 className="font-semibold text-foreground text-sm mb-2">Endereço</h3>
                        <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
                          <p>• <strong>CEP:</strong> Digite e o endereço preenche automaticamente</p>
                          <p>• <strong>Número:</strong> Informe o número da residência</p>
                          <p>• Se o CEP não encontrar, selecione estado e cidade manualmente</p>
                        </div>
                      </div>
                      <div className="relative pl-10 pb-4 border-l-2 border-primary/20 ml-3">
                        <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md">3</div>
                        <h3 className="font-semibold text-foreground text-sm mb-2">Código de Convite</h3>
                        <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
                          <p className="flex items-center gap-1.5">
                            <Gift className="h-3.5 w-3.5 text-accent shrink-0" />
                            <strong>Com código:</strong> <span className="text-accent font-semibold">1 mês + 3 dias grátis!</span>
                          </p>
                          <p>• <strong>Sem código:</strong> 3 dias de teste grátis</p>
                          <p>• O código é validado automaticamente ao digitar</p>
                        </div>
                      </div>
                      <div className="relative pl-10 ml-3">
                        <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold shadow-md">4</div>
                        <h3 className="font-semibold text-foreground text-sm mb-2">Verificação de E-mail</h3>
                        <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
                          <p>• Um link de confirmação será enviado ao seu e-mail</p>
                          <p>• Clique no link para ativar sua conta</p>
                          <p>• Use os botões rápidos para abrir <strong>Gmail</strong> ou <strong>Outlook</strong></p>
                          <p>• Verifique também a pasta de <strong>spam/lixo eletrônico</strong></p>
                        </div>
                      </div>
                      <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <strong className="text-foreground">Pronto!</strong> Após confirmar o e-mail, faça login e comece a usar o JTC FluxPDV. Seu período gratuito começa imediatamente.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Modal de erro */}
      <AlertDialog open={!!authError} onOpenChange={(open) => { if (!open) setAuthError(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex flex-col items-center gap-3 mb-2">
              <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <AlertDialogTitle className="text-center text-lg">
                Ops! Algo deu errado
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-center text-base leading-relaxed">
              {authError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center sm:justify-center">
            <AlertDialogAction
              onClick={() => setAuthError(null)}
              className="w-full bg-primary hover:bg-primary/90 rounded-xl h-12 text-base font-semibold"
            >
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog conta bloqueada */}
      <AlertDialog open={showBlockedAccountDialog} onOpenChange={setShowBlockedAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Conta Bloqueada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta conta foi bloqueada. Se você acredita que isso foi um erro ou deseja solicitar a reativação, entre em contato conosco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivateAccount} className="bg-accent hover:bg-accent/90">
              Solicitar Reativação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Auth;
