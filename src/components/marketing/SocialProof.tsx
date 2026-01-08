import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ShoppingBag, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Purchase {
  id: string;
  buyer_name: string | null;
  buyer_city: string | null;
  ticket_count: number;
  sold_at: string;
}

interface SocialProofProps {
  raffleId: string;
  className?: string;
  primaryColor?: string;
  isLightTemplate?: boolean;
}

export function SocialProof({ raffleId, className, primaryColor = '#10b981', isLightTemplate = false }: SocialProofProps) {
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      // Query orders instead of sold_tickets
      const { data, error } = await supabase
        .from('orders')
        .select('id, buyer_name, buyer_city, ticket_count, sold_at')
        .eq('raffle_id', raffleId)
        .eq('status', 'sold')
        .not('sold_at', 'is', null)
        .order('sold_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setRecentPurchases(data as Purchase[]);
      }
      setIsLoading(false);
    };

    fetchRecent();

    // Subscribe to new purchases - listen to orders table
    const channel = supabase
      .channel(`purchases-${raffleId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `raffle_id=eq.${raffleId}`
      }, (payload) => {
        if (payload.new.status === 'sold') {
          setRecentPurchases(prev => [{
            id: payload.new.id as string,
            buyer_name: payload.new.buyer_name as string | null,
            buyer_city: payload.new.buyer_city as string | null,
            ticket_count: payload.new.ticket_count as number,
            sold_at: payload.new.sold_at as string
          }, ...prev].slice(0, 10));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raffleId]);

  if (isLoading || recentPurchases.length === 0) return null;

  // Anonymize name for privacy
  const anonymizeName = (name: string | null) => {
    if (!name) return 'Alguien';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1].charAt(0)}.`;
    }
    return parts[0];
  };

  return (
    <div className={className}>
      <h3 className={cn(
        "text-lg font-semibold mb-4 flex items-center gap-2",
        isLightTemplate ? "text-gray-900" : "text-white"
      )}>
        <ShoppingBag className="w-5 h-5" style={{ color: primaryColor }} />
        Compras Recientes
      </h3>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {recentPurchases.slice(0, 5).map((purchase, index) => (
            <motion.div
              key={purchase.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg",
                isLightTemplate ? "bg-gray-100" : "bg-white/5"
              )}
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <User className="w-5 h-5" style={{ color: primaryColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium truncate",
                  isLightTemplate ? "text-gray-900" : "text-white"
                )}>
                  {anonymizeName(purchase.buyer_name)}
                </p>
                <div className={cn(
                  "flex items-center gap-2 text-sm",
                  isLightTemplate ? "text-gray-500" : "text-white/60"
                )}>
                  <span>{purchase.ticket_count} boleto{purchase.ticket_count !== 1 && 's'}</span>
                  {purchase.buyer_city && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {purchase.buyer_city}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className={cn(
                "text-xs whitespace-nowrap",
                isLightTemplate ? "text-gray-400" : "text-white/40"
              )}>
                Hace {formatDistanceToNow(new Date(purchase.sold_at), {
                  locale: es,
                  addSuffix: false
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
