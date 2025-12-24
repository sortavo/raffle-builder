import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(checkIOS);

    // Check if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;

    // Check if dismissed before
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Delay showing prompt for better UX
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    
    // For iOS, show custom instructions after a delay
    if (checkIOS && !isStandalone) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80"
      >
        <div className="bg-card border border-border rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm">Instalar Sortavo</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {isIOS
                  ? 'Toca el botón de compartir y selecciona "Agregar a Inicio"'
                  : "Instala la app para acceso rápido y notificaciones"}
              </p>

              <div className="flex gap-2 mt-3">
                {!isIOS && deferredPrompt && (
                  <Button size="sm" onClick={handleInstall} className="h-8">
                    <Download className="h-3 w-3 mr-1" />
                    Instalar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-8"
                >
                  Ahora no
                </Button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
