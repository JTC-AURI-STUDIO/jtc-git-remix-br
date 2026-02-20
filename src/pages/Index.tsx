import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import TerminalHeader from "@/components/TerminalHeader";
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
      toast.error("URLs inválidas. Use o formato: https://github.com/owner/repo");
      return;
    }

    if (!sourceToken.trim()) {
      toast.error("Insira o token da conta mãe (fonte)");
      return;
    }

    if (!sameAccount && !targetToken.trim()) {
      toast.error("Insira o token da conta filha (destino)");
      return;
    }

    setIsRunning(true);
    setLogs([]);
    addLog("Iniciando conexão com GitHub API...");
    addLog(`Source: ${source.owner}/${source.repo}`);
    addLog(`Target: ${target.owner}/${target.repo}`);
    addLog("Enviando request para edge function...");

    try {
      const { data, error } = await supabase.functions.invoke("github-remix", {
        body: {
          sourceOwner: source.owner,
          sourceRepo: source.repo,
          targetOwner: target.owner,
          targetRepo: target.repo,
          sourceToken: sourceToken,
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
        addLog("═══════════════════════════════════════", "success");
        addLog("✨ REMIX CONCLUÍDO COM SUCESSO!", "success");
        addLog("═══════════════════════════════════════", "success");
        toast.success("Remix concluído!");
      } else {
        addLog(`FATAL: ${data?.error || "Falha desconhecida"}`, "error");
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* TOP: Form */}
      <div className="flex-shrink-0 flex items-center justify-center p-4 pt-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground glow-text mb-1 flex items-center justify-center gap-3">
              <Zap className="w-7 h-7 text-primary" />
              GitHub Remixer
            </h1>
            <p className="text-muted-foreground text-xs">
              Clona o conteúdo da conta mãe e substitui tudo na conta filha
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 glow-box">
            <TerminalHeader />

            <div className="space-y-3">
              <RepoInput
                label="Conta Mãe — repositório com o conteúdo"
                prefix="[MÃE]"
                placeholder="https://github.com/conta-mae/repo-fonte"
                value={sourceRepo}
                onChange={setSourceRepo}
              />

              <div className="flex justify-center">
                <ArrowDown className="w-4 h-4 text-primary animate-pulse-glow" />
              </div>

              <RepoInput
                label="Conta Filha — será totalmente substituído"
                prefix="[FILHA]"
                placeholder="https://github.com/conta-filha/repo-destino"
                value={targetRepo}
                onChange={setTargetRepo}
              />

              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-md p-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive">
                  Todo o conteúdo da filha será <strong>apagado permanentemente</strong> e substituído.
                </p>
              </div>

              <div className="flex items-center justify-between bg-muted rounded-md p-2.5 border border-border">
                <label className="text-xs text-secondary-foreground">
                  Mesma conta GitHub? (um token só)
                </label>
                <Switch checked={sameAccount} onCheckedChange={setSameAccount} />
              </div>

              <div className="space-y-2">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="text-primary">[TOKEN MÃE]</span> Token da conta fonte
                  </label>
                  <input
                    type="password"
                    value={sourceToken}
                    onChange={(e) => setSourceToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-muted border border-border rounded-md px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 glow-border font-mono text-xs"
                  />
                </div>

                {!sameAccount && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="text-primary">[TOKEN FILHA]</span> Token da conta destino
                    </label>
                    <input
                      type="password"
                      value={targetToken}
                      onChange={(e) => setTargetToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-muted border border-border rounded-md px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 glow-border font-mono text-xs"
                    />
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Permissão <span className="text-primary">repo</span> necessária —{" "}
                  <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    criar token
                  </a>
                </p>
              </div>

              <Button
                onClick={handleRemix}
                disabled={isRunning || !isValid}
                className="w-full h-10 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 glow-border"
              >
                {isRunning ? "⏳ Processando..." : "$ remix --execute"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Terminal Output - always visible */}
      <div className="flex-1 min-h-[280px] mt-4 border-t border-border bg-[hsl(220,22%,3%)]">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-muted-foreground font-mono">terminal — remix output</span>
          <div className={`w-2 h-2 rounded-full ml-auto ${isRunning ? "bg-primary animate-pulse-glow" : logs.length > 0 ? "bg-primary/50" : "bg-muted-foreground/30"}`} />
        </div>
        <div className="p-4 font-mono text-xs space-y-1 overflow-y-auto max-h-[400px]">
          {logs.length === 0 ? (
            <div className="space-y-1">
              <p className="text-muted-foreground">
                <span className="text-terminal-dim">guest@remixer</span>
                <span className="text-muted-foreground">:</span>
                <span className="text-primary">~</span>
                <span className="text-muted-foreground">$ _</span>
              </p>
              <p className="text-muted-foreground/50 text-xs">Aguardando execução...</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground/40 shrink-0 w-20">[{log.timestamp}]</span>
                <LogLine message={log.message} status={log.status} />
              </div>
            ))
          )}
          {isRunning && (
            <p className="text-primary animate-pulse-glow mt-2">▌</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
