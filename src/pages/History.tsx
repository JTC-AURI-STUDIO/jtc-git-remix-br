import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import PixPaymentModal from "@/components/PixPaymentModal";
import { Zap, ArrowLeft, Clock, CheckCircle2, XCircle, Loader2, RefreshCw, CreditCard } from "lucide-react";

interface HistoryEntry {
  id: string;
  source_repo: string;
  target_repo: string;
  status: string;
  amount: number;
  created_at: string;
  finished_at: string | null;
  payment_id: string | null;
}

const History = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("remix_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setEntries(data as HistoryEntry[]);
    }
    setLoading(false);
  };

  const handleRetryPayment = (entry: HistoryEntry) => {
    setSelectedEntry(entry);
    setShowPayment(true);
  };

  const onPaymentConfirmed = async () => {
    setShowPayment(false);
    setSelectedEntry(null);
    await fetchHistory();
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case "error":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "success": return "Concluído";
      case "error": return "Erro";
      case "processing": return "Processando";
      default: return "Pendente";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 scanline pointer-events-none z-50 opacity-30" />

      <div className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={fetchHistory} className="h-8 w-8">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground font-mono">
                JTC <span className="text-primary">GIT REMIX BR</span>
              </span>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden glow-box">
            <div className="flex items-center gap-2 px-5 py-3 bg-muted/30 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <div className="w-3 h-3 rounded-full bg-[hsl(45,90%,55%)]" />
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
              <span className="text-muted-foreground text-[11px] ml-1 font-mono tracking-wider flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                histórico
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono">
                {entries.length} registro(s)
              </span>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground/50 font-mono">Nenhum remix realizado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-background/40 border border-border/50 rounded-xl p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {statusIcon(entry.status)}
                          <span className={`text-[11px] font-mono font-bold ${
                            entry.status === "success" ? "text-primary" :
                            entry.status === "error" ? "text-destructive" :
                            "text-muted-foreground"
                          }`}>
                            {statusLabel(entry.status)}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/50 font-mono">
                          {formatDate(entry.created_at)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span className="text-primary/60 shrink-0">SRC →</span>
                          <span className="text-foreground/70 truncate">{entry.source_repo}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span className="text-primary/60 shrink-0">DST →</span>
                          <span className="text-foreground/70 truncate">{entry.target_repo}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/30">
                        <span className="text-[10px] text-muted-foreground/40 font-mono">
                          R$ {Number(entry.amount).toFixed(2)}
                        </span>
                        {entry.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] gap-1 px-2"
                            onClick={() => handleRetryPayment(entry)}
                          >
                            <CreditCard className="w-3 h-3" />
                            Pagar
                          </Button>
                        )}
                        {entry.finished_at && (
                          <span className="text-[10px] text-muted-foreground/40 font-mono">
                            Finalizado: {formatDate(entry.finished_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center mt-4 space-y-1">
          <p className="text-[10px] text-muted-foreground/20 font-mono tracking-widest">v1.0 — jtc git remix br</p>
          <p className="text-[10px] text-muted-foreground/30 font-mono">Criado por <span className="text-primary/40 font-bold">JARDIEL DE SOUSA LOPES</span> — Criador da <span className="text-primary/40 font-bold">JTC</span></p>
        </div>
      </div>

      <PixPaymentModal
        open={showPayment}
        onClose={() => { setShowPayment(false); setSelectedEntry(null); }}
        onPaymentConfirmed={onPaymentConfirmed}
      />
    </div>
  );
};

export default History;