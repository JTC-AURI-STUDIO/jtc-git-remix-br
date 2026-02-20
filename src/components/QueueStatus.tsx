import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Loader2, CircleCheck } from "lucide-react";

interface QueueStatusProps {
  queueId: string | null;
  onCanStart: () => void;
}

const QueueStatus = ({ queueId, onCanStart }: QueueStatusProps) => {
  const [position, setPosition] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("checking");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!queueId) return;

    checkPosition();
    pollingRef.current = setInterval(checkPosition, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [queueId]);

  const checkPosition = async () => {
    if (!queueId) return;

    try {
      const { data, error } = await supabase.functions.invoke("remix-queue", {
        body: { action: "position", queue_id: queueId },
      });

      if (error) return;

      if (data?.can_start) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setStatus("ready");
        setPosition(0);
        onCanStart();
        return;
      }

      setPosition(data?.position || 0);
      setStatus(data?.status || "waiting");
    } catch {
      // Keep polling
    }
  };

  if (status === "ready") {
    return (
      <div className="flex items-center gap-2 justify-center py-3">
        <CircleCheck className="w-5 h-5 text-primary" />
        <span className="text-sm text-primary font-bold font-mono">Sua vez! Iniciando...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <span className="text-sm text-foreground font-mono font-bold">Fila de espera</span>
      </div>

      {position !== null && position > 0 ? (
        <>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-primary glow-text font-mono">
              #{position}
            </div>
            <div className="text-xs text-muted-foreground text-left">
              <p>Posição na fila</p>
              <p className="text-[10px]">
                {position === 1 ? "Você é o próximo!" : `${position - 1} pessoa(s) na frente`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            <span className="text-[11px] text-muted-foreground font-mono">
              Aguardando...
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground font-mono">Verificando fila...</span>
        </div>
      )}
    </div>
  );
};

export default QueueStatus;
