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
  Ticket
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

  return (
    <div className="space-y-6">
      {/* Premium container */}
      <div className="bg-white rounded-3xl border-2 border-gray-200 p-6 lg:p-8 shadow-xl">
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="manual" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Selección Manual
            </TabsTrigger>
            <TabsTrigger value="random" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Al Azar
            </TabsTrigger>
            <TabsTrigger value="search" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Buscar Número
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

            {/* Selected tickets banner */}
            {selectedTickets.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border-2 border-violet-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {selectedTickets.length} boleto{selectedTickets.length !== 1 && 's'} seleccionado{selectedTickets.length !== 1 && 's'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Total: {formatCurrency(calculateTotal(), currencyCode)}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg w-full sm:w-auto"
                    onClick={() => onContinue(selectedTickets)}
                  >
                    Continuar
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Premium ticket grid */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {filteredTickets.map(ticket => (
                  <button
                    key={ticket.id}
                    onClick={() => handleTicketClick(ticket.ticket_number, ticket.status)}
                    disabled={ticket.status !== 'available'}
                    className={cn(
                      "aspect-square rounded-xl font-bold text-sm transition-all duration-200",
                      "hover:scale-105 active:scale-95 touch-manipulation",
                      ticket.status === 'available' && !selectedTickets.includes(ticket.ticket_number) && 
                        "bg-white border-2 border-gray-300 text-gray-900 hover:border-violet-600 hover:text-violet-600 hover:shadow-lg",
                      ticket.status === 'available' && selectedTickets.includes(ticket.ticket_number) && 
                        "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg scale-105 border-2 border-transparent",
                      ticket.status === 'sold' && 
                        "bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed",
                      ticket.status === 'reserved' && 
                        "bg-yellow-50 border-2 border-yellow-300 text-yellow-700 cursor-not-allowed"
                    )}
                  >
                    {ticket.ticket_number}
                  </button>
                ))}
              </div>
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
            <Card className="border-2">
              <CardContent className="pt-6 space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Shuffle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Selección Aleatoria</h3>
                  <p className="text-gray-600">Deja que la suerte elija tus números</p>
                </div>

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
                  disabled={randomMutation.isPending}
                  size="lg"
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 h-14 text-lg"
                >
                  {randomMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-5 w-5 mr-2" />
                  )}
                  Generar Números Aleatorios
                </Button>

                {generatedNumbers.length > 0 && (
                  <div className="space-y-4 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl">
                    <p className="font-medium text-center text-gray-900">Tus números de la suerte:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {generatedNumbers.map(num => (
                        <Badge 
                          key={num} 
                          className="text-lg px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600"
                        >
                          {num}
                        </Badge>
                      ))}
                    </div>
                    
                    {regenerateCount < 3 && (
                      <Button
                        variant="outline"
                        onClick={handleRegenerate}
                        disabled={randomMutation.isPending}
                        className="w-full border-2"
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

      {/* Floating Selection Summary */}
      {selectedTickets.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
          <Card className="bg-white/95 backdrop-blur-lg border-2 border-violet-200 shadow-2xl">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    {selectedTickets.length} boleto{selectedTickets.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(calculateTotal(), currencyCode)}
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => onContinue(selectedTickets)}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg"
                >
                  Continuar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}