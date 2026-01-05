import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useCookieConsent } from '@/hooks/useCookieConsent';

export function CookieConsentBanner() {
  const { hasConsented, isLoaded, setConsent, acceptAll, rejectAll } = useCookieConsent();
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(true);

  // Don't render until loaded or if already consented
  if (!isLoaded || hasConsented) {
    return null;
  }

  const handleSavePreferences = () => {
    setConsent({
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
      >
        <div className="mx-auto max-w-4xl rounded-xl border bg-card shadow-xl">
          <div className="p-4 md:p-6">
            <div className="flex items-start gap-4">
              <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Configuración de Cookies</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Usamos cookies para mejorar tu experiencia. Las cookies esenciales son necesarias para el funcionamiento del sitio. 
                    Las cookies de análisis y marketing nos ayudan a mejorar nuestros servicios.
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  {showSettings ? (
                    <motion.div
                      key="settings"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3 overflow-hidden"
                    >
                      {/* Essential - Always on */}
                      <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                        <div>
                          <p className="font-medium text-sm">Esenciales</p>
                          <p className="text-xs text-muted-foreground">
                            Necesarias para el funcionamiento del sitio
                          </p>
                        </div>
                        <Switch checked disabled className="opacity-50" />
                      </div>

                      {/* Analytics */}
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium text-sm">Análisis</p>
                          <p className="text-xs text-muted-foreground">
                            Google Analytics, estadísticas de uso
                          </p>
                        </div>
                        <Switch
                          checked={analyticsEnabled}
                          onCheckedChange={setAnalyticsEnabled}
                        />
                      </div>

                      {/* Marketing */}
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium text-sm">Marketing</p>
                          <p className="text-xs text-muted-foreground">
                            Meta Pixel, TikTok Pixel, remarketing
                          </p>
                        </div>
                        <Switch
                          checked={marketingEnabled}
                          onCheckedChange={setMarketingEnabled}
                        />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                  {showSettings ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSettings(false)}
                      >
                        Volver
                      </Button>
                      <Button size="sm" onClick={handleSavePreferences}>
                        <Check className="mr-1.5 h-4 w-4" />
                        Guardar preferencias
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSettings(true)}
                      >
                        <Settings2 className="mr-1.5 h-4 w-4" />
                        Configurar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={rejectAll}
                      >
                        <X className="mr-1.5 h-4 w-4" />
                        Solo esenciales
                      </Button>
                      <Button size="sm" onClick={acceptAll}>
                        <Check className="mr-1.5 h-4 w-4" />
                        Aceptar todas
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
