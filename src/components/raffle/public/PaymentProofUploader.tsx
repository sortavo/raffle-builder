import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useUploadPaymentProof } from "@/hooks/usePublicRaffle";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  ImageIcon,
  RefreshCw,
  Camera
} from "lucide-react";

interface PaymentProofUploaderProps {
  raffleId: string;
  referenceCode: string;
  ticketIds: string[];
  buyerName?: string;
  buyerEmail?: string;
  existingProofUrl?: string | null;
  onUploadSuccess?: () => void;
  variant?: 'compact' | 'full';
  className?: string;
}

export function PaymentProofUploader({
  raffleId,
  referenceCode,
  ticketIds,
  buyerName,
  buyerEmail,
  existingProofUrl,
  onUploadSuccess,
  variant = 'full',
  className,
}: PaymentProofUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  
  const uploadProof = useUploadPaymentProof();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Archivo muy grande", {
        description: "El archivo debe ser menor a 5MB"
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Tipo de archivo no válido", {
        description: "Solo se permiten imágenes JPG, PNG o WEBP"
      });
      return;
    }

    // Validate image dimensions
    const img = document.createElement('img');
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width > 4000 || img.height > 4000) {
        toast.error("Imagen muy grande", {
          description: "La imagen debe ser menor a 4000x4000 píxeles"
        });
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setShowReplaceConfirm(false);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      toast.error("Archivo inválido", {
        description: "No se pudo procesar la imagen"
      });
    };
    img.src = URL.createObjectURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    
    if (!referenceCode) {
      toast.error("Error", {
        description: "No se encontró la clave de reserva"
      });
      return;
    }
    
    try {
      await uploadProof.mutateAsync({
        raffleId,
        ticketIds,
        file,
        buyerName,
        buyerEmail,
        referenceCode,
      });
      
      // Clear the file after successful upload
      setFile(null);
      setPreview(null);
      onUploadSuccess?.();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const isCompact = variant === 'compact';

  // Already has proof and not replacing
  if (existingProofUrl && !showReplaceConfirm && !preview) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className={cn(
          "p-4 rounded-lg border",
          "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
        )}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-emerald-700 dark:text-emerald-300">
                Comprobante registrado
              </p>
              <p className="text-sm text-muted-foreground">
                Ya subiste un comprobante para esta reservación
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(existingProofUrl, '_blank')}
            >
              <ImageIcon className="h-4 w-4 mr-1" />
              Ver
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReplaceConfirm(true)}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reemplazar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Replace confirmation
  if (showReplaceConfirm && !preview) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className={cn(
          "p-4 rounded-lg border",
          "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
        )}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-700 dark:text-amber-300">
                ¿Reemplazar comprobante?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                El comprobante anterior será reemplazado.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReplaceConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Sí, subir nuevo
                </Button>
              </div>
            </div>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      
      {preview ? (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden bg-muted/30">
            <img 
              src={preview} 
              alt="Preview del comprobante" 
              className={cn(
                "w-full object-contain",
                isCompact ? "max-h-32" : "max-h-48"
              )} 
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
            >
              Cambiar
            </Button>
          </div>
          <Button
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={handleUpload}
            disabled={uploadProof.isPending}
          >
            {uploadProof.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Enviar Comprobante
              </>
            )}
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            "border-border hover:border-emerald-500/50 hover:bg-muted/30",
            isCompact ? "p-4" : "p-6"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center text-center gap-2">
            <div className={cn(
              "rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center",
              isCompact ? "w-10 h-10" : "w-12 h-12"
            )}>
              <Camera className={cn(
                "text-emerald-600 dark:text-emerald-400",
                isCompact ? "h-5 w-5" : "h-6 w-6"
              )} />
            </div>
            <div>
              <p className={cn(
                "font-medium text-foreground",
                isCompact ? "text-sm" : "text-base"
              )}>
                {isCompact ? "Subir comprobante" : "Toca para subir tu comprobante"}
              </p>
              <p className={cn(
                "text-muted-foreground",
                isCompact ? "text-xs" : "text-sm"
              )}>
                JPG, PNG o WEBP (máx. 5MB)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
