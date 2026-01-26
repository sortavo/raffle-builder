import { useState, useEffect } from 'react';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useTenant } from '@/contexts/TenantContext';
import { Cookie } from 'lucide-react';

export function CookieNotice() {
  const { hasConsented, isLoaded } = useCookieConsent();
  const { isMultiTenant } = useTenant();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Solo mostrar en dominios personalizados, antes de consentir
    if (isLoaded && !hasConsented && isMultiTenant) {
      setVisible(true);
      // Desaparece después de 4 segundos
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, hasConsented, isMultiTenant]);

  if (!visible) return null;

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 
                 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg 
                 border border-border p-3 z-50
                 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="flex items-start gap-2">
        <Cookie className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          Este sitio usa cookies para mejorar tu experiencia.
          <a href="/privacy" className="underline ml-1 hover:text-foreground transition-colors">
            Más info
          </a>
        </p>
      </div>
    </div>
  );
}
