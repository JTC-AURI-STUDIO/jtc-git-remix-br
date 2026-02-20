import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Zap, ArrowLeft, Users, GitBranch, DollarSign, CheckCircle, XCircle,
  Clock, RefreshCw, Shield, TrendingUp, Activity, Search, Filter,
  Calendar, BarChart3, Eye, AlertTriangle, Loader2, ChevronDown, ChevronUp, Download
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

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

interface QueueEntry {
  id: string;
  source_repo: string;
  target_repo: string;
  status: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

type TabType = "overview" | "remixes" | "users" | "queue" | "revenue";

const CHART_COLORS = {
  primary: "hsl(142, 72%, 50%)",
  error: "hsl(0, 72%, 50%)",
  pending: "hsl(45, 90%, 55%)",
  muted: "hsl(220, 10%, 30%)",
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [remixes, setRemixes] = useState<RemixEntry[]>([]);
  const [profiles, setProfiles] = useState<ProfileEntry[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, authLoading, isAdmin]);

  const fetchData = async () => {
    setLoadingData(true);
    const [remixRes, profileRes, queueRes] = await Promise.all([
      supabase.from("remix_history").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("remix_queue").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (remixRes.data) setRemixes(remixRes.data);
    if (profileRes.data) setProfiles(profileRes.data);
    if (queueRes.data) setQueue(queueRes.data);
    setLoadingData(false);
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  // Auto-refresh queue every 10s
  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("remix_queue").select("*").order("created_at", { ascending: false }).limit(50);
      if (data) setQueue(data);
    }, 10000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Computed stats
  const stats = useMemo(() => {
    const totalRevenue = remixes
      .filter((r) => r.status === "success" && r.amount)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const successCount = remixes.filter((r) => r.status === "success").length;
    const errorCount = remixes.filter((r) => r.status === "error").length;
    const pendingCount = remixes.filter((r) => ["processing", "pending"].includes(r.status)).length;
    const successRate = remixes.length > 0 ? ((successCount / remixes.length) * 100).toFixed(1) : "0";
    const activeQueue = queue.filter((q) => ["waiting", "processing"].includes(q.status)).length;

    // Today stats
    const today = new Date().toDateString();
    const todayRemixes = remixes.filter((r) => new Date(r.created_at).toDateString() === today);
    const todayRevenue = todayRemixes
      .filter((r) => r.status === "success" && r.amount)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const todayUsers = profiles.filter((p) => new Date(p.created_at).toDateString() === today).length;

    return { totalRevenue, successCount, errorCount, pendingCount, successRate, activeQueue, todayRemixes: todayRemixes.length, todayRevenue, todayUsers };
  }, [remixes, profiles, queue]);

  // Revenue chart data (last 7 days)
  const revenueChartData = useMemo(() => {
    const days: { date: string; revenue: number; remixes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const dayRemixes = remixes.filter((r) => new Date(r.created_at).toDateString() === dateStr);
      const revenue = dayRemixes.filter((r) => r.status === "success" && r.amount).reduce((s, r) => s + (r.amount || 0), 0);
      days.push({ date: label, revenue, remixes: dayRemixes.length });
    }
    return days;
  }, [remixes]);

  // Pie chart data
  const pieData = useMemo(() => [
    { name: "Sucesso", value: stats.successCount, color: CHART_COLORS.primary },
    { name: "Erro", value: stats.errorCount, color: CHART_COLORS.error },
    { name: "Pendente", value: stats.pendingCount, color: CHART_COLORS.pending },
  ].filter((d) => d.value > 0), [stats]);

  // Top users
  const topUsers = useMemo(() => {
    const userMap: Record<string, { email: string; cpf: string; remixCount: number; successCount: number; totalSpent: number; lastActive: string }> = {};
    profiles.forEach((p) => {
      userMap[p.user_id] = { email: p.email, cpf: p.cpf, remixCount: 0, successCount: 0, totalSpent: 0, lastActive: p.created_at };
    });
    remixes.forEach((r) => {
      if (userMap[r.user_id]) {
        userMap[r.user_id].remixCount++;
        if (r.status === "success") userMap[r.user_id].successCount++;
        userMap[r.user_id].totalSpent += r.amount || 0;
        if (r.created_at > userMap[r.user_id].lastActive) userMap[r.user_id].lastActive = r.created_at;
      }
    });
    return Object.entries(userMap)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.remixCount - a.remixCount);
  }, [profiles, remixes]);

  // Filtered remixes
  const filteredRemixes = useMemo(() => {
    let result = remixes;
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    if (dateFilter === "today") {
      const today = new Date().toDateString();
      result = result.filter((r) => new Date(r.created_at).toDateString() === today);
    } else if (dateFilter === "week") {
      const week = new Date(); week.setDate(week.getDate() - 7);
      result = result.filter((r) => new Date(r.created_at) >= week);
    } else if (dateFilter === "month") {
      const month = new Date(); month.setMonth(month.getMonth() - 1);
      result = result.filter((r) => new Date(r.created_at) >= month);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((r) => {
        const email = getEmailForUser(r.user_id).toLowerCase();
        return r.source_repo.toLowerCase().includes(term) || r.target_repo.toLowerCase().includes(term) || email.includes(term);
      });
    }
    return result;
  }, [remixes, statusFilter, dateFilter, searchTerm]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return topUsers;
    const term = searchTerm.toLowerCase();
    return topUsers.filter((u) => u.email.toLowerCase().includes(term) || u.cpf.includes(term));
  }, [topUsers, searchTerm]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success": case "done": return <CheckCircle className="w-3.5 h-3.5 text-primary" />;
      case "error": return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      case "processing": return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
      case "waiting": return <Clock className="w-3.5 h-3.5 text-yellow-500" />;
      default: return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      success: "bg-primary/10 text-primary border-primary/20",
      done: "bg-primary/10 text-primary border-primary/20",
      error: "bg-destructive/10 text-destructive border-destructive/20",
      processing: "bg-primary/10 text-primary border-primary/20",
      waiting: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      pending: "bg-muted text-muted-foreground border-border",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${variants[status] || variants.pending}`}>
        {getStatusIcon(status)}
        {status}
      </span>
    );
  };

  const getEmailForUser = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.email || userId.slice(0, 8) + "...";
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const bom = "\uFEFF";
    const csv = bom + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportRemixesCSV = () => {
    const headers = ["Status", "Usuário", "Fonte", "Destino", "Valor", "Data", "Finalizado"];
    const rows = filteredRemixes.map((r) => [
      r.status,
      getEmailForUser(r.user_id),
      r.source_repo,
      r.target_repo,
      r.amount ? `R$ ${Number(r.amount).toFixed(2)}` : "—",
      formatDate(r.created_at),
      r.finished_at ? formatDate(r.finished_at) : "—",
    ]);
    downloadCSV("remixes", headers, rows);
  };

  const exportUsersCSV = () => {
    const headers = ["Email", "CPF", "Remixes", "Sucesso", "Total Gasto", "Último Acesso"];
    const rows = filteredUsers.map((u) => [
      u.email,
      u.cpf,
      String(u.remixCount),
      String(u.successCount),
      `R$ ${u.totalSpent.toFixed(2)}`,
      formatDate(u.lastActive),
    ]);
    downloadCSV("usuarios", headers, rows);
  };

  const exportRevenueCSV = () => {
    const headers = ["Status", "Usuário", "Valor", "Fonte", "Destino", "Data"];
    const paidRemixes = remixes.filter((r) => r.amount && r.amount > 0);
    const rows = paidRemixes.map((r) => [
      r.status,
      getEmailForUser(r.user_id),
      `R$ ${Number(r.amount).toFixed(2)}`,
      r.source_repo,
      r.target_repo,
      formatDate(r.created_at),
    ]);
    downloadCSV("receita", headers, rows);
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "overview", label: "Visão Geral", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "remixes", label: "Remixes", icon: <GitBranch className="w-3.5 h-3.5" />, count: remixes.length },
    { id: "users", label: "Usuários", icon: <Users className="w-3.5 h-3.5" />, count: profiles.length },
    { id: "queue", label: "Fila", icon: <Activity className="w-3.5 h-3.5" />, count: stats.activeQueue },
    { id: "revenue", label: "Receita", icon: <DollarSign className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Scanline */}
      <div className="fixed inset-0 scanline pointer-events-none z-50 opacity-20" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-card/40 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-xs font-mono text-primary font-bold tracking-wider">ADMIN DASHBOARD</span>
            <p className="text-[9px] text-muted-foreground font-mono">JTC GIT REMIX BR</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loadingData} className="text-xs gap-1.5 h-8">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/?remixer")} className="text-xs gap-1.5 h-8">
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Usar Remixer</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/30 bg-card/20 backdrop-blur-sm sticky top-[52px] z-30">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 max-w-6xl mx-auto w-full space-y-6">
        {loadingData ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground font-mono">Carregando dados...</p>
          </div>
        ) : (
          <>
            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Live indicator */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] text-muted-foreground font-mono">DADOS EM TEMPO REAL</span>
                </div>

                {/* Main stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={<Users className="w-5 h-5" />} value={profiles.length} label="TOTAL USUÁRIOS" sub={`+${stats.todayUsers} hoje`} />
                  <StatCard icon={<GitBranch className="w-5 h-5" />} value={remixes.length} label="TOTAL REMIXES" sub={`+${stats.todayRemixes} hoje`} />
                  <StatCard icon={<TrendingUp className="w-5 h-5" />} value={`${stats.successRate}%`} label="TAXA SUCESSO" highlight />
                  <StatCard icon={<DollarSign className="w-5 h-5" />} value={`R$ ${stats.totalRevenue.toFixed(2)}`} label="RECEITA TOTAL" sub={`R$ ${stats.todayRevenue.toFixed(2)} hoje`} />
                </div>

                {/* Secondary stats */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  <MiniStat label="Sucesso" value={stats.successCount} color="text-primary" />
                  <MiniStat label="Erros" value={stats.errorCount} color="text-destructive" />
                  <MiniStat label="Pendentes" value={stats.pendingCount} color="text-yellow-500" />
                  <MiniStat label="Na Fila" value={stats.activeQueue} color="text-primary" />
                  <MiniStat label="Ticket Médio" value={remixes.length > 0 ? `R$ ${(stats.totalRevenue / Math.max(stats.successCount, 1)).toFixed(2)}` : "—"} color="text-foreground" />
                  <MiniStat label="Cadastros" value={profiles.length} color="text-foreground" />
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Revenue chart */}
                  <div className="md:col-span-2 bg-card/80 border border-border rounded-xl p-4">
                    <h3 className="text-xs text-muted-foreground font-mono mb-4 flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-primary" />
                      RECEITA — ÚLTIMOS 7 DIAS
                    </h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={revenueChartData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} width={45} tickFormatter={(v) => `R$${v}`} />
                        <Tooltip
                          contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(142, 30%, 18%)", borderRadius: 8, fontSize: 11, fontFamily: "monospace" }}
                          labelStyle={{ color: "hsl(140, 60%, 90%)" }}
                          formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita"]}
                        />
                        <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary} fill="url(#colorRevenue)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie chart */}
                  <div className="bg-card/80 border border-border rounded-xl p-4">
                    <h3 className="text-xs text-muted-foreground font-mono mb-4 flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                      STATUS DOS REMIXES
                    </h3>
                    {pieData.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={140}>
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip
                              contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(142, 30%, 18%)", borderRadius: 8, fontSize: 11, fontFamily: "monospace" }}
                              formatter={(value: number, name: string) => [value, name]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-3 mt-2">
                          {pieData.map((d) => (
                            <div key={d.name} className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                              <span className="text-[10px] text-muted-foreground font-mono">{d.name} ({d.value})</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-10">Sem dados</p>
                    )}
                  </div>
                </div>

                {/* Remixes per day bar chart */}
                <div className="bg-card/80 border border-border rounded-xl p-4">
                  <h3 className="text-xs text-muted-foreground font-mono mb-4 flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-primary" />
                    REMIXES POR DIA
                  </h3>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={revenueChartData}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(142, 30%, 18%)", borderRadius: 8, fontSize: 11, fontFamily: "monospace" }}
                        formatter={(value: number) => [value, "Remixes"]}
                      />
                      <Bar dataKey="remixes" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Recent activity */}
                <div className="bg-card/80 border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground font-mono">ATIVIDADE RECENTE</span>
                  </div>
                  <div className="divide-y divide-border/20">
                    {remixes.slice(0, 8).map((r) => (
                      <div key={r.id} className="px-4 py-3 flex items-center gap-3 text-xs font-mono">
                        {getStatusIcon(r.status)}
                        <span className="text-foreground truncate flex-1">{getEmailForUser(r.user_id)}</span>
                        <span className="text-muted-foreground hidden sm:inline truncate max-w-[200px]">{r.source_repo} → {r.target_repo}</span>
                        <span className="text-muted-foreground/60 text-[10px] shrink-0">{formatDate(r.created_at)}</span>
                      </div>
                    ))}
                    {remixes.length === 0 && (
                      <p className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma atividade.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ REMIXES TAB ═══ */}
            {activeTab === "remixes" && (
              <div className="space-y-4">
                {/* Filters */}
              <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por email, repo..."
                      className="pl-9 h-9 text-xs font-mono bg-card/60 border-border"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-card/60 border border-border rounded-lg px-3 h-9 text-xs font-mono text-foreground"
                  >
                    <option value="all">Todos status</option>
                    <option value="success">Sucesso</option>
                    <option value="error">Erro</option>
                    <option value="processing">Processando</option>
                    <option value="pending">Pendente</option>
                  </select>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="bg-card/60 border border-border rounded-lg px-3 h-9 text-xs font-mono text-foreground"
                  >
                    <option value="all">Todo período</option>
                    <option value="today">Hoje</option>
                    <option value="week">Últimos 7 dias</option>
                    <option value="month">Últimos 30 dias</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={exportRemixesCSV} className="h-9 text-xs gap-1.5 font-mono">
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </Button>
                </div>

                <p className="text-[10px] text-muted-foreground font-mono">{filteredRemixes.length} resultado(s)</p>

                <div className="bg-card/80 border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="text-left px-4 py-3 text-muted-foreground">Status</th>
                          <th className="text-left px-4 py-3 text-muted-foreground">Usuário</th>
                          <th className="text-left px-4 py-3 text-muted-foreground">Fonte</th>
                          <th className="text-left px-4 py-3 text-muted-foreground">Destino</th>
                          <th className="text-left px-4 py-3 text-muted-foreground">Valor</th>
                          <th className="text-left px-4 py-3 text-muted-foreground">Data</th>
                          <th className="text-left px-4 py-3 text-muted-foreground">Duração</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRemixes.map((r) => {
                          const duration = r.finished_at ? Math.round((new Date(r.finished_at).getTime() - new Date(r.created_at).getTime()) / 1000) : null;
                          return (
                            <tr key={r.id} className="border-b border-border/20 hover:bg-muted/10">
                              <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
                              <td className="px-4 py-3 text-foreground">{getEmailForUser(r.user_id)}</td>
                              <td className="px-4 py-3 text-primary truncate max-w-[150px]">{r.source_repo}</td>
                              <td className="px-4 py-3 text-foreground truncate max-w-[150px]">{r.target_repo}</td>
                              <td className="px-4 py-3 text-foreground">{r.amount ? `R$ ${Number(r.amount).toFixed(2)}` : "—"}</td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(r.created_at)}</td>
                              <td className="px-4 py-3 text-muted-foreground">{duration !== null ? `${duration}s` : "—"}</td>
                            </tr>
                          );
                        })}
                        {filteredRemixes.length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum remix encontrado.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ USERS TAB ═══ */}
            {activeTab === "users" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por email ou CPF..."
                      className="pl-9 h-9 text-xs font-mono bg-card/60 border-border"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={exportUsersCSV} className="h-9 text-xs gap-1.5 font-mono">
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </Button>
                </div>

                <div className="space-y-2">
                  {filteredUsers.map((u) => {
                    const isExpanded2 = expandedUser === u.userId;
                    const userRemixes = remixes.filter((r) => r.user_id === u.userId);
                    return (
                      <div key={u.userId} className="bg-card/80 border border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedUser(isExpanded2 ? null : u.userId)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-xs text-primary font-bold">{u.email[0].toUpperCase()}</span>
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-xs text-foreground font-mono truncate">{u.email}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">CPF: {u.cpf}</p>
                          </div>
                          <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono">
                            <div className="text-center">
                              <p className="text-foreground font-bold">{u.remixCount}</p>
                              <p className="text-muted-foreground">remixes</p>
                            </div>
                            <div className="text-center">
                              <p className="text-primary font-bold">{u.successCount}</p>
                              <p className="text-muted-foreground">sucesso</p>
                            </div>
                            <div className="text-center">
                              <p className="text-foreground font-bold">R$ {u.totalSpent.toFixed(2)}</p>
                              <p className="text-muted-foreground">gasto</p>
                            </div>
                          </div>
                          {isExpanded2 ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                        </button>

                        {isExpanded2 && (
                          <div className="border-t border-border/30 px-4 py-3 bg-muted/5">
                            {/* Mobile stats */}
                            <div className="sm:hidden grid grid-cols-3 gap-2 mb-3">
                              <MiniStat label="Remixes" value={u.remixCount} color="text-foreground" />
                              <MiniStat label="Sucesso" value={u.successCount} color="text-primary" />
                              <MiniStat label="Gasto" value={`R$ ${u.totalSpent.toFixed(2)}`} color="text-foreground" />
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono mb-2">Último acesso: {formatDate(u.lastActive)}</p>
                            {userRemixes.length > 0 ? (
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground font-mono mb-1">HISTÓRICO DE REMIXES:</p>
                                {userRemixes.slice(0, 10).map((r) => (
                                  <div key={r.id} className="flex items-center gap-2 text-[10px] font-mono py-1">
                                    {getStatusIcon(r.status)}
                                    <span className="text-primary truncate">{r.source_repo}</span>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="text-foreground truncate">{r.target_repo}</span>
                                    <span className="text-muted-foreground/50 ml-auto shrink-0">{formatDate(r.created_at)}</span>
                                  </div>
                                ))}
                                {userRemixes.length > 10 && (
                                  <p className="text-[10px] text-muted-foreground/50 font-mono">+ {userRemixes.length - 10} mais</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground/50">Nenhum remix realizado.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>
                  )}
                </div>
              </div>
            )}

            {/* ═══ QUEUE TAB ═══ */}
            {activeTab === "queue" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stats.activeQueue > 0 ? "bg-primary animate-pulse" : "bg-muted-foreground/30"}`} />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {stats.activeQueue > 0 ? `${stats.activeQueue} na fila agora` : "Fila vazia"}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 font-mono ml-auto">Auto-refresh: 10s</span>
                </div>

