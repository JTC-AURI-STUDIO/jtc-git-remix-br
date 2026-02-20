import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, Eye, EyeOff, UserPlus } from "lucide-react";
import { toast } from "sonner";

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    const cpfDigits = cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      toast.error("CPF inválido — deve ter 11 dígitos");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Create profile with CPF
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: data.user.id,
          email,
          cpf: cpfDigits,
        });

        if (profileError) {
          // If CPF is duplicate
          if (profileError.message.includes("duplicate") || profileError.message.includes("unique")) {
            toast.error("Este CPF já está cadastrado");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          throw profileError;
        }

        toast.success("Conta criada com sucesso!");
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="fixed inset-0 scanline pointer-events-none z-50 opacity-30" />

      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              JTC <span className="text-primary glow-text">GIT REMIX BR</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-xs">Crie sua conta para começar</p>
        </div>

        {/* Form card */}
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden glow-box">
          <div className="flex items-center gap-2 px-5 py-3 bg-muted/30 border-b border-border">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[hsl(0,72%,50%)]" />
              <div className="w-3 h-3 rounded-full bg-[hsl(45,90%,55%)]" />
              <div className="w-3 h-3 rounded-full bg-primary" />
            </div>
            <span className="text-muted-foreground text-[11px] ml-1 font-mono tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-3 h-3" />
              cadastro
            </span>
          </div>

          <form onSubmit={handleSignup} className="p-5 sm:p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-mono">
                <span className="text-primary font-bold">[E-MAIL]</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full bg-background/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 font-mono text-xs transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-mono">
                <span className="text-primary font-bold">[CPF]</span>
              </label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                required
                className="w-full bg-background/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 font-mono text-xs transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-mono">
                <span className="text-primary font-bold">[SENHA]</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full bg-background/60 border border-border rounded-xl px-4 py-3 pr-10 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 font-mono text-xs transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-mono">
                <span className="text-primary font-bold">[CONFIRMAR SENHA]</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
                className="w-full bg-background/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 font-mono text-xs transition-all duration-200"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl glow-border transition-all duration-300"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Criando conta...
                </span>
              ) : (
                "$ criar-conta --execute"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/login" className="text-primary hover:text-primary/80 font-bold transition-colors">
                Entrar
              </Link>
            </p>
          </form>
        </div>

        <div className="text-center mt-4 space-y-1">
          <p className="text-[10px] text-muted-foreground/20 font-mono tracking-widest">v1.0 — jtc git remix br</p>
          <p className="text-[10px] text-muted-foreground/30 font-mono">Criado por <span className="text-primary/40 font-bold">JARDIEL DE SOUSA LOPES</span> — Criador da <span className="text-primary/40 font-bold">JTC</span></p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
