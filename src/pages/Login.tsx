import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isCpf = (val: string) => /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(val.trim());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let email = identifier.trim();

      // If it looks like CPF, look up email
      if (isCpf(email)) {
        const { data, error } = await supabase.functions.invoke("lookup-cpf", {
          body: { cpf: email },
        });

        if (error || !data?.success) {
          toast.error("CPF não encontrado");
          setLoading(false);
          return;
        }
        email = data.email;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login")) {
          toast.error("E-mail/CPF ou senha incorretos");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Login realizado!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer login");
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
          <p className="text-muted-foreground text-xs">Entre na sua conta</p>
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
              <LogIn className="w-3 h-3" />
              login
            </span>
          </div>

          <form onSubmit={handleLogin} className="p-5 sm:p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-mono">
                <span className="text-primary font-bold">[E-MAIL ou CPF]</span>
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="seu@email.com ou 000.000.000-00"
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
                  placeholder="Sua senha"
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl glow-border transition-all duration-300"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                "$ login --execute"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/signup" className="text-primary hover:text-primary/80 font-bold transition-colors">
                Criar conta
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

export default Login;
