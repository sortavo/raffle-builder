import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency-utils";
import { usePublicTickets, useRandomAvailableTickets, useCheckTicketsAvailability } from "@/hooks/usePublicRaffle";
import { supabase } from "@/integrations/supabase/client";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useIsMobile } from "@/hooks/use-mobile";
import { TicketButton } from "./TicketButton";
import { FloatingCartButton } from "./FloatingCartButton";
import { SlotMachineAnimation } from "./SlotMachineAnimation";
import { LuckyNumbersInput } from "./LuckyNumbersInput";
import { ProbabilityStats } from "./ProbabilityStats";
import { VirtualizedTicketGrid } from "./VirtualizedTicketGrid";
import { LargeRaffleNotice, LARGE_RAFFLE_THRESHOLD, MEGA_RAFFLE_THRESHOLD } from "./LargeRaffleNotice";
import { toast } from "sonner";
import { LoadMoreTrigger } from "@/components/ui/LoadMoreTrigger";
import confetti from "canvas-confetti";
import { 
  Loader2, 
  Search, 
  Shuffle, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Sparkles,
  Check,
  ArrowRight,
  Ticket,
  Trash2,
  Heart,
  CornerDownLeft
} from "lucide-react";

interface Package {
  id: string;
  quantity: number;
  price: number;
  discount_percent: number | null;
  label: string | null;
}

interface TicketSelectorProps {
  raffleId: string;
  totalTickets: number;
  ticketPrice: number;
  currencyCode: string;
  maxPerPurchase: number;
  packages: Package[];
  onContinue: (tickets: string[]) => void;
  // Feature toggles
  showRandomPicker?: boolean;
  showLuckyNumbers?: boolean;
  showWinnersHistory?: boolean;
  showProbabilityStats?: boolean;
  ticketsSold?: number;
  ticketsAvailable?: number;
}

