import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import TerminalHeader from "@/components/TerminalHeader";
import RepoInput from "@/components/RepoInput";
import TokenGuide from "@/components/TokenGuide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import LogLine, { LogStatus } from "@/components/LogLine";
import PixPaymentModal from "@/components/PixPaymentModal";
import QueueStatus from "@/components/QueueStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wand2, KeyRound, Loader2, LogOut, History, Gem, ToggleLeft, ToggleRight } from "lucide-react";

type AppState = "idle" | "awaiting_payment" | "in_queue" | "processing" | "success" | "error";

interface Log {
  message: string;
  status: LogStatus;
}

const Index = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  
  const [sourceRepo, setSourceRepo] = useState("");
  const [targetRepo, setTargetRepo] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [targetToken, setTargetToken] = useState("");
  const [useTwoTokens, setUseTwoTokens] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [appState, setAppState] = useState<AppState>("idle");
  const [queueId, setQueueId] = useState<string | null>(null);

  // --- CRITICAL AUTH GUARD ---
  useEffect(() => {
    if (!auth.loading && !auth.user) {
      navigate("/login");
    }
  }, [auth.loading, auth.user, navigate]);

  // While checking auth state, show a full-page loader
  if (auth.loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If after loading there is no user, render nothing until redirect happens.
  if (!auth.user) {
    return null;
  }
  // --- END OF CRITICAL AUTH GUARD ---

  const addLog = (message: string, status: LogStatus) => {
    setLogs(prev => [...prev, { message, status }]);
  };
  
  const handleRemix = async () => {
    if (!sourceRepo || !targetRepo || !githubToken || (useTwoTokens && !targetToken)) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    
    setLogs([]);
    addLog("Iniciando processo de remix...", "running");
    
    setAppState("awaiting_payment");
  };
  
  const onPaymentConfirmed = () => {
    setAppState("idle");
    toast.info("Pagamento confirmado! Iniciando o remix...");
    startProcessing();
  };
  
  const startProcessing = async () => {
    setAppState("processing");
    addLog("Verificando disponibilidade...", "running");
    
    const [srcOwner, srcRepo] = sourceRepo.split("/");
    const [tgtOwner, tgtRepo] = targetRepo.split("/");
    
    const { data, error } = await supabase.functions.invoke("github-remix", {
        body: {
            sourceOwner: srcOwner,
            sourceRepo: srcRepo,
            targetOwner: tgtOwner,
            targetRepo: tgtRepo,
            sourceToken: githubToken,
            targetToken: useTwoTokens ? targetToken : githubToken,
        },
    });
    
    // processing complete

    if(error) {
        addLog(`Erro ao iniciar remix: ${error.message}`, "error");
        toast.error("Ocorreu um erro inesperado.");
        setAppState("error");
        return;
    }

    if (data.status === "queued") {
        addLog(`Processo enfileirado. ID da fila: ${data.queue_id}`, "pending");
        setQueueId(data.queue_id);
        setAppState("in_queue");
    } else if (data.status === "processing" || data.status === "success") {
        addLog("Remix iniciado! Isso pode levar alguns minutos.", "success");
        // In a real scenario, you'd use websockets or polling for logs.
        // Here, we just show a success message.
        addLog(`Processo finalizado. Verifique seu repositório: ${targetRepo}`, "success");
        setAppState("success");
    } else {
        addLog(data.message || "Ocorreu um erro desconhecido", "error");
        toast.error(data.message || "Erro desconhecido.");
        setAppState("error");
    }
  };
  
  const onCanStartFromQueue = () => {
    setAppState("idle");
    toast.success("Sua vez na fila! Iniciando o remix...");
    startProcessing();
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isProcessing = appState === "processing" || appState === "in_queue";

  return (
    <div className="min-h-screen bg-background text-foreground font-mono p-4 sm:p-6 lg:p-8 flex justify-center items-start">
      <div className="w-full max-w-3xl">
        <header className="flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground">
            <p className="truncate max-w-[200px] sm:max-w-full">Usuário: <span className="text-primary font-bold">{auth.user.email}</span></p>
            <p>Logado como: <span className="text-primary font-bold">{auth.user.email}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/history')}>
                <History className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="bg-[hsl(220,13%,10%)] border border-primary/20 rounded-xl shadow-2xl shadow-primary/10 overflow-hidden">
         <div className="p-4 sm:p-6">
            <TerminalHeader />

            <div className="space-y-4">
                <RepoInput
                    label="Repositório de Origem"
                    placeholder="ex: lovable-dev/lovable-vite"
                    prefix="De:"
                    value={sourceRepo}
                    onChange={setSourceRepo}
                />
                <RepoInput
                    label="Seu Novo Repositório"
                    placeholder="ex: seu-usuario/meu-novo-projeto"
                    prefix="Para:"
                    value={targetRepo}
                    onChange={setTargetRepo}
                />

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground flex items-center gap-1.5 leading-tight">
                        <KeyRound className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{useTwoTokens ? "Token da Conta Mãe (Origem)" : "GitHub Personal Access Token"}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setUseTwoTokens(!useTwoTokens)}
                        className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                      >
                        {useTwoTokens ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
                        {useTwoTokens ? "2 Tokens" : "1 Token"}
                      </button>
                    </div>
                    <Input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="ghp_..."
                        className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 glow-border font-mono text-xs h-10"
                    />
                    
                    {useTwoTokens && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground flex items-center gap-1.5 leading-tight">
                          <KeyRound className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">Token da Conta Filha (Destino)</span>
                        </label>
                        <Input
                            type="password"
                            value={targetToken}
                            onChange={(e) => setTargetToken(e.target.value)}
                            placeholder="ghp_..."
                            className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 glow-border font-mono text-xs h-10"
                        />
                      </div>
                    )}
                </div>
                
                <TokenGuide/>
            </div>
            
            <Separator className="my-6 bg-border/30" />

            <div className="flex flex-col sm:flex-row gap-3">
               <Button onClick={handleRemix} className="w-full sm:w-auto flex-grow" disabled={isProcessing}>
                   {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4" />}
                   {isProcessing ? 'Processando...' : 'Remixar Agora'}
               </Button>
               <Button variant="outline" className="w-full sm:w-auto" onClick={() => setAppState("awaiting_payment")}>
                   <Gem className="mr-2 h-4 w-4 text-primary"/>
                   Comprar Créditos
               </Button>
            </div>

            {appState === "in_queue" && queueId && (
                <div className="mt-6">
                    <QueueStatus queueId={queueId} onCanStart={onCanStartFromQueue} />
                </div>
            )}
            
            {logs.length > 0 && appState !== "in_queue" && (
                <div className="mt-6 pt-4 border-t border-border/30 space-y-2">
                   {logs.map((log, i) => <LogLine key={i} message={log.message} status={log.status} />)}
                </div>
            )}
         </div>
        </div>
        <footer className="text-center mt-6 text-xs text-muted-foreground">
            <p>JTC GIT REMIX BR</p>
        </footer>
      </div>
      
      <PixPaymentModal
        open={appState === 'awaiting_payment'}
        onClose={() => setAppState("idle")}
        onPaymentConfirmed={onPaymentConfirmed}
      />
    </div>
  );
};

export default Index;
