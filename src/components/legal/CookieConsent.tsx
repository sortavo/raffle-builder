import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Cookie, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: number;
}

const COOKIE_CONSENT_KEY = 'sortavo_cookie_consent';
const COOKIE_VERSION = 1;

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    timestamp: '',
    version: COOKIE_VERSION,
  });

  useEffect(() => {
    // Check if consent already given
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Re-prompt if version changed
        if (parsed.version !== COOKIE_VERSION) {
          setIsVisible(true);
        }
      } catch {
        setIsVisible(true);
      }
    } else {
      // First visit
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    const updated = {
      ...prefs,
      timestamp: new Date().toISOString(),
      version: COOKIE_VERSION,
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(updated));
    setIsVisible(false);
    setShowPreferences(false);
  };

  const handleAcceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: '',
      version: COOKIE_VERSION,
    });
  };

  const handleRejectAll = () => {
    savePreferences({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: '',
      version: COOKIE_VERSION,
    });
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg animate-fade-in print:hidden max-w-full overflow-hidden">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <Cookie className="h-8 w-8 text-primary shrink-0 hidden sm:block" />
          
          <div className="flex-1 text-sm text-center sm:text-left">
            <p>
              Usamos cookies para mejorar tu experiencia. Al continuar navegando, 
              aceptas nuestra{' '}
              <Link to="/privacy#cookies" className="text-primary underline">
                Política de Cookies
              </Link>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={handleRejectAll}>
              Rechazar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowPreferences(true)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Personalizar
            </Button>
            <Button size="sm" onClick={handleAcceptAll}>
              Aceptar Todo
            </Button>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preferencias de Cookies</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Essential */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label className="font-medium">Esenciales</Label>
                <p className="text-sm text-muted-foreground">
                  Necesarias para el funcionamiento básico del sitio. No se pueden desactivar.
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label className="font-medium">Analíticas</Label>
                <p className="text-sm text-muted-foreground">
                  Nos ayudan a entender cómo usas el sitio para poder mejorarlo.
                </p>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, analytics: checked }))
                }
              />
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label className="font-medium">Marketing</Label>
                <p className="text-sm text-muted-foreground">
                  Para personalizar contenido y mostrar anuncios relevantes.
                </p>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, marketing: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleAcceptAll}>
              Aceptar Todo
            </Button>
            <Button onClick={handleSavePreferences}>
              Guardar Preferencias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
