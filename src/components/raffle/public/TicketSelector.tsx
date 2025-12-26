import { useState, useMemo, useCallback, useRef } from "react";
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
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { TicketButton } from "./TicketButton";
import { FloatingCartButton } from "./FloatingCartButton";
import { SlotMachineAnimation } from "./SlotMachineAnimation";
import { LuckyNumbersInput } from "./LuckyNumbersInput";
import { ProbabilityStats } from "./ProbabilityStats";
import { toast } from "sonner";
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
  Heart
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
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [mode, setMode] = useState<'manual' | 'random' | 'search' | 'lucky'>('manual');
  const [page, setPage] = useState(1);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [randomCount, setRandomCount] = useState(1);
  const [searchNumber, setSearchNumber] = useState('');
  const [generatedNumbers, setGeneratedNumbers] = useState<string[]>([]);
  const [regenerateCount, setRegenerateCount] = useState(0);
  const [isSlotSpinning, setIsSlotSpinning] = useState(false);
  const [pendingNumbers, setPendingNumbers] = useState<string[]>([]);
  const pendingNumbersRef = useRef<string[]>([]);

  const pageSize = 100;
  const totalPages = Math.ceil(totalTickets / pageSize);

  const { data, isLoading } = usePublicTickets(raffleId, page, pageSize);
  const randomMutation = useRandomAvailableTickets();
  const checkAvailabilityMutation = useCheckTicketsAvailability();

  // Calculate max digits from total tickets
  const maxDigits = totalTickets.toString().length;

  const tickets = data?.tickets || [];

  // Swipe gestures for mobile pagination
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => setPage(p => Math.min(totalPages, p + 1)),
    onSwipeRight: () => setPage(p => Math.max(1, p - 1)),
    minSwipeDistance: 75
  });

  const filteredTickets = useMemo(() => {
    if (!showOnlyAvailable) return tickets;
    return tickets.filter(t => t.status === 'available');
  }, [tickets, showOnlyAvailable]);

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
      
      // Set pending numbers for the animation to reveal - both state and ref
      pendingNumbersRef.current = numbers;
      setPendingNumbers(numbers);
      
      // The animation will complete and call handleSlotComplete
    } catch (error) {
      setIsSlotSpinning(false);
      setPendingNumbers([]);
      pendingNumbersRef.current = [];
      // Error handled by mutation
    }
  };

  const handleSlotComplete = useCallback(() => {
    setIsSlotSpinning(false);
    // Use ref to avoid stale closure issue
    const numbers = pendingNumbersRef.current;
    if (numbers.length > 0) {
      setGeneratedNumbers(numbers);
      setSelectedTickets(numbers);
      toast.success(`${numbers.length} boletos aleatorios seleccionados`);
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

  const handleSearchTicket = () => {
    const ticket = tickets.find(t => t.ticket_number === searchNumber);
    if (ticket && ticket.status === 'available') {
      if (!selectedTickets.includes(searchNumber)) {
        setSelectedTickets(prev => [...prev, searchNumber]);
        toast.success(`Boleto ${searchNumber} agregado`);
      }
      setSearchNumber('');
    } else if (ticket) {
      toast.error(`El boleto ${searchNumber} no está disponible`);
    } else {
      toast.error(`Boleto ${searchNumber} no encontrado en esta página`);
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
    <div className="space-y-6">
      {/* Probability Stats */}
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
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 border-transparent" 
                        : "hover:border-violet-600 hover:text-violet-600"
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

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Buscar número específico..."
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                  className="pl-12 h-12 text-lg border-2 focus:border-violet-600 rounded-xl"
                />
              </div>
              
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
                  className="border-2 hover:border-violet-600 hover:text-violet-600 h-12"
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
                  className="p-4 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-xl border-2 border-violet-200 dark:border-violet-800"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        key={selectedTickets.length}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center"
                      >
                        <span className="text-white font-bold">{selectedTickets.length}</span>
                      </motion.div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          Boletos seleccionados
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
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
                        className="flex-1 sm:flex-initial bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg"
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

            {/* Premium ticket grid */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
              </div>
            ) : (
              <motion.div 
                className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2"
                {...swipeHandlers}
              >
                <AnimatePresence>
                  {filteredTickets.map((ticket, index) => (
                    <TicketButton
                      key={ticket.id}
                      ticketNumber={ticket.ticket_number}
                      status={ticket.status}
                      isSelected={selectedTickets.includes(ticket.ticket_number)}
                      onClick={() => handleTicketClick(ticket.ticket_number, ticket.status)}
                      disabled={ticket.status !== 'available'}
                      isLastFew={ticket.status === 'available' && filteredTickets.filter(t => t.status === 'available').length <= 10}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="text-sm text-gray-500">
                Página {page} de {totalPages}
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-10 w-10 border-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
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
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600" />
                <span className="text-gray-600">Seleccionado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-yellow-50 border-2 border-yellow-300" />
                <span className="text-gray-600">Reservado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gray-100 border-2 border-gray-200" />
                <span className="text-gray-600">Vendido</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="random" className="space-y-6">
            <Card className="border-2 overflow-hidden">
              <CardContent className="pt-6 space-y-6">
                {/* Slot Machine Animation - shown when spinning or has numbers */}
                <AnimatePresence mode="wait">
                  {(isSlotSpinning || pendingNumbers.length > 0) ? (
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
                      <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Shuffle className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Máquina de la Suerte</h3>
                      <p className="text-gray-600">¡Gira y deja que la suerte elija tus números!</p>
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
                        <Input
                          type="number"
                          min={1}
                          max={maxPerPurchase || 100}
                          value={randomCount}
                          onChange={(e) => setRandomCount(parseInt(e.target.value) || 1)}
                          className="h-12 text-lg border-2 text-center"
                        />
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
                                randomCount === pkg.quantity && "bg-gradient-to-r from-violet-600 to-indigo-600"
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
                        <div className="space-y-4 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl">
                          <p className="font-medium text-center text-gray-900">Tus números de la suerte:</p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {generatedNumbers.map((num, index) => (
                              <motion.div
                                key={num}
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: index * 0.1, type: "spring" }}
                              >
                                <Badge 
                                  className="text-lg px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600"
                                >
                                  {num}
                                </Badge>
                              </motion.div>
                            ))}
                          </div>
                          
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
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Buscar Número</h3>
                  <p className="text-gray-600">¿Tienes un número de la suerte? Búscalo aquí</p>
                </div>

                <div className="flex gap-3">
                  <Input
                    placeholder="Escribe el número que buscas..."
                    value={searchNumber}
                    onChange={(e) => setSearchNumber(e.target.value)}
                    className="h-12 text-lg border-2"
                  />
                  <Button 
                    onClick={handleSearchTicket}
                    size="lg"
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 h-12 px-6"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                </div>

                {searchNumber && (
                  <div>
                    {tickets.find(t => t.ticket_number === searchNumber)?.status === 'available' ? (
                      <div className="p-6 bg-green-50 rounded-xl border-2 border-green-200 text-center">
                        <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
                        <p className="text-lg font-semibold text-green-700">
                          ¡El boleto #{searchNumber} está disponible!
                        </p>
                        <Button
                          onClick={() => setSelectedTickets([searchNumber])}
                          className="mt-4 bg-green-600 hover:bg-green-700"
                        >
                          Seleccionar este boleto
                        </Button>
                      </div>
                    ) : (
                      <div className="p-6 bg-red-50 rounded-xl border-2 border-red-200 text-center">
                        <Ticket className="w-12 h-12 text-red-400 mx-auto mb-3" />
                        <p className="text-lg font-semibold text-red-700">
                          El boleto #{searchNumber} no está disponible
                        </p>
                        <p className="text-sm text-red-600 mt-2">
                          Prueba con otro número o usa la selección aleatoria
                        </p>
                      </div>
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