import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import PixPaymentModal from "@/components/PixPaymentModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Github, Loader2 } from "lucide-react";
import LogLine, { LogStatus } from "@/components/LogLine";
import { User } from "@supabase/supabase-js";
import RepoInput from "@/components/RepoInput";
import TokenInput from "@/components/TokenInput";
import TerminalHeader from "@/components/TerminalHeader";
import QueueStatus from "@/components/QueueStatus";
import { Link } from "react-router-dom";

interface Log {
  message: string;
  status: LogStatus;
}

const initialLogs: Log[] = [
  { message: "Aguardando repositório e token...", status: "pending" },
];

const Index = () => {
  const [repoBase, setRepoBase] = useState("");
  const [repoHead, setRepoHead] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>(initialLogs);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [terminalVisible, setTerminalVisible] = useState(false);

  const { user, loading } = useAuth();
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (user) {
      fetchCredits(user);
      const storedToken = localStorage.getItem(`githubToken_${user.id}`);
      if (storedToken) setGithubToken(storedToken);
    }
  }, [user]);

  const fetchCredits = async (currentUser: User) => {
    const { data, error } = await supabase
      .from("credits")
      .select("count")
      .eq("user_id", currentUser.id)
      .single();

    if (!error && data) {
      setUserCredits(data.count);
    } else {
      setUserCredits(0);
    }
  };

  const handleTokenChange = (value: string) => {
    setGithubToken(value);
    if (user) {
      localStorage.setItem(`githubToken_${user.id}`, value);
    }
  };

  const addLog = (message: string, status: LogStatus, fixedIndex?: number) => {
    setLogs((prev) => {
      const newLogs = [...prev];
      if (fixedIndex !== undefined && newLogs[fixedIndex]) {
        newLogs[fixedIndex] = { message, status };
      } else {
        const existingIndex = newLogs.findIndex((l) => l.status === "running");
        if (existingIndex > -1) {
          newLogs[existingIndex] = { ...newLogs[existingIndex], status: "success" };
          newLogs.push({ message, status });
        } else {
          newLogs[newLogs.length - 1] = { message, status };
        }
      }
      return newLogs;
    });
  };

  const startRemixProcess = async () => {
    setIsProcessing(true);
    setQueueId(null);
    setTerminalVisible(true);

    const logsWithToken = [
      { message: "Repositório e token recebidos", status: "success" },
      { message: "Validando token do GitHub...", status: "running" },
    ];
    setLogs(logsWithToken);

    try {
      const { data, error } = await supabase.functions.invoke("github-remix", {
        body: { repo_base: repoBase, repo_head: repoHead, token: githubToken },
      });

      if (error) throw new Error("Falha na comunicação com o servidor.");
      if (!data.success && data.reason === "in_queue") {
        addLog("Você entrou na fila de espera.", "success");
        setQueueId(data.queue_id);
        return; // Don't proceed further, wait for queue
      }
      if (!data.success) throw new Error(data.error || "Erro desconhecido");

      // Direct execution, not queued
      pollLogs(data.run_id);

    } catch (e: any) {
      addLog(e.message, "error");
      setIsProcessing(false);
    }
  };

  const handleQueueReady = () => {
      toast.success("Sua vez na fila! Iniciando o remix...");
      startRemixProcess(); // Re-trigger the process
  }

  const pollLogs = (runId: string) => {
    const eventSource = new EventSource(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-remix?run_id=${runId}`
    );

    eventSource.onopen = () => {
      addLog("Conectado ao stream de logs...\n", "success");
    };

    eventSource.onmessage = (event) => {
      const logData = JSON.parse(event.data);

      if (logData.log) {
        addLog(logData.log, "running");
      }

      if (logData.done) {
        addLog("Remix concluído com sucesso!", "success");
        eventSource.close();
        setIsProcessing(false);
        if (user) fetchCredits(user);
      }
      if (logData.error) {
        addLog(`Erro: ${logData.error}`, "error");
        eventSource.close();
        setIsProcessing(false);
      }
    };

    eventSource.onerror = () => {
      addLog("Conexão com o servidor perdida. Tentando reconectar...", "error");
      // The browser will automatically try to reconnect.
      // If it fails consistently, we might need to close it.
      // For now, we just log the error.
      // eventSource.close();
      // setIsProcessing(false);
    };
  };

  const handleRemixClick = async () => {
    if (!repoBase || !repoHead || !githubToken) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    if (userCredits === null || userCredits < 1) {
      setIsModalOpen(true);
      return;
    }

    await startRemixProcess();
  };

  const onPaymentConfirmed = async () => {
    setIsModalOpen(false);
    toast.info("Crédito adicionado! Iniciando remix...");
    if (user) await fetchCredits(user);
    await startRemixProcess();
  };

  const renderUserStatus = () => {
    if (loading) {
      return <div className="h-5 w-24 bg-muted/30 rounded animate-pulse" />;
    }
    if (user) {
      return (
        <div className="flex items-center gap-4 text-xs">
          <span>{user.email}</span>
          <span className="font-mono bg-primary/10 text-primary px-2 py-1 rounded">
            Créditos: {userCredits ?? "..."}
          </span>
          <button onClick={() => supabase.auth.signOut()} className="text-muted-foreground hover:text-foreground">
            Sair
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link to="/login">Entrar</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/signup">Cadastrar</Link>
        </Button>
      </div>
    );
  };

  return (
    <main className="bg-background text-foreground min-h-screen font-sans">
      <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-10">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <Github className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold tracking-tighter">
              JTC GIT <span className="text-primary glow-text">REMIX</span> BR
            </h1>
          </div>
          <div className="text-xs text-muted-foreground">
            {renderUserStatus()}
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Panel: Inputs */}
          <div className="space-y-6">
            <RepoInput
              prefix="BASE"
              label="Repositório base (o original)"
              placeholder="ex: user/repo-original"
              value={repoBase}
              onChange={setRepoBase}
            />
            <RepoInput
              prefix="HEAD"
              label="Seu repositório (o que vai receber as mudanças)"
              placeholder="ex: seu-user/repo-fork"
              value={repoHead}
              onChange={setRepoHead}
            />
            <TokenInput
              value={githubToken}
              onChange={handleTokenChange}
            />

            <Button
              onClick={handleRemixClick}
              size="lg"
              className="w-full font-bold text-lg tracking-wider group relative overflow-hidden transition-all duration-300 ease-in-out disabled:opacity-50 shadow-lg glow-shadow"
              disabled={isProcessing}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary opacity-80 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative z-10 flex items-center justify-center">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <span className="transition-transform duration-300 group-hover:scale-105">
                      REMIXAR AGORA
                    </span>
                    <span className="ml-2 text-xs opacity-80 font-mono">
                      (1 CRÉDITO)
                    </span>
                  </>
                )}
              </span>
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Problemas? Abra um <a href="#" className="text-primary hover:underline">ticket no Discord</a>.
            </p>
          </div>

          {/* Right Panel: Terminal */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-4 md:p-6 min-h-[300px] flex flex-col font-mono text-xs shadow-inner">
            <TerminalHeader />
            
            {terminalVisible ? (
              <div ref={terminalRef} className="flex-grow space-y-2.5 overflow-y-auto pr-2 scrollbar-thin">
                {queueId ? (
                  <QueueStatus queueId={queueId} onCanStart={handleQueueReady} />
                ) : (
                  logs.map((log, index) => (
                    <LogLine key={index} message={log.message} status={log.status} />
                  ))
                )}
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center flex-grow text-center text-muted-foreground/60">
                  <p className="text-sm">O resultado do processo aparecerá aqui.</p>
                  <p className="mt-2 text-xs">Preencha os campos e clique em 'Remixar Agora' para iniciar.</p>
              </div>
            )}
          </div>
        </div>

        <PixPaymentModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onPaymentConfirmed={onPaymentConfirmed}
        />
      </div>
    </main>
  );
};

export default Index;
