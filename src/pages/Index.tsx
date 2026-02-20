import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import TerminalHeader from "@/components/TerminalHeader";
import RepoInput from "@/components/RepoInput";
import LogLine, { LogStatus } from "@/components/LogLine";
import { ArrowDown, Zap } from "lucide-react";
import { toast } from "sonner";

interface LogEntry {
  message: string;
  status: LogStatus;
}

const Index = () => {
  const [sourceRepo, setSourceRepo] = useState("");
  const [targetRepo, setTargetRepo] = useState("");
  const [token, setToken] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (message: string, status: LogStatus = "running") => {
    setLogs((prev) => [...prev, { message, status }]);
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

    if (!token.trim()) {
      toast.error("Insira seu GitHub Personal Access Token");
      return;
    }

    setIsRunning(true);
    setLogs([]);

    addLog("Conectando à API do GitHub...");

    try {
      const { data, error } = await supabase.functions.invoke("github-remix", {
        body: {
          sourceOwner: source.owner,
          sourceRepo: source.repo,
          targetOwner: target.owner,
          targetRepo: target.repo,
          token: token,
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
        addLog("✨ Remix concluído com sucesso!", "success");
        toast.success("Remix concluído!");
      } else {
        addLog(`Erro: ${data?.error || "Falha desconhecida"}`, "error");
        toast.error(data?.error || "Falha no remix");
      }
    } catch (err: any) {
      updateLastLog("error");
      addLog(`Erro: ${err.message}`, "error");
      toast.error(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 scanline">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground glow-text mb-2 flex items-center justify-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            GitHub Remixer
          </h1>
          <p className="text-muted-foreground text-sm">
            Clone o conteúdo de um repo e envie para outro
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 glow-box">
          <TerminalHeader />

          <div className="space-y-4">
            <RepoInput
              label="Repositório fonte (conteúdo)"
              prefix="[SOURCE]"
              placeholder="https://github.com/user/repo-com-conteudo"
              value={sourceRepo}
              onChange={setSourceRepo}
            />

            <div className="flex justify-center">
              <ArrowDown className="w-5 h-5 text-primary animate-pulse-glow" />
            </div>

            <RepoInput
              label="Repositório destino (será substituído)"
              prefix="[TARGET]"
              placeholder="https://github.com/user/repo-destino"
              value={targetRepo}
              onChange={setTargetRepo}
            />

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="text-primary">[TOKEN]</span> GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-muted border border-border rounded-md px-3 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 glow-border font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Precisa de permissão <span className="text-primary">repo</span> — crie em{" "}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  github.com/settings/tokens
                </a>
              </p>
            </div>

            <Button
              onClick={handleRemix}
              disabled={isRunning || !sourceRepo || !targetRepo || !token}
              className="w-full h-12 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 glow-border mt-4"
            >
              {isRunning ? "Processando..." : "$ remix --execute"}
            </Button>
          </div>

          {logs.length > 0 && (
            <div className="mt-6 bg-muted rounded-md p-4 space-y-2 border border-border">
              <p className="text-xs text-muted-foreground mb-3">// output</p>
              {logs.map((log, i) => (
                <LogLine key={i} message={log.message} status={log.status} />
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          ⚠️ O conteúdo do repo destino será completamente substituído
        </p>
      </div>
    </div>
  );
};

export default Index;
