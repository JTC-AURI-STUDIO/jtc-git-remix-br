import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, QrCode, Loader2, CircleCheck, CircleX } from "lucide-react";
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
        body: { description: "JTC GITREMIX - 1 Crédito (R$0,30)" },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao gerar PIX");

      setQrCode(data.qr_code || "");
      setQrCodeBase64(data.qr_code_base64 || "");
      setPaymentId(data.payment_id);
      setState("awaiting");

      // Start polling for payment status
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
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-lg">
            <QrCode className="w-5 h-5 text-primary" />
            Pagamento PIX
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            1 crédito = R$ 0,30 — Escaneie o QR Code ou copie o código
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {state === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <CircleX className="w-10 h-10 text-destructive" />
              <p className="text-sm text-destructive text-center">{error}</p>
              <Button onClick={createPayment} size="sm" variant="outline">
                Tentar novamente
              </Button>
            </div>
          )}

          {(state === "awaiting" || state === "checking") && (
            <>
              {/* QR Code */}
              <div className="flex justify-center">
                {qrCodeBase64 ? (
                  <div className="bg-white p-3 rounded-xl">
                    <img
                      src={`data:image/png;base64,${qrCodeBase64}`}
                      alt="QR Code PIX"
                      className="w-48 h-48"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-muted/20 rounded-xl flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Copy code button */}
              {qrCode && (
                <div className="space-y-2">
                  <div className="bg-background/60 border border-border rounded-xl p-3 font-mono text-[10px] text-muted-foreground break-all max-h-20 overflow-y-auto">
                    {qrCode}
                  </div>
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="w-full h-10 text-xs gap-2 rounded-xl"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-primary" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar código PIX
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Status indicator */}
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                <p className="text-[11px] text-muted-foreground font-mono">
                  Aguardando pagamento...
                </p>
              </div>
            </>
          )}

          {state === "approved" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="p-3 bg-primary/10 rounded-full">
                <CircleCheck className="w-10 h-10 text-primary" />
              </div>
              <p className="text-sm text-primary font-bold">Pagamento confirmado!</p>
              <p className="text-xs text-muted-foreground">Executando remix...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PixPaymentModal;
