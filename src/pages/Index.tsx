import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import RepoInput from "@/components/RepoInput";
import LogLine, { LogStatus } from "@/components/LogLine";
import { ArrowDown, Zap, AlertTriangle, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

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
  const [sourceRepo, setSourceRepo] = useState("");
  const [targetRepo, setTargetRepo] = useState("");
  const [sourceToken, setSourceToken] = useState("");
  const [targetToken, setTargetToken] = useState("");
  const [sameAccount, setSameAccount] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

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

  const handleRemix = async () => {
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

    setIsRunning(true);
    setLogs([]);
    addLog("Conectando à GitHub API...");
    addLog(`SRC → ${source.owner}/${source.repo}`);
    addLog(`DST → ${target.owner}/${target.repo}`);
    addLog("Enviando request...");

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

      if (data?.success) {
        addLog("══════════════════════════════", "success");
        addLog("✨ REMIX CONCLUÍDO!", "success");
        addLog("══════════════════════════════", "success");
        toast.success("Remix concluído!");
      } else {
        addLog(`FATAL: ${data?.error || "Erro desconhecido"}`, "error");
        toast.error(data?.error || "Falha no remix");
      }
    } catch (err: any) {
      updateLastLog("error");
      addLog(`FATAL: ${err.message}`, "error");
      toast.error(err.message);
    } finally {
      setIsRunning(false);
      addLog("Processo finalizado.", "pending");
    }
  };

  const isValid = sourceRepo && targetRepo && sourceToken && (sameAccount || targetToken);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* FORM AREA - scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-3 py-4 sm:px-6 sm:py-6">
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground glow-text flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              GitHub Remixer
            </h1>
            <p className="text-muted-foreground text-[10px] sm:text-xs mt-1">
              Clona o conteúdo da mãe e substitui tudo na filha
            </p>
          </div>

          {/* Card */}
          <div className="bg-card border border-border rounded-lg p-3 sm:p-5 glow-box space-y-3">
            {/* Terminal dots */}
            <div className="flex items-center gap-1.5 pb-2 border-b border-border">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
              <div className="w-2.5 h-2.5 rounded-full bg-accent" />
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-muted-foreground text-[10px] ml-2">github-remixer v1.0</span>
            </div>

            <RepoInput
              label="Conta Mãe (fonte)"
              prefix="[MÃE]"
              placeholder="https://github.com/user/repo"
              value={sourceRepo}
              onChange={setSourceRepo}
            />

            <div className="flex justify-center py-0.5">
              <ArrowDown className="w-4 h-4 text-primary animate-pulse-glow" />
            </div>

            <RepoInput
              label="Conta Filha (destino)"
              prefix="[FILHA]"
              placeholder="https://github.com/user/repo"
              value={targetRepo}
              onChange={setTargetRepo}
            />

            {/* Warning */}
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded p-2">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
              <p className="text-[10px] sm:text-xs text-destructive leading-tight">
                Conteúdo da filha será <strong>apagado</strong> e substituído.
              </p>
            </div>

            {/* Same account toggle */}
            <div className="flex items-center justify-between bg-muted rounded p-2 border border-border">
              <label className="text-[10px] sm:text-xs text-secondary-foreground">Mesma conta? (1 token)</label>
              <Switch checked={sameAccount} onCheckedChange={setSameAccount} />
            </div>

            {/* Token(s) */}
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[10px] sm:text-xs text-muted-foreground">
                  <span className="text-primary font-semibold">[TOKEN {sameAccount ? "ÚNICO" : "MÃE"}]</span> {sameAccount ? "Acesso aos dois repos" : "Conta fonte"}
                </label>
                <input
                  type="password"
                  value={sourceToken}
                  onChange={(e) => setSourceToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-muted border border-border rounded px-2.5 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 glow-border font-mono text-[11px]"
                />
              </div>

              {!sameAccount && (
                <div className="space-y-1">
                  <label className="text-[10px] sm:text-xs text-muted-foreground">
                    <span className="text-primary font-semibold">[TOKEN FILHA]</span> Conta destino
                  </label>
                  <input
                    type="password"
                    value={targetToken}
                    onChange={(e) => setTargetToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-muted border border-border rounded px-2.5 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 glow-border font-mono text-[11px]"
                  />
                </div>
              )}

              <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                Permissão <span className="text-primary">repo</span> —{" "}
                <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  criar token
                </a>
              </p>
            </div>

            <Button
              onClick={handleRemix}
              disabled={isRunning || !isValid}
              className="w-full h-9 sm:h-10 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 glow-border"
            >
              {isRunning ? "⏳ Processando..." : "$ remix --execute"}
            </Button>
          </div>
        </div>
      </div>

      {/* TERMINAL - fixed bottom */}
      <div className="h-[180px] sm:h-[220px] flex-shrink-0 border-t border-primary/30 bg-[hsl(220,25%,2%)] flex flex-col">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-muted/20">
          <Terminal className="w-3 h-3 text-primary" />
          <span className="text-[10px] text-muted-foreground font-mono">terminal</span>
          <div className={`w-1.5 h-1.5 rounded-full ml-auto ${isRunning ? "bg-primary animate-pulse-glow" : logs.length > 0 ? "bg-primary/40" : "bg-muted-foreground/20"}`} />
        </div>
        <div ref={terminalRef} className="flex-1 overflow-y-auto p-2 sm:p-3 font-mono text-[10px] sm:text-xs space-y-0.5">
          {logs.length === 0 ? (
            <div>
              <p className="text-muted-foreground">
                <span className="text-terminal-dim">root@remixer</span>
                <span className="text-muted-foreground">:</span>
                <span className="text-primary">~</span>
                <span className="text-muted-foreground">$ _</span>
              </p>
              <p className="text-muted-foreground/40 mt-1">Aguardando...</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-muted-foreground/30 shrink-0 text-[9px] w-[72px] tabular-nums">{log.timestamp}</span>
                <LogLine message={log.message} status={log.status} />
              </div>
            ))
          )}
          {isRunning && <p className="text-primary animate-pulse-glow">▌</p>}
        </div>
      </div>
    </div>
  );
};

export default Index;
