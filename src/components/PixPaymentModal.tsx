import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, Loader2, CircleCheck, CircleX, Gem } from "lucide-react";
import { toast } from "sonner";

interface PixPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onPaymentConfirmed: () => void;
}

type PaymentState = "loading" | "awaiting" | "checking" | "approved" | "error";

const PixPaymentModal = ({ open, onClose, onPaymentConfirmed }: PixPaymentModalProps) => {
  const [state, setState] = useState<PaymentState>("loading");
  const [qrCode, setQrCode] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      createPayment();
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [open]);

  const createPayment = async () => {
    setState("loading");
    setError("");
    setCopied(false);

    try {
      const { data, error } = await supabase.functions.invoke("create-pix", {
        body: { description: "JTC GIT REMIX BR - 1 Crédito (R$0,30)" },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao gerar PIX");

      setQrCode(data.qr_code || "");
      setQrCodeBase64(data.qr_code_base64 || "");
      setPaymentId(data.payment_id);
      setState("awaiting");

      startPolling(data.payment_id);
    } catch (err: any) {
      setState("error");
      setError(err.message);
    }
  };

  const startPolling = (id: number) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-payment", {
          body: { payment_id: id },
        });

        if (error) return;

        if (data?.paid) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setState("approved");
          toast.success("Pagamento confirmado!");
          setTimeout(() => {
            onPaymentConfirmed();
          }, 1500);
        }
      } catch {
        // Keep polling
      }
    }, 3000);
  };

  const handleCopy = async () => {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleClose = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setState("loading");
    setPaymentId(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-[hsl(220,25%,6%)] border-primary/20 max-w-sm p-0 overflow-hidden shadow-[0_0_80px_hsl(var(--primary)/0.15)]">
        {/* Background grid effect */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />

        <div className="relative z-10 p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <Gem className="w-7 h-7 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                Pagamento <span className="text-primary glow-text">PIX</span>
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              1 crédito = <span className="text-primary font-bold">R$ 0,30</span> — Escaneie o QR Code
              <br />ou copie o código
            </p>
          </div>

          {/* Content */}
          {state === "loading" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-10 h-10 text-primary animate-spin drop-shadow-[0_0_12px_hsl(var(--primary)/0.5)]" />
              <p className="text-sm text-muted-foreground font-mono">Gerando QR Code...</p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-4 py-10">
              <CircleX className="w-12 h-12 text-destructive" />
              <p className="text-sm text-destructive text-center">{error}</p>
              <button
                onClick={createPayment}
                className="text-xs text-primary hover:text-primary/80 font-mono underline underline-offset-2 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {(state === "awaiting" || state === "checking") && (
            <div className="space-y-5">
              {/* QR Code with futuristic frame */}
              <div className="flex justify-center">
                <div className="relative">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl-md" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr-md" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl-md" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br-md" />

                  {/* Glow behind QR */}
                  <div className="absolute inset-0 bg-primary/5 rounded-xl blur-xl" />

                  {qrCodeBase64 ? (
                    <div className="relative bg-white p-4 rounded-xl shadow-[0_0_30px_hsl(var(--primary)/0.1)]">
                      <img
                        src={`data:image/png;base64,${qrCodeBase64}`}
                        alt="QR Code PIX"
                        className="w-52 h-52"
                      />
                    </div>
                  ) : (
                    <div className="relative w-52 h-52 bg-muted/10 rounded-xl flex items-center justify-center border border-border/30">
                      <Loader2 className="w-8 h-8 text-primary/30 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* PIX code display */}
              {qrCode && (
                <div className="space-y-3">
                  <div className="bg-[hsl(220,20%,8%)] border border-border/30 rounded-xl p-3.5 font-mono text-[10px] text-muted-foreground/80 break-all max-h-[72px] overflow-y-auto leading-relaxed">
                    {qrCode}
                  </div>

                  {/* Copy button */}
                  <button
                    onClick={handleCopy}
                    className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl border text-sm font-bold font-mono transition-all duration-300 ${
                      copied
                        ? "bg-primary/10 border-primary/40 text-primary shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                        : "bg-[hsl(220,20%,10%)] border-border/50 text-foreground hover:border-primary/30 hover:bg-primary/5 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-primary/70" />
                        Copiar código PIX
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Waiting indicator */}
              <div className="flex items-center justify-center gap-2.5 pt-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse-glow shadow-[0_0_10px_hsl(var(--primary)/0.6)]" />
                <p className="text-sm text-muted-foreground font-medium">
                  Aguardando pagamento...
                </p>
              </div>
            </div>
          )}

          {state === "approved" && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="p-4 bg-primary/10 rounded-full shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
                <CircleCheck className="w-12 h-12 text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
              </div>
              <p className="text-lg text-primary font-bold glow-text">Pagamento confirmado!</p>
              <p className="text-sm text-muted-foreground">Executando remix...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PixPaymentModal;
