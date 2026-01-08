import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, Ticket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Purchase {
  id: string;
  buyer_name: string | null;
  buyer_city: string | null;
  ticket_number: string;
}

interface PurchaseToastProps {
  raffleId: string;
}

export function PurchaseToast({ raffleId }: PurchaseToastProps) {
  const [currentPurchase, setCurrentPurchase] = useState<Purchase | null>(null);
  const [queue, setQueue] = useState<Purchase[]>([]);

  // Show queued purchases one at a time
  useEffect(() => {
    if (currentPurchase || queue.length === 0) return;

    const next = queue[0];
    setQueue(prev => prev.slice(1));
    setCurrentPurchase(next);

    const timeout = setTimeout(() => {
      setCurrentPurchase(null);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [currentPurchase, queue]);

  // Subscribe to real-time purchases from orders
  useEffect(() => {
    const channel = supabase
      .channel(`purchase-toast-${raffleId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `raffle_id=eq.${raffleId}`
      }, (payload) => {
        if (payload.new.status === 'sold' && payload.old.status !== 'sold') {
          const purchase: Purchase = {
            id: payload.new.id as string,
            buyer_name: payload.new.buyer_name as string | null,
            buyer_city: payload.new.buyer_city as string | null,
            ticket_number: `${payload.new.ticket_count} boleto${(payload.new.ticket_count as number) !== 1 ? 's' : ''}`,
          };
          setQueue(prev => [...prev, purchase]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raffleId]);

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
    <div className="fixed bottom-4 left-4 z-50 max-w-sm">
      <AnimatePresence mode="wait">
        {currentPurchase && (
          <motion.div
            key={currentPurchase.id}
            initial={{ opacity: 0, x: -100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-white rounded-xl shadow-2xl border border-gray-100 p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {anonymizeName(currentPurchase.buyer_name)}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Ticket className="w-3 h-3" />
                <span>compró #{currentPurchase.ticket_number}</span>
                {currentPurchase.buyer_city && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {currentPurchase.buyer_city}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-400 whitespace-nowrap">
              Ahora
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
