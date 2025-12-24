import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency-utils";
import { usePublicTickets, useRandomAvailableTickets } from "@/hooks/usePublicRaffle";
import { Loader2, Search, Shuffle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Sparkles } from "lucide-react";

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
}

export function TicketSelector({
  raffleId,
  totalTickets,
  ticketPrice,
  currencyCode,
  maxPerPurchase,
  packages,
  onContinue,
}: TicketSelectorProps) {
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [mode, setMode] = useState<'manual' | 'random' | 'search'>('manual');
  const [page, setPage] = useState(1);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [randomCount, setRandomCount] = useState(1);
  const [searchNumber, setSearchNumber] = useState('');
  const [generatedNumbers, setGeneratedNumbers] = useState<string[]>([]);
  const [regenerateCount, setRegenerateCount] = useState(0);

  const pageSize = 100;
  const totalPages = Math.ceil(totalTickets / pageSize);

  const { data, isLoading } = usePublicTickets(raffleId, page, pageSize);
  const randomMutation = useRandomAvailableTickets();

  const tickets = data?.tickets || [];

  const filteredTickets = useMemo(() => {
    if (!showOnlyAvailable) return tickets;
    return tickets.filter(t => t.status === 'available');
  }, [tickets, showOnlyAvailable]);

  const handleTicketClick = (ticketNumber: string, status: string) => {
    if (status !== 'available') return;

    setSelectedTickets(prev => {
      if (prev.includes(ticketNumber)) {
        return prev.filter(t => t !== ticketNumber);
      }
      if (maxPerPurchase > 0 && prev.length >= maxPerPurchase) {
        return prev;
      }
      return [...prev, ticketNumber];
    });
  };

  const handleRandomGenerate = async () => {
    try {
      const numbers = await randomMutation.mutateAsync({
        raffleId,
        count: randomCount,
      });
      setGeneratedNumbers(numbers);
      setSelectedTickets(numbers);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRegenerate = async () => {
    if (regenerateCount >= 3) return;
    setRegenerateCount(prev => prev + 1);
    await handleRandomGenerate();
  };

  const handleSearchTicket = () => {
    const ticket = tickets.find(t => t.ticket_number === searchNumber);
    if (ticket && ticket.status === 'available') {
      setSelectedTickets([searchNumber]);
    }
  };

  const calculateTotal = () => {
    // Check if there's a matching package
    const matchingPackage = packages.find(p => p.quantity === selectedTickets.length);
    if (matchingPackage) {
      return matchingPackage.price;
    }
    return selectedTickets.length * ticketPrice;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer';
      case 'reserved':
        return 'bg-amber-400 text-amber-900 cursor-not-allowed';
      case 'sold':
        return 'bg-muted text-muted-foreground cursor-not-allowed';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const bestPackage = packages.reduce((best, pkg) => {
    if (!best || (pkg.discount_percent || 0) > (best.discount_percent || 0)) {
      return pkg;
    }
    return best;
  }, packages[0]);

  return (
    <div className="space-y-6">
      <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual">Selección Manual</TabsTrigger>
          <TabsTrigger value="random">Al Azar</TabsTrigger>
          <TabsTrigger value="search">Buscar Número</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          {/* Packages quick select */}
          {packages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {packages.map(pkg => (
                <Button
                  key={pkg.id}
                  variant={selectedTickets.length === pkg.quantity ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRandomCount(pkg.quantity)}
                  className="relative"
                >
                  {pkg.quantity} boletos - {formatCurrency(pkg.price, currencyCode)}
                  {pkg.discount_percent && pkg.discount_percent > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      -{pkg.discount_percent}%
                    </Badge>
                  )}
                  {pkg.id === bestPackage?.id && (
                    <Badge className="absolute -top-2 -right-2 text-[10px]">
                      Mejor Valor
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}

          {/* Filter toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="show-available"
              checked={showOnlyAvailable}
              onCheckedChange={setShowOnlyAvailable}
            />
            <Label htmlFor="show-available">Mostrar solo disponibles</Label>
          </div>

          {/* Ticket Grid - responsive columns */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1 md:gap-2">
              {filteredTickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => handleTicketClick(ticket.ticket_number, ticket.status)}
                  disabled={ticket.status !== 'available'}
                  className={cn(
                    'aspect-square flex items-center justify-center text-[10px] sm:text-xs md:text-sm font-medium rounded transition-all min-h-[40px] touch-manipulation',
                    getStatusColor(ticket.status),
                    selectedTickets.includes(ticket.ticket_number) && 'ring-2 ring-primary ring-offset-2 scale-105'
                  )}
                >
                  {ticket.ticket_number}
                </button>
              ))}
            </div>
          )}

          {/* Mobile-optimized Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            {/* Page info */}
            <div className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="h-9 w-9"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-9 w-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {/* Mobile-friendly page selector */}
              <select
                value={page}
                onChange={(e) => setPage(Number(e.target.value))}
                className="h-9 px-2 rounded-md border border-input bg-background text-sm min-w-[60px]"
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
                className="h-9 w-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="h-9 w-9"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-sm justify-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-500" />
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-400" />
              <span>Reservado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted" />
              <span>Vendido</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="random" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>¿Cuántos boletos quieres?</Label>
                <Input
                  type="number"
                  min={1}
                  max={maxPerPurchase || 100}
                  value={randomCount}
                  onChange={(e) => setRandomCount(parseInt(e.target.value) || 1)}
                />
              </div>

              {/* Package quick select */}
              {packages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {packages.map(pkg => (
                    <Button
                      key={pkg.id}
                      variant={randomCount === pkg.quantity ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRandomCount(pkg.quantity)}
                    >
                      {pkg.label || `${pkg.quantity} boletos`}
                      {pkg.discount_percent && pkg.discount_percent > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          -{pkg.discount_percent}%
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              )}

              <Button
                onClick={handleRandomGenerate}
                disabled={randomMutation.isPending}
                className="w-full"
              >
                {randomMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Shuffle className="h-4 w-4 mr-2" />
                )}
                Generar Números Aleatorios
              </Button>

              {generatedNumbers.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {generatedNumbers.map(num => (
                      <Badge key={num} variant="secondary" className="text-lg px-3 py-1">
                        {num}
                      </Badge>
                    ))}
                  </div>
                  
                  {regenerateCount < 3 && (
                    <Button
                      variant="outline"
                      onClick={handleRegenerate}
                      disabled={randomMutation.isPending}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Regenerar ({3 - regenerateCount} intentos restantes)
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar número específico..."
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                />
                <Button onClick={handleSearchTicket}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {searchNumber && (
                <div>
                  {tickets.find(t => t.ticket_number === searchNumber)?.status === 'available' ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                      <p className="text-emerald-700 dark:text-emerald-300">
                        ¡El boleto #{searchNumber} está disponible!
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-destructive/10 rounded-lg">
                      <p className="text-destructive">
                        El boleto #{searchNumber} no está disponible.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Selection Summary */}
      {selectedTickets.length > 0 && (
        <Card className="sticky bottom-4 bg-background/95 backdrop-blur border-2 border-primary">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground">
                  {selectedTickets.length} boleto{selectedTickets.length !== 1 ? 's' : ''} seleccionado{selectedTickets.length !== 1 ? 's' : ''}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(calculateTotal(), currencyCode)}
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => onContinue(selectedTickets)}
                className="w-full md:w-auto"
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
