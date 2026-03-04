import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Camera, X, AlertCircle, Flashlight, FlashlightOff, CheckCircle2, Package } from "lucide-react";

interface ProductPreview {
  name: string;
  image?: string;
}

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isOpen: boolean;
  onClose: () => void;
  getProductPreview?: (barcode: string) => ProductPreview | null;
}

// Função para gerar som de beep
const playBeepSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 1200;
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (err) {
    console.error("Erro ao reproduzir som:", err);
  }
};

// Função para vibrar o dispositivo
const vibrate = () => {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  } catch (err) {
    console.error("Erro ao vibrar:", err);
  }
};

export const BarcodeScanner = ({ onScan, isOpen, onClose, getProductPreview }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "checking">("checking");
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [productPreview, setProductPreview] = useState<ProductPreview | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      checkCameraPermission();
      setScannedCode(null);
      setShowSuccess(false);
      setProductPreview(null);
      hasScannedRef.current = false;
    } else {
      stopScanner();
      setPermissionState("checking");
      setError(null);
      setFlashOn(false);
      setScannedCode(null);
      setShowSuccess(false);
      setProductPreview(null);
      hasScannedRef.current = false;
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const checkCameraPermission = async () => {
    setPermissionState("checking");
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: "camera" as PermissionName });
        setPermissionState(result.state as "prompt" | "granted" | "denied");
        
        if (result.state === "granted") {
          startScanner();
        }
      } else {
        setPermissionState("prompt");
      }
    } catch (err) {
      setPermissionState("prompt");
    }
  };

  const requestCameraAccess = async () => {
    setError(null);
    setPermissionState("checking");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionState("granted");
      startScanner();
    } catch (err: any) {
      console.error("Erro ao solicitar permissão:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionState("denied");
        setError("Permissão da câmera negada. Acesse as configurações do navegador para permitir.");
      } else if (err.name === "NotFoundError") {
        setError("Nenhuma câmera encontrada no dispositivo.");
      } else {
        setError("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    }
  };

  const checkFlashSupport = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      
      if (capabilities.torch) {
        setFlashSupported(true);
        trackRef.current = track;
      } else {
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (err) {
      console.error("Erro ao verificar flash:", err);
    }
  };

  const toggleFlash = async () => {
    try {
      if (trackRef.current) {
        const newFlashState = !flashOn;
        await (trackRef.current as any).applyConstraints({
          advanced: [{ torch: newFlashState }]
        });
        setFlashOn(newFlashState);
      }
    } catch (err) {
      console.error("Erro ao alternar flash:", err);
    }
  };

  const startScanner = async () => {
    try {
      setError(null);
      const scannerId = "barcode-scanner-container";
      
      if (scannerRef.current) {
        await stopScanner();
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Check flash support
      await checkFlashSupport();

      scannerRef.current = new Html5Qrcode(scannerId);
      setIsScanning(true);

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          // Evitar leituras múltiplas
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          
          // Parar o scanner imediatamente
          if (scannerRef.current) {
            scannerRef.current.stop().catch(() => {});
          }
          
          // Tocar som de beep ao ler código
          playBeepSound();
          // Vibrar o dispositivo
          vibrate();
          
          // Buscar preview do produto se disponível
          if (getProductPreview) {
            const preview = getProductPreview(decodedText);
            setProductPreview(preview);
          }
          
          // Mostrar código e imagem de sucesso na tela
          setScannedCode(decodedText);
          setShowSuccess(true);
          
          // Aguardar 3 segundos mostrando sucesso e então enviar
          setTimeout(() => {
            onScan(decodedText);
            handleClose();
          }, 3000);
        },
        () => {
          // Ignore errors during scanning
        }
      );
    } catch (err: any) {
      console.error("Erro ao iniciar scanner:", err);
      if (err.name === "NotAllowedError") {
        setPermissionState("denied");
        setError("Permissão da câmera negada. Acesse as configurações do navegador para permitir.");
      } else {
        setError("Não foi possível iniciar a câmera. Tente novamente.");
      }
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    // Turn off flash
    if (trackRef.current) {
      try {
        await (trackRef.current as any).applyConstraints({
          advanced: [{ torch: false }]
        });
      } catch (err) {
        // Ignore
      }
      trackRef.current.stop();
      trackRef.current = null;
    }
    setFlashOn(false);
    setFlashSupported(false);

    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error("Erro ao parar scanner:", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Leitor de Código de Barras
          </DialogTitle>
          <DialogDescription>
            Posicione o código de barras no centro da câmera para leitura automática
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {permissionState === "checking" && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Verificando permissões...</p>
            </div>
          )}

          {permissionState === "prompt" && !error && (
            <div className="text-center py-8 space-y-4">
              <Camera className="h-16 w-16 mx-auto text-primary" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Permitir acesso à câmera</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Para ler códigos de barras, precisamos acessar a câmera do seu dispositivo.
                </p>
              </div>
              <Button onClick={requestCameraAccess} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Permitir Câmera
              </Button>
            </div>
          )}

          {permissionState === "denied" && (
            <div className="text-center py-8 space-y-4">
              <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Câmera bloqueada</h3>
                <p className="text-muted-foreground text-sm">
                  O acesso à câmera foi negado. Para usar o leitor de código de barras:
                </p>
                <ol className="text-left text-sm mt-2 space-y-1 text-muted-foreground">
                  <li>1. Clique no ícone de cadeado/câmera na barra de endereço</li>
                  <li>2. Permita o acesso à câmera</li>
                  <li>3. Recarregue a página</li>
                </ol>
              </div>
            </div>
          )}

          {permissionState === "granted" && !error && (
            <>
              <div className="relative">
                <div 
                  id="barcode-scanner-container" 
                  ref={containerRef}
                  className="w-full min-h-[250px] rounded-lg overflow-hidden bg-muted"
                />
                {/* Botão de Flash */}
                {flashSupported && (
                  <Button
                    variant={flashOn ? "default" : "outline"}
                    size="icon"
                    className="absolute top-2 right-2 z-10"
                    onClick={toggleFlash}
                  >
                    {flashOn ? (
                      <Flashlight className="h-5 w-5" />
                    ) : (
                      <FlashlightOff className="h-5 w-5" />
                    )}
                  </Button>
                )}
              </div>
              
              {/* Código lido com imagem de sucesso */}
              {showSuccess && scannedCode ? (
                <div className="bg-accent/20 border-2 border-accent rounded-lg p-6 text-center animate-in zoom-in-95 duration-300">
                  <div className="flex flex-col items-center gap-3">
                    {/* Imagem do produto ou ícone padrão */}
                    <div className="relative">
                      {productPreview?.image ? (
                        <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-accent shadow-lg">
                          <img 
                            src={productPreview.image} 
                            alt={productPreview.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-accent/30 rounded-full flex items-center justify-center">
                          <Package className="h-10 w-10 text-accent" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div>
                      {productPreview?.name ? (
                        <>
                          <p className="text-lg font-semibold text-foreground">{productPreview.name}</p>
                          <p className="text-sm text-muted-foreground">Código: {scannedCode}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground mb-1">Código lido com sucesso!</p>
                          <p className="text-xl font-mono font-bold text-accent">{scannedCode}</p>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {productPreview ? "Adicionando ao carrinho..." : "Processando..."}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  Posicione o código de barras no centro da tela
                </p>
              )}
            </>
          )}

          {error && permissionState !== "denied" && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={requestCameraAccess} variant="outline">
                Tentar Novamente
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