                <div className="bg-card/80 border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="text-left px-4 py-3 text-muted-foreground">Status</th>
                          <th className="text-left px-4 py-3 text-muted-foreground">Fonte</th>
                          <th className="text-left px-4 py-3 text-muted-foreground">Destino</th>
                          <th className="text-left px-4 py-3 text-muted-foreground">Criado</th>
                          <th className="text-left px-4 py-3 text-muted-foreground">Iniciou</th>
                          <th className="text-left px-4 py-3 text-muted-foreground">Finalizou</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queue.map((q) => (
                          <tr key={q.id} className={`border-b border-border/20 hover:bg-muted/10 ${q.status === "processing" ? "bg-primary/5" : ""}`}>
                            <td className="px-4 py-3">{getStatusBadge(q.status)}</td>
                            <td className="px-4 py-3 text-primary truncate max-w-[150px]">{q.source_repo}</td>
                            <td className="px-4 py-3 text-foreground truncate max-w-[150px]">{q.target_repo}</td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(q.created_at)}</td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{q.started_at ? formatDate(q.started_at) : "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{q.finished_at ? formatDate(q.finished_at) : "—"}</td>
                          </tr>
                        ))}
                        {queue.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Fila vazia.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ REVENUE TAB ═══ */}
            {activeTab === "revenue" && (
              <div className="space-y-6">
                {/* Revenue summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={<DollarSign className="w-5 h-5" />} value={`R$ ${stats.totalRevenue.toFixed(2)}`} label="RECEITA TOTAL" />
                  <StatCard icon={<DollarSign className="w-5 h-5" />} value={`R$ ${stats.todayRevenue.toFixed(2)}`} label="RECEITA HOJE" />
                  <StatCard
                    icon={<TrendingUp className="w-5 h-5" />}
                    value={`R$ ${(stats.totalRevenue / Math.max(stats.successCount, 1)).toFixed(2)}`}
                    label="TICKET MÉDIO"
                  />
                  <StatCard icon={<CheckCircle className="w-5 h-5" />} value={stats.successCount} label="PAGAMENTOS OK" />
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={exportRevenueCSV} className="h-9 text-xs gap-1.5 font-mono">
                    <Download className="w-3.5 h-3.5" />
                    Exportar CSV
                  </Button>
                </div>
                <div className="bg-card/80 border border-border rounded-xl p-4">
                  <h3 className="text-xs text-muted-foreground font-mono mb-4">RECEITA DIÁRIA — ÚLTIMOS 7 DIAS</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={revenueChartData}>
                      <defs>
                        <linearGradient id="colorRevenue2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip
                        contentStyle={{ background: "hsl(220, 18%, 8%)", border: "1px solid hsl(142, 30%, 18%)", borderRadius: 8, fontSize: 11, fontFamily: "monospace" }}
                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary} fill="url(#colorRevenue2)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Paid remixes list */}
                <div className="bg-card/80 border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/30">
                    <span className="text-xs text-muted-foreground font-mono">PAGAMENTOS RECENTES</span>
                  </div>
                  <div className="divide-y divide-border/20">
                    {remixes.filter((r) => r.amount && r.amount > 0).slice(0, 20).map((r) => (
                      <div key={r.id} className="px-4 py-3 flex items-center gap-3 text-xs font-mono">
                        {getStatusIcon(r.status)}
                        <span className="text-foreground truncate">{getEmailForUser(r.user_id)}</span>
                        <span className="text-primary ml-auto font-bold">R$ {Number(r.amount).toFixed(2)}</span>
                        <span className="text-muted-foreground/50 text-[10px]">{formatDate(r.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
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

// ═══ Sub-components ═══

const StatCard = ({ icon, value, label, sub, highlight }: { icon: React.ReactNode; value: string | number; label: string; sub?: string; highlight?: boolean }) => (
  <div className="bg-card/80 border border-border rounded-xl p-4 text-center glow-box">
    <div className="text-primary mx-auto mb-1.5 flex justify-center">{icon}</div>
    <p className={`text-xl sm:text-2xl font-bold ${highlight ? "text-primary glow-text" : "text-foreground"}`}>{value}</p>
    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{label}</p>
    {sub && <p className="text-[9px] text-muted-foreground/50 font-mono mt-0.5">{sub}</p>}
  </div>
);

const MiniStat = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
  <div className="bg-card/60 border border-border/50 rounded-lg p-2.5 text-center">
    <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
    <p className="text-[9px] text-muted-foreground font-mono">{label}</p>
  </div>
);

export default AdminDashboard;