export function TicketSelector({
  raffleId,
  totalTickets,
  ticketPrice,
  currencyCode,
  maxPerPurchase,
  packages,
  onContinue,
  showRandomPicker = true,
  showLuckyNumbers = false,
  showWinnersHistory = true,
  showProbabilityStats = true,
  ticketsSold = 0,
  ticketsAvailable = 0,
}: TicketSelectorProps) {
  const isMobile = useIsMobile();
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [mode, setMode] = useState<'manual' | 'random' | 'search' | 'lucky'>('manual');
  const [page, setPage] = useState(1);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [randomCount, setRandomCount] = useState(1);
  // Separate states for Manual tab (local filter) and Search tab (backend search)
  const [manualFilter, setManualFilter] = useState('');
  const [debouncedManual, setDebouncedManual] = useState('');
  const [manualResults, setManualResults] = useState<{ id: string; ticket_number: string; status: string }[]>([]);
  const [hasManualSearched, setHasManualSearched] = useState(false);
  const [isManualSearching, setIsManualSearching] = useState(false);
  const [manualOffset, setManualOffset] = useState(0);
  const [hasMoreManual, setHasMoreManual] = useState(false);
  const [isLoadingMoreManual, setIsLoadingMoreManual] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; ticket_number: string; status: string }[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [generatedNumbers, setGeneratedNumbers] = useState<string[]>([]);
  const [regenerateCount, setRegenerateCount] = useState(0);
  const [isSlotSpinning, setIsSlotSpinning] = useState(false);
  const [pendingNumbers, setPendingNumbers] = useState<string[]>([]);
  const pendingNumbersRef = useRef<string[]>([]);
  const [highlightedTicket, setHighlightedTicket] = useState<string | null>(null);
  const [pendingHighlightTicket, setPendingHighlightTicket] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const ticketRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const pageSize = 100;
  const totalPages = Math.ceil(totalTickets / pageSize);

  // Detect large raffle and limit grid display
  const isLargeRaffle = totalTickets > LARGE_RAFFLE_THRESHOLD;
  const isMegaRaffle = totalTickets > MEGA_RAFFLE_THRESHOLD; // 100K+ hides grid completely
  const maxGridPages = isLargeRaffle ? Math.ceil(100000 / pageSize) : totalPages; // Limit grid to 100K tickets max
  const effectiveTotalPages = Math.min(totalPages, maxGridPages);

  const { data, isLoading } = usePublicTickets(raffleId, page, pageSize);
  const randomMutation = useRandomAvailableTickets();
  const checkAvailabilityMutation = useCheckTicketsAvailability();
  const [isSearching, setIsSearching] = useState(false);

  // Debounce for Manual tab
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedManual(manualFilter);
    }, 400);
    return () => clearTimeout(timer);
  }, [manualFilter]);

  // Debounce search input - only for Search tab
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Auto-search when manual debounced value changes - only when in manual mode
  useEffect(() => {
    if (mode !== 'manual') return;

    const performManualSearch = async () => {
      if (debouncedManual.trim().length > 0) {
        setIsManualSearching(true);
        setManualOffset(0);
        try {
          // Use secure RPC function that only returns public fields
          const { data, error } = await supabase.rpc('search_public_tickets', {
            p_raffle_id: raffleId,
            p_search: debouncedManual.trim(),
            p_limit: 100,
          });

          if (!error && data) {
            setManualResults(data);
            setHasManualSearched(true);
            setHasMoreManual(data.length === 100);
          }
        } catch {
          // Error handled silently for auto-search
        } finally {
          setIsManualSearching(false);
        }
      } else {
        setManualResults([]);
        setHasManualSearched(false);
        setHasMoreManual(false);
      }
    };

    performManualSearch();
  }, [debouncedManual, raffleId, mode]);

  // Load more manual results
  const handleLoadMoreManual = useCallback(async () => {
    if (isLoadingMoreManual || !hasMoreManual || !debouncedManual.trim()) return;
    
    setIsLoadingMoreManual(true);
    const newOffset = manualOffset + 100;
    
    try {
      // Note: For simplicity, we fetch from beginning with higher limit
      // The RPC function doesn't support offset directly
      const { data, error } = await supabase.rpc('search_public_tickets', {
        p_raffle_id: raffleId,
        p_search: debouncedManual.trim(),
        p_limit: newOffset + 100,
      });

      if (!error && data) {
        // Only add tickets we haven't seen before
        const newTickets = data.slice(manualOffset);
        setManualResults(prev => [...prev, ...newTickets]);
        setManualOffset(newOffset);
        setHasMoreManual(newTickets.length === 100);
      }
    } catch {
      // Error handled silently
    } finally {
      setIsLoadingMoreManual(false);
    }
  }, [isLoadingMoreManual, hasMoreManual, debouncedManual, manualOffset, raffleId]);

  // Auto-search when debounced value changes - only when in search mode
  useEffect(() => {
    // Only run backend search when in search mode
    if (mode !== 'search') return;

    const performSearch = async () => {
      if (debouncedSearch.trim().length > 0) {
        setIsSearching(true);
        try {
          // Use secure RPC function that only returns public fields
          const { data, error } = await supabase.rpc('search_public_tickets', {
            p_raffle_id: raffleId,
            p_search: debouncedSearch.trim(),
            p_limit: 100,
          });

          if (!error && data) {
            setSearchResults(data);
            setHasSearched(true);
          }
        } catch {
          // Error handled silently for auto-search
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setHasSearched(false);
      }
    };

    performSearch();
  }, [debouncedSearch, raffleId, mode]);

  // Calculate max digits from total tickets
  const maxDigits = totalTickets.toString().length;

  const tickets = data?.tickets || [];

  // Swipe gestures for mobile pagination
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => setPage(p => Math.min(effectiveTotalPages, p + 1)),
    onSwipeRight: () => setPage(p => Math.max(1, p - 1)),
    minSwipeDistance: 75
  });

  const filteredTickets = useMemo(() => {
    if (!showOnlyAvailable) return tickets;
    return tickets.filter(t => t.status === 'available');
  }, [tickets, showOnlyAvailable]);

  // Effect to handle pending highlight after page change
  useEffect(() => {
    if (pendingHighlightTicket && tickets.length > 0) {
      const ticketExists = tickets.some(t => t.ticket_number === pendingHighlightTicket);
      if (ticketExists) {
        setHighlightedTicket(pendingHighlightTicket);
        setPendingHighlightTicket(null);
        
        // Scroll to the highlighted ticket after a short delay for DOM to update
        setTimeout(() => {
          const ticketElement = ticketRefs.current.get(pendingHighlightTicket);
          if (ticketElement) {
            ticketElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        // Remove highlight after 4 seconds
        setTimeout(() => setHighlightedTicket(null), 4000);
      }
    }
  }, [pendingHighlightTicket, tickets]);

  const handleTicketClick = useCallback((ticketNumber: string, status: string) => {
    if (status !== 'available') return;

    setSelectedTickets(prev => {
      if (prev.includes(ticketNumber)) {
        toast.info(`Boleto ${ticketNumber} removido`);
        return prev.filter(t => t !== ticketNumber);
      }
      if (maxPerPurchase > 0 && prev.length >= maxPerPurchase) {
        toast.warning(`Máximo ${maxPerPurchase} boletos por compra`);
        return prev;
      }
      toast.success(`Boleto ${ticketNumber} seleccionado`, { duration: 1500 });
      return [...prev, ticketNumber];
    });
  }, [maxPerPurchase]);

  const handleClearSelection = useCallback(() => {
    setSelectedTickets([]);
    setGeneratedNumbers([]);
    toast.info('Selección limpiada');
  }, []);

  const handleRandomGenerate = async () => {
    try {
      // Start spinning animation
      setIsSlotSpinning(true);
      setPendingNumbers([]);
      pendingNumbersRef.current = [];
      
      const numbers = await randomMutation.mutateAsync({
        raffleId,
        count: randomCount,
      });
      
      // Warn user if fewer tickets were returned than requested
      if (numbers.length < randomCount && numbers.length > 0) {
        toast.warning(
          `Solo se encontraron ${numbers.length} boletos disponibles de los ${randomCount} solicitados`,
          { duration: 4000 }
        );
      }
      
      // Set pending numbers for the animation to reveal - both state and ref
      pendingNumbersRef.current = numbers;
      setPendingNumbers(numbers);
      
      // The animation will complete and call handleSlotComplete
    } catch (error) {
      setIsSlotSpinning(false);
      setPendingNumbers([]);
      pendingNumbersRef.current = [];
      toast.error('Error al generar boletos aleatorios');
    }
  };

  const handleSlotComplete = useCallback(() => {
    setIsSlotSpinning(false);
    // Use ref to avoid stale closure issue
    const numbers = pendingNumbersRef.current;
    if (numbers.length > 0) {
      setGeneratedNumbers(numbers);
      setSelectedTickets(numbers);
      
      // Trigger confetti for large batches (>100 tickets)
      if (numbers.length > 100) {
        // Fire confetti from both sides
        const fireConfetti = () => {
          // Left side
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { x: 0.1, y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#4169E1'],
          });
          // Right side
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { x: 0.9, y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#4169E1'],
          });
        };
        
        // Fire twice for more impact
        fireConfetti();
        setTimeout(fireConfetti, 300);
        
        toast.success(`🎉 ¡Increíble! ${numbers.length.toLocaleString()} boletos seleccionados`, {
          description: '¡Buena suerte en el sorteo!',
          duration: 5000,
        });
      } else {
        toast.success(`${numbers.length} boletos aleatorios seleccionados`);
      }
    }
  }, []);

  const handleRegenerate = async () => {
    if (regenerateCount >= 3) {
      toast.warning('Máximo 3 regeneraciones permitidas');
      return;
    }
    setRegenerateCount(prev => prev + 1);
    await handleRandomGenerate();
  };

  const handleLuckyNumbersSelect = useCallback((numbers: string[]) => {
    setSelectedTickets(numbers);
    toast.success(`${numbers.length} número${numbers.length !== 1 ? 's' : ''} de la suerte seleccionado${numbers.length !== 1 ? 's' : ''}`);
  }, []);

  const checkTicketsAvailability = useCallback(async (numbers: string[]): Promise<string[]> => {
    return checkAvailabilityMutation.mutateAsync({ raffleId, ticketNumbers: numbers });
  }, [raffleId, checkAvailabilityMutation]);

  // Navigate to a specific ticket
  const handleGoToTicket = async () => {
    if (!manualFilter.trim()) return;
    
    setIsNavigating(true);
    try {
      // Pad the ticket number to match format
      const ticketNum = manualFilter.padStart(maxDigits, '0');
      
      // Verify the ticket exists using secure RPC
      const { data, error } = await supabase.rpc('search_public_tickets', {
        p_raffle_id: raffleId,
        p_search: ticketNum,
        p_limit: 1,
      });
      
      const ticket = data?.[0];
      
      if (error || !ticket || ticket.ticket_number !== ticketNum) {
        toast.error(`Boleto ${ticketNum} no encontrado`);
        return;
      }
      
      // Calculate page where ticket is located (ticket numbers are 1-indexed)
      const ticketIndex = parseInt(ticketNum, 10);
      const targetPage = Math.ceil(ticketIndex / pageSize);
      
      // Clear input first
      setManualFilter('');
      
      // Set pending highlight (will be applied once tickets load)
      setPendingHighlightTicket(ticketNum);
      
      // Navigate to that page
      setPage(targetPage);
      
      toast.success(`Navegando al boleto ${ticketNum}`, {
        description: ticket.status === 'available' ? 'Disponible' : 
                     ticket.status === 'sold' ? 'Vendido' : 
                     ticket.status === 'reserved' ? 'Reservado' : 'No disponible'
      });
    } catch {
      toast.error('Error al buscar el boleto');
    } finally {
      setIsNavigating(false);
    }
  };

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && manualFilter.trim()) {
      e.preventDefault();
      handleGoToTicket();
    }
  };

  const handleSearchTicket = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      // Use secure RPC function that only returns public fields
      const { data, error } = await supabase.rpc('search_public_tickets', {
        p_raffle_id: raffleId,
        p_search: searchTerm.trim(),
        p_limit: 100,
      });

      if (!error && data) {
        setSearchResults(data);
        setHasSearched(true);
      }
    } catch {
      // Error handled silently
    }
  };

  const handleSelectSearchResult = (ticketNumber: string, status: string) => {
    if (status !== 'available') return;
    
    setSelectedTickets(prev => {
      if (prev.includes(ticketNumber)) {
        toast.info(`Boleto ${ticketNumber} removido`);
        return prev.filter(t => t !== ticketNumber);
      }
      if (maxPerPurchase > 0 && prev.length >= maxPerPurchase) {
        toast.warning(`Máximo ${maxPerPurchase} boletos por compra`);
        return prev;
      }
      toast.success(`Boleto ${ticketNumber} seleccionado`);
      return [...prev, ticketNumber];
    });
  };

  const handleSelectAllAvailableResults = () => {
    const availableResults = searchResults
      .filter(t => t.status === 'available')
      .map(t => t.ticket_number);
    
    if (availableResults.length === 0) {
      toast.info('No hay boletos disponibles en los resultados');
      return;
    }

    const newTickets = availableResults.filter(t => !selectedTickets.includes(t));
    
    if (maxPerPurchase > 0 && selectedTickets.length + newTickets.length > maxPerPurchase) {
      const canAdd = maxPerPurchase - selectedTickets.length;
      if (canAdd <= 0) {
        toast.warning(`Ya alcanzaste el máximo de ${maxPerPurchase} boletos`);
        return;
      }
      setSelectedTickets(prev => [...prev, ...newTickets.slice(0, canAdd)]);
      toast.success(`Se agregaron ${canAdd} boletos (límite alcanzado)`);
    } else {
      setSelectedTickets(prev => [...prev, ...newTickets]);
      toast.success(`${newTickets.length} boletos agregados`);
    }
  };

  const calculateTotal = () => {
    const matchingPackage = packages.find(p => p.quantity === selectedTickets.length);
    if (matchingPackage) {
      return matchingPackage.price;
    }
    return selectedTickets.length * ticketPrice;
  };

  const bestPackage = packages.reduce((best, pkg) => {
    if (!best || (pkg.discount_percent || 0) > (best.discount_percent || 0)) {
      return pkg;
    }
    return best;
  }, packages[0]);

  // Calculate visible tabs
  const visibleTabs = useMemo(() => {
    const tabs = [{ id: 'manual', label: 'Manual', shortLabel: 'Manual' }];
    if (showRandomPicker) tabs.push({ id: 'random', label: 'Al Azar', shortLabel: 'Azar' });
    if (showLuckyNumbers) tabs.push({ id: 'lucky', label: 'Mis Números', shortLabel: 'Suerte' });
    tabs.push({ id: 'search', label: 'Buscar', shortLabel: 'Buscar' });
    return tabs;
  }, [showRandomPicker, showLuckyNumbers]);

  return (
    <div className="space-y-6 pb-40 sm:pb-48">
      {/* Add bottom padding to prevent FloatingCartButton overlap */}
      {showProbabilityStats && (
        <ProbabilityStats
          totalTickets={totalTickets}
          ticketsSold={ticketsSold}
          ticketsAvailable={ticketsAvailable || totalTickets - ticketsSold}
          ticketPrice={ticketPrice}
          currencyCode={currencyCode}
          selectedCount={selectedTickets.length}
        />
      )}

      {/* Premium container */}
      <div className="bg-white rounded-3xl border-2 border-gray-200 p-6 lg:p-8 shadow-xl">
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList className={cn(
            "grid w-full mb-8 bg-gray-100 p-1 rounded-xl",
            visibleTabs.length === 2 && "grid-cols-2",
            visibleTabs.length === 3 && "grid-cols-3",
            visibleTabs.length === 4 && "grid-cols-4"
          )}>
            <TabsTrigger value="manual" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">
              Manual
            </TabsTrigger>
            {showRandomPicker && (
              <TabsTrigger value="random" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">
                Al Azar
              </TabsTrigger>
            )}
            {showLuckyNumbers && (
              <TabsTrigger value="lucky" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm flex items-center gap-1">
                <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-pink-500" />
                <span className="hidden sm:inline">Mis Números</span>
                <span className="sm:hidden">Suerte</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="search" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">
              Buscar
            </TabsTrigger>
          </TabsList>

          {/* Large raffle notice - shown only once at the top */}
          {isLargeRaffle && mode === 'manual' && (
            <div className="mb-6">
              <LargeRaffleNotice
                totalTickets={totalTickets}
                onUseSearch={() => setMode('search')}
                onUseRandom={() => setMode('random')}
              />
            </div>
          )}

          <TabsContent value="manual" className="space-y-6">
            {/* Packages quick select */}
            {packages.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {packages.map(pkg => (
                  <Button
                    key={pkg.id}
                    variant={selectedTickets.length === pkg.quantity ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setRandomCount(pkg.quantity)}
                    className={cn(
                    "relative border-2 transition-all",
                      selectedTickets.length === pkg.quantity 
                        ? "bg-gradient-to-r from-primary to-accent border-transparent" 
                        : "hover:border-primary hover:text-primary"
                    )}
                  >
                    {pkg.quantity} boletos - {formatCurrency(pkg.price, currencyCode)}
                    {pkg.discount_percent && pkg.discount_percent > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700">
                        -{pkg.discount_percent}%
                      </Badge>
                    )}
                    {pkg.id === bestPackage?.id && (
                      <Badge className="absolute -top-2 -right-2 text-[10px] bg-orange-500">
                        Mejor Valor
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            )}

            {/* Go to ticket input - with live search matching Search tab */}
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Buscar boleto... (ej: 7 para ver 7, 17, 27...)"
                    value={manualFilter}
                    onChange={(e) => setManualFilter(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={handleManualKeyDown}
                    className="h-12 text-lg border-2 pr-12"
                  />
                  {isManualSearching ? (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : manualFilter ? (
                    <button
                      type="button"
                      onClick={() => setManualFilter('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
                <Button
                  onClick={handleGoToTicket}
                  disabled={!manualFilter.trim() || isNavigating}
                  className="h-12 px-4 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                >
                  {isNavigating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CornerDownLeft className="w-5 h-5 mr-1" />
                      Ir
                    </>
                  )}
                </Button>
              </div>

              {/* Live search results - matching Search tab behavior */}
              {hasManualSearched && (
                <div className="space-y-4">
                  {manualResults.length === 0 ? (
                    <div className="p-4 bg-muted rounded-xl text-center">
                      <Ticket className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium text-muted-foreground">
                        No se encontraron boletos con "{manualFilter}"
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Results summary */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-muted/50 rounded-xl">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                          <span className="font-medium">
                            {manualResults.length} encontrados
                          </span>
                          <span className="text-green-600">
                            ✓ {manualResults.filter(t => t.status === 'available').length} disponibles
                          </span>
                        </div>
                        {manualResults.some(t => t.status === 'available') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const availableResults = manualResults
                                .filter(t => t.status === 'available')
                                .map(t => t.ticket_number);
                              
                              if (availableResults.length === 0) return;

                              const newTickets = availableResults.filter(t => !selectedTickets.includes(t));
                              
                              if (maxPerPurchase > 0 && selectedTickets.length + newTickets.length > maxPerPurchase) {
                                const canAdd = maxPerPurchase - selectedTickets.length;
                                if (canAdd <= 0) {
                                  toast.warning(`Ya alcanzaste el máximo de ${maxPerPurchase} boletos`);
                                  return;
                                }
                                setSelectedTickets(prev => [...prev, ...newTickets.slice(0, canAdd)]);
                                toast.success(`Se agregaron ${canAdd} boletos (límite alcanzado)`);
                              } else {
                                setSelectedTickets(prev => [...prev, ...newTickets]);
                                toast.success(`${newTickets.length} boletos agregados`);
                              }
                            }}
                            className="text-xs w-full sm:w-auto sm:ml-auto"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Seleccionar
                          </Button>
                        )}
                      </div>

                      {/* Results grid - virtualized for large lists (>300 items) */}
                      {manualResults.length > 300 ? (
                        <VirtualizedTicketGrid
                          tickets={manualResults}
                          selectedTickets={selectedTickets}
                          onTicketClick={handleSelectSearchResult}
                          columnCount={isMobile ? 5 : 10}
                          height={300}
                          width={isMobile ? 260 : 520}
                        />
                      ) : (
                        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[300px] overflow-y-auto p-1">
                          {manualResults.map((ticket) => {
                            const isAvailable = ticket.status === 'available';
                            const isSelected = selectedTickets.includes(ticket.ticket_number);
                            
                            return (
                              <motion.button
                                key={ticket.id}
                                whileHover={isAvailable ? { scale: 1.05 } : {}}
                                whileTap={isAvailable ? { scale: 0.95 } : {}}
                                onClick={() => handleSelectSearchResult(ticket.ticket_number, ticket.status)}
                                disabled={!isAvailable}
                                className={cn(
                                  "relative p-2 rounded-lg text-xs font-mono font-bold transition-all border-2",
                                  isAvailable && !isSelected && "bg-green-50 border-green-300 text-green-700 hover:bg-green-100 cursor-pointer",
                                  isAvailable && isSelected && "bg-green-500 border-green-600 text-white ring-2 ring-green-400 ring-offset-1",
                                  !isAvailable && "bg-muted border-muted text-muted-foreground cursor-not-allowed opacity-60"
                                )}
                              >
                                {ticket.ticket_number}
                                {isSelected && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-green-600" />
                                  </span>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Infinite scroll trigger */}
                      {hasMoreManual && (
                        <LoadMoreTrigger
                          onLoadMore={handleLoadMoreManual}
                          remaining={hasMoreManual ? 100 : 0}
                          enabled={hasMoreManual && !isLoadingMoreManual}
                        />
                      )}

                      <p className="text-xs text-muted-foreground text-center">
                        {manualResults.length} boleto{manualResults.length !== 1 ? 's' : ''} cargados
                        {hasMoreManual && ' • Desplaza para ver más'}
                        {manualResults.length > 300 && ' • Vista optimizada'}
                      </p>
                    </>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-available"
                    checked={showOnlyAvailable}
                    onCheckedChange={setShowOnlyAvailable}
                  />
                  <Label htmlFor="show-available" className="text-sm">Solo disponibles</Label>
                </div>
                
                <Button 
                  variant="outline"
                  className="border-2 hover:border-primary hover:text-primary h-12"
                  onClick={handleRandomGenerate}
                  disabled={randomMutation.isPending}
                >
                  <Shuffle className="w-5 h-5 mr-2" />
                  Aleatorio
                </Button>
              </div>
            </div>

            {/* Selected tickets banner - improved with clear button */}
            <AnimatePresence>
              {selectedTickets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 rounded-xl border-2 border-primary/20 dark:border-primary/30"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        key={selectedTickets.length}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center"
                      >
                        <span className="text-white font-bold">{selectedTickets.length}</span>
                      </motion.div>
                      <div>
                        <p className="font-semibold text-foreground">
                          Boletos seleccionados
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedTickets.slice(0, 5).join(', ')}
                          {selectedTickets.length > 5 && ` +${selectedTickets.length - 5} más`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSelection}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Limpiar
                      </Button>
                      <Button
                        size="lg"
                        className="flex-1 sm:flex-initial bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg"
                        onClick={() => onContinue(selectedTickets)}
                      >
                        {formatCurrency(calculateTotal(), currencyCode)}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Premium ticket grid with swipe gestures */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <div
                onTouchStart={swipeHandlers.onTouchStart}
                onTouchMove={swipeHandlers.onTouchMove}
                onTouchEnd={swipeHandlers.onTouchEnd}
                className="relative touch-pan-y"
              >
                <motion.div 
                  key={page}
                  initial={{ opacity: 0.8, x: 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2"
                >
                  <AnimatePresence>
                    {filteredTickets.map((ticket) => (
                      <TicketButton
                        key={ticket.id}
                        ticketNumber={ticket.ticket_number}
                        status={ticket.status}
                        isSelected={selectedTickets.includes(ticket.ticket_number)}
                        onClick={() => handleTicketClick(ticket.ticket_number, ticket.status)}
                        disabled={ticket.status !== 'available'}
                        isLastFew={ticket.status === 'available' && filteredTickets.filter(t => t.status === 'available').length <= 10}
                        isHighlighted={highlightedTicket === ticket.ticket_number}
                        ref={(el) => {
                          if (el) ticketRefs.current.set(ticket.ticket_number, el);
                          else ticketRefs.current.delete(ticket.ticket_number);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
                
                {/* Mobile swipe hint */}
                {isMobile && effectiveTotalPages > 1 && (
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    ← Desliza para cambiar de página →
                  </p>
                )}
              </div>
            )}

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="text-sm text-gray-500">
                Página {page} de {effectiveTotalPages}
                {isLargeRaffle && effectiveTotalPages < totalPages && (
                  <span className="text-amber-600 ml-2">
                    (usa búsqueda para ver más)
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="h-10 w-10 border-2"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-10 w-10 border-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <select
                  value={page}
                  onChange={(e) => setPage(Number(e.target.value))}
                  className="h-10 px-3 rounded-lg border-2 border-gray-200 bg-white text-sm min-w-[70px]"
                >
                  {Array.from({ length: effectiveTotalPages }, (_, i) => i + 1).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.min(effectiveTotalPages, p + 1))}
                  disabled={page === effectiveTotalPages}
                  className="h-10 w-10 border-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(effectiveTotalPages)}
                  disabled={page === effectiveTotalPages}
                  className="h-10 w-10 border-2"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-6 text-sm justify-center pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white border-2 border-gray-300" />
                <span className="text-gray-600">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-accent" />
                <span className="text-muted-foreground">Seleccionado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-warning/20 border-2 border-warning/50" />
                <span className="text-muted-foreground">Reservado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-muted border-2 border-border" />
                <span className="text-muted-foreground">Vendido</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="random" className="space-y-6">
            <Card className="border-2 overflow-hidden">
              <CardContent className="pt-6 space-y-6">
                {/* Slot Machine Animation - shown when spinning or has numbers */}
                <AnimatePresence mode="wait">
                  {/* Loading state - shown when fetching from server */}
                  {randomMutation.isPending && !isSlotSpinning && pendingNumbers.length === 0 ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="py-8 space-y-6"
                    >
                      <div className="text-center">
                        <motion.div 
                          className="w-20 h-20 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30"
                          animate={{ 
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.05, 1]
                          }}
                          transition={{ 
                            duration: 0.8, 
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <Sparkles className="w-10 h-10 text-amber-950" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          Generando {randomCount.toLocaleString()} boletos...
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          La suerte está trabajando para ti
                        </p>
                      </div>
                      
                      {/* Animated progress bar */}
                      <div className="max-w-xs mx-auto space-y-2">
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ 
                              width: ["0%", "30%", "60%", "85%", "95%"],
                            }}
                            transition={{ 
                              duration: randomCount > 1000 ? 4 : 2,
                              ease: "easeOut",
                              times: [0, 0.2, 0.5, 0.8, 1]
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Seleccionando...</span>
                          <motion.span
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            {randomCount > 100 ? 'Procesando en servidor' : 'Casi listo'}
                          </motion.span>
                        </div>
                      </div>
                      
                      {/* Floating numbers animation */}
                      <div className="flex justify-center gap-2">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <motion.div
                            key={i}
                            className="w-10 h-10 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center font-mono font-bold text-primary"
                            animate={{
                              y: [0, -8, 0],
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.15,
                            }}
                          >
                            ?
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (isSlotSpinning || pendingNumbers.length > 0) ? (
                    <motion.div
                      key="slot-machine"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex justify-center py-4"
                    >
                      <SlotMachineAnimation
                        numbers={pendingNumbers}
                        isSpinning={isSlotSpinning}
                        onComplete={handleSlotComplete}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="intro"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-center"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Shuffle className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-2">Máquina de la Suerte</h3>
                      <p className="text-muted-foreground">¡Gira y deja que la suerte elija tus números!</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Controls - hide when spinning */}
                <AnimatePresence>
                  {!isSlotSpinning && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-6"
                    >
                      <div className="space-y-3">
                        <Label className="text-base">¿Cuántos boletos quieres?</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={10000}
                            value={randomCount}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 1;
                              setRandomCount(Math.min(10000, Math.max(1, value)));
                            }}
                            className="h-12 text-lg border-2 text-center flex-1"
                          />
                          {randomCount > 100 && (
                            <Badge variant="outline" className="h-12 px-3 flex items-center border-amber-500 text-amber-600">
                              Lote grande
                            </Badge>
                          )}
                        </div>
                        {randomCount > 100 && (
                          <p className="text-xs text-amber-600 text-center">
                            Para {randomCount.toLocaleString()} boletos, la generación puede tomar unos segundos
                          </p>
                        )}
                      </div>

                      {/* Package quick select */}
                      {packages.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center">
                          {packages.map(pkg => (
                            <Button
                              key={pkg.id}
                              variant={randomCount === pkg.quantity ? 'default' : 'outline'}
                              size="lg"
                              onClick={() => setRandomCount(pkg.quantity)}
                              className={cn(
                                "border-2",
                                randomCount === pkg.quantity && "bg-gradient-to-r from-primary to-accent"
                              )}
                            >
                              {pkg.label || `${pkg.quantity} boletos`}
                              {pkg.discount_percent && pkg.discount_percent > 0 && (
                                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                                  -{pkg.discount_percent}%
                                </Badge>
                              )}
                            </Button>
                          ))}
                        </div>
                      )}

                      <Button
                        onClick={handleRandomGenerate}
                        disabled={randomMutation.isPending || isSlotSpinning}
                        size="lg"
                        className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 h-14 text-lg text-amber-950 font-bold shadow-lg shadow-amber-500/30"
                      >
                        <Sparkles className="h-5 w-5 mr-2" />
                        ¡GIRAR LA MÁQUINA!
                      </Button>

                      {generatedNumbers.length > 0 && !isSlotSpinning && (
                        <div className="space-y-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl">
                          <p className="font-medium text-center text-foreground">
                            Tus {generatedNumbers.length.toLocaleString()} números de la suerte:
                          </p>
                          
                          {/* For many numbers, show summary instead of all badges */}
                          {generatedNumbers.length > 20 ? (
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2 justify-center">
                                {generatedNumbers.slice(0, 10).map((num) => (
                                  <Badge 
                                    key={num}
                                    className="text-sm px-3 py-1 bg-gradient-to-r from-primary to-accent"
                                  >
                                    {num}
                                  </Badge>
                                ))}
                                <Badge variant="outline" className="text-sm px-3 py-1">
                                  +{(generatedNumbers.length - 10).toLocaleString()} más
                                </Badge>
                              </div>
                              <p className="text-xs text-center text-muted-foreground">
                                Rango: {generatedNumbers[0]} - {generatedNumbers[generatedNumbers.length - 1]}
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2 justify-center">
                              {generatedNumbers.map((num, index) => (
                                <motion.div
                                  key={num}
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ delay: Math.min(index * 0.1, 1), type: "spring" }}
                                >
                                  <Badge 
                                    className="text-lg px-4 py-2 bg-gradient-to-r from-primary to-accent"
                                  >
                                    {num}
                                  </Badge>
                                </motion.div>
                              ))}
                            </div>
                          )}
                          
                          {regenerateCount < 3 && (
                            <Button
                              variant="outline"
                              onClick={handleRegenerate}
                              disabled={randomMutation.isPending || isSlotSpinning}
                              className="w-full border-2"
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              Regenerar ({3 - regenerateCount} intentos restantes)
                            </Button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </TabsContent>

          {showLuckyNumbers && (
            <TabsContent value="lucky" className="space-y-6">
              <LuckyNumbersInput
                maxDigits={maxDigits}
                onNumbersGenerated={handleLuckyNumbersSelect}
                checkAvailability={checkTicketsAvailability}
                isLoading={checkAvailabilityMutation.isPending}
                showWinnersHistory={showWinnersHistory}
              />
            </TabsContent>
          )}

          <TabsContent value="search" className="space-y-6">
            <Card className="border-2">
              <CardContent className="pt-6 space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Buscar Número</h3>
                  <p className="text-muted-foreground">Busca todos los boletos que contengan ciertos dígitos</p>
                </div>

                <div className="relative">
                  <Input
                    placeholder="Ej: 7 para ver 7, 17, 27, 70, 77..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value.replace(/[^0-9]/g, ''))}
                    className="h-12 text-lg border-2 pr-12"
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                {hasSearched && (
                  <div className="space-y-4">
                    {searchResults.length === 0 ? (
                      <div className="p-6 bg-muted rounded-xl text-center">
                        <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-lg font-semibold text-muted-foreground">
                          No se encontraron boletos con "{searchTerm}"
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Prueba con otro número
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Results summary */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-xl">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                            <span className="font-medium">
                              {searchResults.length} encontrados
                            </span>
                            <span className="text-green-600">
                              ✓ {searchResults.filter(t => t.status === 'available').length} disponibles
                            </span>
                            <span className="text-muted-foreground hidden sm:inline">
                              • {searchResults.filter(t => t.status !== 'available').length} no disponibles
                            </span>
                          </div>
                          {searchResults.some(t => t.status === 'available') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSelectAllAvailableResults}
                              className="text-xs w-full sm:w-auto sm:ml-auto"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              <span className="sm:hidden">Seleccionar</span>
                              <span className="hidden sm:inline">Seleccionar disponibles</span>
                            </Button>
                          )}
                        </div>

                        {/* Results grid */}
                        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[300px] overflow-y-auto p-1">
                          {searchResults.map((ticket) => {
                            const isAvailable = ticket.status === 'available';
                            const isSelected = selectedTickets.includes(ticket.ticket_number);
                            
                            return (
                              <motion.button
                                key={ticket.id}
                                whileHover={isAvailable ? { scale: 1.05 } : {}}
                                whileTap={isAvailable ? { scale: 0.95 } : {}}
                                onClick={() => handleSelectSearchResult(ticket.ticket_number, ticket.status)}
                                disabled={!isAvailable}
                                className={cn(
                                  "relative p-2 rounded-lg text-xs font-mono font-bold transition-all border-2",
                                  isAvailable && !isSelected && "bg-success/10 border-success/50 text-success hover:bg-success/20 cursor-pointer",
                                  isAvailable && isSelected && "bg-success border-success text-white ring-2 ring-success/50 ring-offset-1",
                                  !isAvailable && "bg-muted border-muted text-muted-foreground cursor-not-allowed opacity-60"
                                )}
                              >
                                {ticket.ticket_number}
                                {isSelected && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-success" />
                                  </span>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>

                        {searchResults.length >= 100 && (
                          <p className="text-xs text-muted-foreground text-center">
                            Mostrando los primeros 100 resultados. Refina tu búsqueda para ver más.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Cart Button */}
      <FloatingCartButton
        selectedCount={selectedTickets.length}
        total={calculateTotal()}
        currency={currencyCode}
        selectedTickets={selectedTickets}
        onContinue={() => onContinue(selectedTickets)}
        onClear={handleClearSelection}
      />
    </div>
  );
}