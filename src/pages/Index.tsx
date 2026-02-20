import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import LogLine, { LogStatus } from "@/components/LogLine";
import { ArrowDown, Zap, AlertTriangle, Terminal, GitBranch, LogOut, Clock } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import PixPaymentModal from "@/components/PixPaymentModal";
import QueueStatus from "@/components/QueueStatus";
import TokenGuide from "@/components/TokenGuide";

interface LogEntry {
  message: string;
  status: LogStatus;
  timestamp: string;
}

const getTime = () => {
  const now = new Date();
  return now.toLocaleTimeString("pt-BR", { hour12: false }) + "." + String(now.getMilliseconds()).padStart(3, "0");
};

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [sourceRepo, setSourceRepo] = useState("");
  const [targetRepo, setTargetRepo] = useState("");
  const [sourceToken, setSourceToken] = useState("");
  const [targetToken, setTargetToken] = useState("");
  const [sameAccount, setSameAccount] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [inQueue, setInQueue] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (message: string, status: LogStatus = "running") => {
    setLogs((prev) => [...prev, { message, status, timestamp: getTime() }]);
  };

  const updateLastLog = (status: LogStatus) => {
    setLogs((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1].status = status;
      }
      return updated;
    });
  };

  const parseRepo = (url: string) => {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
  };

  const [isValidating, setIsValidating] = useState(false);

  const handleRemixClick = async () => {
    const source = parseRepo(sourceRepo);
    const target = parseRepo(targetRepo);

    if (!source || !target) {
      toast.error("URLs inválidas. Use: https://github.com/owner/repo");
      return;
    }
    if (!sourceToken.trim()) {
      toast.error("Insira o token da conta mãe");
      return;
    }
    if (!sameAccount && !targetToken.trim()) {
      toast.error("Insira o token da conta filha");
      return;
    }

    // Validate repos and tokens before payment
    setIsValidating(true);
    setLogs([]);
    addLog("Verificando URL do repositório fonte...");

    try {
      const srcRes = await fetch(`https://api.github.com/repos/${source.owner}/${source.repo}`, {
        headers: { Authorization: `token ${sourceToken}`, Accept: "application/vnd.github.v3+json" },
      });

      if (!srcRes.ok) {
        const srcBody = await srcRes.json().catch(() => ({}));
        if (srcRes.status === 401) throw new Error("Token da mãe inválido ou expirado");
        if (srcRes.status === 403) throw new Error("Token da mãe sem permissão neste repositório");
        if (srcRes.status === 404) throw new Error(`Repo fonte não encontrado: ${source.owner}/${source.repo}`);
        throw new Error(srcBody.message || `Erro ${srcRes.status} no repo fonte`);
      }
      await srcRes.json();
      addLog(`✓ Repo fonte OK: ${source.owner}/${source.repo}`, "success");

      addLog("Verificando URL do repositório destino...");
      const effectiveToken = sameAccount ? sourceToken : targetToken;
      const dstRes = await fetch(`https://api.github.com/repos/${target.owner}/${target.repo}`, {
        headers: { Authorization: `token ${effectiveToken}`, Accept: "application/vnd.github.v3+json" },
      });

      if (!dstRes.ok) {
        const dstBody = await dstRes.json().catch(() => ({}));
        if (dstRes.status === 401) throw new Error("Token da filha inválido ou expirado");
        if (dstRes.status === 403) throw new Error("Token da filha sem permissão neste repositório");
        if (dstRes.status === 404) throw new Error(`Repo destino não encontrado: ${target.owner}/${target.repo}`);
        throw new Error(dstBody.message || `Erro ${dstRes.status} no repo destino`);
      }
      const dstData = await dstRes.json();
      if (dstData.permissions && !dstData.permissions.push) {
        throw new Error("Token da filha não tem permissão de escrita (push)");
      }
      addLog(`✓ Repo destino OK: ${target.owner}/${target.repo}`, "success");

      addLog("✓ Tudo validado! Abrindo pagamento...", "success");
      setIsValidating(false);
      setShowPayment(true);
    } catch (err: any) {
      addLog(`✗ ${err.message}`, "error");
      toast.error(err.message);
      setIsValidating(false);
    }
  };

  const onPaymentConfirmed = async () => {
    const source = parseRepo(sourceRepo)!;
    const target = parseRepo(targetRepo)!;

    setShowPayment(false);
    setLogs([]);
    addLog("💰 Pagamento confirmado!");
    addLog("Entrando na fila...");

    try {
      // Join queue
      const { data: queueData, error: queueError } = await supabase.functions.invoke("remix-queue", {
        body: {
          action: "join",
          source_repo: `${source.owner}/${source.repo}`,
          target_repo: `${target.owner}/${target.repo}`,
        },
      });

      if (queueError) throw queueError;
      if (!queueData?.success) throw new Error(queueData?.error || "Erro ao entrar na fila");

      setQueueId(queueData.queue_id);
      setInQueue(true);

      if (queueData.position <= 1) {
        addLog("Fila livre! Iniciando remix...", "success");
      } else {
        addLog(`Posição na fila: #${queueData.position}`, "running");
        addLog("Aguardando sua vez...", "pending");
      }
    } catch (err: any) {
      addLog(`ERRO: ${err.message}`, "error");
      toast.error(err.message);
    }
  };

  const onQueueReady = () => {
    executeRemix();
  };

  const executeRemix = async () => {
    const source = parseRepo(sourceRepo)!;
    const target = parseRepo(targetRepo)!;

    setInQueue(false);
    setIsRunning(true);
    addLog("🚀 Sua vez! Executando remix...", "running");
    addLog(`SRC → ${source.owner}/${source.repo}`);
    addLog(`DST → ${target.owner}/${target.repo}`);

    // Save to history
    let currentHistoryId = historyId;
    if (user) {
      const { data: histData } = await supabase.from("remix_history").insert({
        user_id: user.id,
        source_repo: `${source.owner}/${source.repo}`,
        target_repo: `${target.owner}/${target.repo}`,
        status: "processing",
      }).select("id").single();
      if (histData) {
        currentHistoryId = histData.id;
        setHistoryId(histData.id);
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke("github-remix", {
        body: {
          sourceOwner: source.owner,
          sourceRepo: source.repo,
          targetOwner: target.owner,
          targetRepo: target.repo,
          sourceToken,
          targetToken: sameAccount ? sourceToken : targetToken,
        },
      });

      if (error) throw error;
      updateLastLog("success");

      if (data?.steps) {
        for (const step of data.steps) {
          addLog(step.message, step.success ? "success" : "error");
        }
      }

      const finalStatus = data?.success ? "success" : "error";

      if (data?.success) {
        addLog("══════════════════════════════", "success");
        addLog("✨ REMIX CONCLUÍDO!", "success");
        addLog("══════════════════════════════", "success");
        toast.success("Remix concluído!");
      } else {
        addLog(`FATAL: ${data?.error || "Erro desconhecido"}`, "error");
        toast.error(data?.error || "Falha no remix");
      }

      // Update history
      if (currentHistoryId) {
        await supabase.from("remix_history").update({
          status: finalStatus,
          finished_at: new Date().toISOString(),
        }).eq("id", currentHistoryId);
      }

      // Mark queue as done
      if (queueId) {
        await supabase.functions.invoke("remix-queue", {
          body: { action: "done", queue_id: queueId },
        });
      }
    } catch (err: any) {
      updateLastLog("error");
      addLog(`FATAL: ${err.message}`, "error");
      toast.error(err.message);

      // Update history as error
      if (currentHistoryId) {
        await supabase.from("remix_history").update({
          status: "error",
          finished_at: new Date().toISOString(),
        }).eq("id", currentHistoryId);
      }

      // Mark queue as error
      if (queueId) {
        await supabase.functions.invoke("remix-queue", {
          body: { action: "error", queue_id: queueId },
        });
      }
    } finally {
      setIsRunning(false);
      setQueueId(null);
      setHistoryId(null);
      addLog("Processo finalizado.", "pending");
    }
  };

  const isValid = sourceRepo && targetRepo && sourceToken && (sameAccount || targetToken);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* User nav bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-card/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono text-muted-foreground truncate max-w-[150px]">
            {user?.email}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/history")}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8"
          >
            <Clock className="w-3.5 h-3.5" />
            Histórico
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-xs text-muted-foreground hover:text-destructive gap-1.5 h-8"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </Button>
        </div>
      </div>
      {/* Scanline overlay */}
      <div className="fixed inset-0 scanline pointer-events-none z-50 opacity-30" />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 py-6 sm:py-10 pb-0">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-[11px] text-primary font-mono tracking-widest uppercase">Ativo</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground glow-text flex items-center justify-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            JTC <span className="text-primary glow-text">GITREMIX</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-2 max-w-xs mx-auto leading-relaxed">
            Clona o conteúdo de um repo e substitui tudo no destino
          </p>
        </div>

        {/* Card */}
        <div className="w-full max-w-md">
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden glow-box">
            {/* Card header */}
            <div className="flex items-center gap-2 px-5 py-3 bg-muted/30 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[hsl(0,72%,50%)]" />
                <div className="w-3 h-3 rounded-full bg-[hsl(45,90%,55%)]" />
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
              <span className="text-muted-foreground text-[11px] ml-1 font-mono tracking-wider">remixer.sh</span>
            </div>

            {/* Card body */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Source repo */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary font-bold">[MÃE]</span>
                  <span>Repo fonte</span>
                </label>
                <input
                  value={sourceRepo}
                  onChange={(e) => setSourceRepo(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  className="w-full bg-background/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 font-mono text-xs transition-all duration-200"
                />
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="p-2 bg-primary/5 rounded-full border border-primary/10">
                  <ArrowDown className="w-4 h-4 text-primary animate-pulse-glow" />
                </div>
              </div>

              {/* Target repo */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary font-bold">[FILHA]</span>
                  <span>Repo destino</span>
                </label>
                <input
                  value={targetRepo}
                  onChange={(e) => setTargetRepo(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  className="w-full bg-background/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 font-mono text-xs transition-all duration-200"
                />
              </div>

              {/* Warning */}
              <div className="flex items-center gap-3 bg-destructive/5 border border-destructive/20 rounded-xl p-3.5">
                <div className="p-1.5 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-xs text-destructive/90 leading-relaxed">
                  O conteúdo do repo filha será <strong>completamente substituído</strong>.
                </p>
              </div>

              {/* Same account toggle */}
              <div className="flex items-center justify-between bg-background/40 rounded-xl p-4 border border-border/50">
                <div>
                  <p className="text-xs font-medium text-foreground">Mesma conta</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Usar apenas 1 token</p>
                </div>
                <Switch checked={sameAccount} onCheckedChange={setSameAccount} />
              </div>

              {/* Tokens */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="text-primary font-bold">[TOKEN {sameAccount ? "ÚNICO" : "MÃE"}]</span>
                    <span className="text-muted-foreground/70">{sameAccount ? "Acesso total" : "Conta fonte"}</span>
                  </label>
                  <input
                    type="password"
                    value={sourceToken}
                    onChange={(e) => setSourceToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-background/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 font-mono text-xs transition-all duration-200"
                  />
                </div>

                {!sameAccount && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="text-primary font-bold">[TOKEN FILHA]</span>
                      <span className="text-muted-foreground/70">Conta destino</span>
                    </label>
                    <input
                      type="password"
                      value={targetToken}
                      onChange={(e) => setTargetToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-background/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 font-mono text-xs transition-all duration-200"
                    />
                  </div>
                )}

                <TokenGuide />
              </div>

              {/* Submit */}
              <Button
                onClick={handleRemixClick}
                disabled={isRunning || inQueue || isValidating || !isValid}
                className="w-full h-12 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl glow-border transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)]"
              >
                {isValidating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Verificando...
                  </span>
                ) : isRunning ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Processando...
                  </span>
                ) : inQueue ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Na fila...
                  </span>
                ) : (
                  "$ remix --execute (1 crédito)"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Status */}
      {inQueue && (
        <div className="max-w-md mx-auto px-4 mt-4">
          <div className="bg-card/80 backdrop-blur-sm border border-primary/20 rounded-2xl p-4 glow-box">
            <QueueStatus queueId={queueId} onCanStart={onQueueReady} />
          </div>
        </div>
      )}

      {/* TERMINAL */}
      <div className="mt-6 sm:mt-8">
        <div className="max-w-md mx-auto px-4 sm:px-0">
          <div className="bg-[hsl(220,20%,3%)] border border-border/50 rounded-2xl overflow-hidden shadow-[0_0_40px_hsl(var(--primary)/0.05)]">
            {/* Terminal header */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-muted/10 border-b border-border/30">
              <Terminal className="w-4 h-4 text-primary/70" />
              <span className="text-[11px] text-muted-foreground font-mono tracking-widest">terminal</span>
              <div className="ml-auto flex items-center gap-2">
                {isRunning && (
                  <span className="text-[10px] text-primary/60 font-mono animate-pulse-glow">executando...</span>
                )}
                <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
                  isRunning ? "bg-primary animate-pulse-glow shadow-[0_0_8px_hsl(var(--primary)/0.6)]" 
                  : logs.length > 0 ? "bg-primary/30" 
                  : "bg-muted-foreground/15"
                }`} />
              </div>
            </div>

            {/* Terminal body */}
            <div ref={terminalRef} className="h-[180px] sm:h-[220px] overflow-y-auto p-4 font-mono text-[11px] sm:text-xs space-y-1">
              {logs.length === 0 ? (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground/60">
                    <span className="text-terminal-dim">root@remixer</span>
                    <span className="text-muted-foreground/30">:</span>
                    <span className="text-primary/60">~</span>
                    <span className="text-muted-foreground/30">$</span>
                    <span className="text-muted-foreground/40 ml-1 animate-pulse-glow">_</span>
                  </p>
                  <p className="text-muted-foreground/25 text-[10px]">Aguardando comando...</p>
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-0.5">
                    <span className="text-muted-foreground/20 shrink-0 text-[10px] w-[76px] tabular-nums select-none">
                      {log.timestamp}
                    </span>
                    <LogLine message={log.message} status={log.status} />
                  </div>
                ))
              )}
              {isRunning && <p className="text-primary animate-pulse-glow mt-1 text-sm">▌</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 sm:py-6">
          <p className="text-[10px] text-muted-foreground/20 font-mono tracking-widest">v1.0 — jtc gitremix</p>
        </div>
      </div>

      <PixPaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onPaymentConfirmed={onPaymentConfirmed}
      />
    </div>
  );
};

export default Index;
