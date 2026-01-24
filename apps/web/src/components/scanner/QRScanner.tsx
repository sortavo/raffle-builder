import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, FlipHorizontal } from "lucide-react";

interface QRScannerProps {
  onScan: (ticketId: string) => void;
  isActive: boolean;
}

export function QRScanner({ onScan, isActive }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const startScanner = async () => {
    try {
      setError(null);
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Extract ticket ID from URL or direct ID
          let ticketId = decodedText;
          
          // If it's a URL, extract the ticket ID
          if (decodedText.includes("/ticket/")) {
            const match = decodedText.match(/\/ticket\/([^/?]+)/);
            if (match) {
              ticketId = match[1];
            }
          }
          
          onScan(ticketId);
          stopScanner();
        },
        () => {
          // QR code not found - ignore
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setError(
        err.message?.includes("NotAllowedError") || err.message?.includes("Permission")
          ? "Permiso de cámara denegado. Habilita el acceso a la cámara."
          : "Error al iniciar la cámara. Verifica los permisos."
      );
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  const toggleCamera = async () => {
    await stopScanner();
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  useEffect(() => {
    if (isActive && !isScanning) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isActive, facingMode]);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        id="qr-reader"
        className="w-full max-w-sm aspect-square rounded-lg overflow-hidden bg-muted relative"
      />

      {error && (
        <div className="text-destructive text-sm text-center px-4">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {isScanning ? (
          <>
            <Button variant="outline" size="sm" onClick={toggleCamera}>
              <FlipHorizontal className="h-4 w-4 mr-2" />
              Cambiar cámara
            </Button>
            <Button variant="destructive" size="sm" onClick={stopScanner}>
              <CameraOff className="h-4 w-4 mr-2" />
              Detener
            </Button>
          </>
        ) : (
          <Button onClick={startScanner}>
            <Camera className="h-4 w-4 mr-2" />
            Iniciar cámara
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Apunta la cámara al código QR del boleto para verificarlo
      </p>
    </div>
  );
}
