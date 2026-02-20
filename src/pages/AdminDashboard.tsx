import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, ArrowLeft, Users, GitBranch, DollarSign, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

interface RemixEntry {
  id: string;
  user_id: string;
  source_repo: string;
  target_repo: string;
  status: string;
  amount: number | null;
  payment_id: string | null;
  created_at: string;
  finished_at: string | null;
}

interface ProfileEntry {
  id: string;
  user_id: string;
  email: string;
  cpf: string;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [remixes, setRemixes] = useState<RemixEntry[]>([]);
  const [profiles, setProfiles] = useState<ProfileEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<"remixes" | "users">("remixes");

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, authLoading, isAdmin]);

  const fetchData = async () => {
    setLoadingData(true);
    const [remixRes, profileRes] = await Promise.all([
      supabase.from("remix_history").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);
    if (remixRes.data) setRemixes(remixRes.data);
    if (profileRes.data) setProfiles(profileRes.data);
    setLoadingData(false);
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const totalRevenue = remixes
    .filter((r) => r.status === "success" && r.amount)
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const successCount = remixes.filter((r) => r.status === "success").length;
  const errorCount = remixes.filter((r) => r.status === "error").length;
  const pendingCount = remixes.filter((r) => r.status === "processing" || r.status === "pending").length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle className="w-3.5 h-3.5 text-primary" />;
      case "error": return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      default: return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getEmailForUser = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.email || userId.slice(0, 8) + "...";
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-card/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono text-primary font-bold">ADMIN DASHBOARD</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchData} className="text-xs gap-1.5 h-8">
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-xs gap-1.5 h-8">
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </Button>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card/80 border border-border rounded-xl p-4 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{profiles.length}</p>
            <p className="text-[10px] text-muted-foreground font-mono">USUÁRIOS</p>
          </div>
          <div className="bg-card/80 border border-border rounded-xl p-4 text-center">
            <GitBranch className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{remixes.length}</p>
            <p className="text-[10px] text-muted-foreground font-mono">REMIXES</p>
          </div>
          <div className="bg-card/80 border border-border rounded-xl p-4 text-center">
            <CheckCircle className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary">{successCount}</p>
            <p className="text-[10px] text-muted-foreground font-mono">SUCESSO</p>
          </div>
          <div className="bg-card/80 border border-border rounded-xl p-4 text-center">
            <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">R$ {totalRevenue.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground font-mono">RECEITA</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === "remixes" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("remixes")}
            className="text-xs gap-1.5"
          >
            <GitBranch className="w-3.5 h-3.5" />
            Remixes ({remixes.length})
          </Button>
          <Button
            variant={activeTab === "users" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("users")}
            className="text-xs gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            Usuários ({profiles.length})
          </Button>
        </div>

        {/* Content */}
        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : activeTab === "remixes" ? (
          <div className="bg-card/80 border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-4 py-3 text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-muted-foreground">Usuário</th>
                    <th className="text-left px-4 py-3 text-muted-foreground">Fonte → Destino</th>
                    <th className="text-left px-4 py-3 text-muted-foreground">Valor</th>
                    <th className="text-left px-4 py-3 text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {remixes.map((r) => (
                    <tr key={r.id} className="border-b border-border/30 hover:bg-muted/10">
                      <td className="px-4 py-3">{getStatusIcon(r.status)}</td>
                      <td className="px-4 py-3 text-foreground">{getEmailForUser(r.user_id)}</td>
                      <td className="px-4 py-3">
                        <span className="text-primary">{r.source_repo}</span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <span className="text-foreground">{r.target_repo}</span>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {r.amount ? `R$ ${Number(r.amount).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                  {remixes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum remix encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-card/80 border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-4 py-3 text-muted-foreground">E-mail</th>
                    <th className="text-left px-4 py-3 text-muted-foreground">CPF</th>
                    <th className="text-left px-4 py-3 text-muted-foreground">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-b border-border/30 hover:bg-muted/10">
                      <td className="px-4 py-3 text-foreground">{p.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.cpf}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(p.created_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4 sm:py-6 space-y-1">
        <p className="text-[10px] text-muted-foreground/20 font-mono tracking-widest">v1.0 — jtc git remix br</p>
        <p className="text-[10px] text-muted-foreground/30 font-mono">
          Criado por <span className="text-primary/40 font-bold">JARDIEL DE SOUSA LOPES</span> — Criador da{" "}
          <span className="text-primary/40 font-bold">JTC</span>
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
