import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Camera, Flashlight, FlashlightOff, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ImageUploadProps {
  bucket: string;
  currentImageUrl: string | null;
  onImageUploaded: (url: string) => void;
  label: string;
}

export const ImageUpload = ({ bucket, currentImageUrl, onImageUploaded, label }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const { toast } = useToast();

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop() || 'jpg';
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({ title: "Erro ao fazer upload", description: "Usuário não autenticado", variant: "destructive" });
        return;
      }

      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      
      onImageUploaded(data.publicUrl);
      toast({ title: "Upload realizado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao fazer upload", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    await uploadImage(event.target.files[0]);
  };

  const startCamera = async () => {
    try {
      setShowCamera(true);
      
      // Wait for dialog to mount
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment", width: 1280, height: 720 } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Check flash support
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      
      if (capabilities.torch) {
        setFlashSupported(true);
        trackRef.current = track;
      }
    } catch (err) {
      console.error("Erro ao abrir câmera:", err);
      toast({ title: "Erro ao acessar câmera", variant: "destructive" });
      setShowCamera(false);
    }
  };

  const stopCamera = async () => {
    // Turn off flash first
    if (trackRef.current) {
      try {
        await (trackRef.current as any).applyConstraints({
          advanced: [{ torch: false }]
        });
      } catch (err) {
        // Ignore
      }
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    trackRef.current = null;
    setFlashOn(false);
    setFlashSupported(false);
    setShowCamera(false);
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

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          await stopCamera();
          await uploadImage(file);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const removeImage = () => {
    onImageUploaded("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {currentImageUrl ? (
        <div className="space-y-2">
          <img 
            src={currentImageUrl} 
            alt="Preview" 
            className="h-32 w-32 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={removeImage}
          >
            <X className="h-4 w-4 mr-2" />
            Remover
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Escolher Arquivo
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={startCamera}
            disabled={uploading}
          >
            <Camera className="h-4 w-4 mr-2" />
            Tirar Foto
          </Button>
          
          {uploading && <span className="text-sm text-muted-foreground">Enviando...</span>}
        </div>
      )}

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Tirar Foto
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className="w-full h-auto"
              />
              
              {/* Flash button */}
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
            
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={stopCamera}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={capturePhoto}>
                <Camera className="h-4 w-4 mr-2" />
                Capturar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
