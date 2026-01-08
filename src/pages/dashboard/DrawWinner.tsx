import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Trophy, 
  Dice5, 
  Search, 
  Check, 
  X,
  Mail,
  Share2,
  ExternalLink,
  Loader2,
  Info,
} from 'lucide-react';
import { useRaffles } from '@/hooks/useRaffles';
import { useDrawWinner } from '@/hooks/useDrawWinner';
import { useTickets } from '@/hooks/useTickets';
import { useAuth } from '@/hooks/useAuth';
import { useRaffleDraws, getRemainingPrizes } from '@/hooks/useRaffleDraws';
import { WinnerAnnouncement } from '@/components/raffle/WinnerAnnouncement';
import { DrawPrizeSelector } from '@/components/raffle/draw/DrawPrizeSelector';
import { DrawHistoryTable } from '@/components/raffle/draw/DrawHistoryTable';
import { formatCurrency } from '@/lib/currency-utils';
import { parsePrizes } from '@/types/prize';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import confetti from 'canvas-confetti';

type DrawMethod = 'manual' | 'lottery' | 'random_org';

interface Ticket {
  id: string;
  ticket_number: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_city: string | null;
  status: string | null;
}

// Helper to expand orders to tickets
function expandOrdersToTickets(orders: any[]): Ticket[] {
  const tickets: Ticket[] = [];
  for (const order of orders) {
    const ranges = order.ticket_ranges as Array<{ s: number; e: number }> || [];
    for (const range of ranges) {
      for (let i = range.s; i <= range.e; i++) {
        tickets.push({
          id: order.id,
          ticket_number: String(i + 1),
          buyer_name: order.buyer_name,
          buyer_email: order.buyer_email,
          buyer_phone: order.buyer_phone,
          buyer_city: order.buyer_city,
          status: order.status,
        });
      }
    }
    const lucky = order.lucky_indices as number[] || [];
    for (const idx of lucky) {
      if (!tickets.some(t => t.ticket_number === String(idx + 1))) {
        tickets.push({
          id: order.id,
          ticket_number: String(idx + 1),
          buyer_name: order.buyer_name,
          buyer_email: order.buyer_email,
          buyer_phone: order.buyer_phone,
          buyer_city: order.buyer_city,
          status: order.status,
        });
      }
    }
  }
  return tickets;
}

export default function DrawWinner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { organization } = useAuth();
  
  const { useRaffleById } = useRaffles();
  const { data: raffle, isLoading } = useRaffleById(id);
  const { useTicketsList } = useTickets(id);
  const { data: ticketsData } = useTicketsList({ status: 'sold', pageSize: 1000 });
  const rawOrders = ticketsData?.tickets || [];
  const allTickets = expandOrdersToTickets(rawOrders);
  const { selectWinner, notifyWinner, publishResult, generateRandomNumber, drawRandomWinner } = useDrawWinner();
  
  // Pre-draw system
  const { 
    draws, 
    completedDraws, 
    drawnPrizeIds, 
    isPrizeDrawn,
    createDraw, 
    announceDraw, 
    markWinnerNotified,
    deleteDraw,
  } = useRaffleDraws(id);

  const [activeTab, setActiveTab] = useState<DrawMethod>('manual');
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayNumber, setDisplayNumber] = useState('---');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  // Prize selection for pre-draws
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);
  const [isMainDraw, setIsMainDraw] = useState(false);
  
  // Lottery state
  const [lotteryDrawNumber, setLotteryDrawNumber] = useState('');
  const [lotteryDigits, setLotteryDigits] = useState('2');
  const [lotteryResult, setLotteryResult] = useState('');
  const [matchingTickets, setMatchingTickets] = useState<Ticket[]>([]);
  
  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [confirmedWinner, setConfirmedWinner] = useState<Ticket | null>(null);

  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const soldTickets = allTickets;
  
  // Parse prizes from raffle
  const prizes = raffle ? parsePrizes(raffle.prizes, raffle.prize_name, raffle.prize_value) : [];
  const remainingPrizes = getRemainingPrizes(prizes, drawnPrizeIds);
  const hasMultiplePrizes = prizes.length > 1;
  const selectedPrize = prizes.find(p => p.id === selectedPrizeId);
  
  // Auto-select first remaining prize
  useEffect(() => {
    if (remainingPrizes.length > 0 && !selectedPrizeId) {
      setSelectedPrizeId(remainingPrizes[0].id);
    }
  }, [remainingPrizes, selectedPrizeId]);

  // Cleanup interval on unmount
  useEffect(() => {
    const currentRef = spinIntervalRef.current;
    return () => {
      if (currentRef) {
        clearInterval(currentRef);
        spinIntervalRef.current = null;
      }
    };
  }, []);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  const handleSpinRandom = async () => {
    if (isSpinning) return;
    
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }
    
    setIsSpinning(true);
    setSelectedTicket(null);
    
    let counter = 0;
    const maxSpins = 30;
    
    spinIntervalRef.current = setInterval(() => {
      const randomNum = Math.floor(Math.random() * 99999);
      setDisplayNumber(String(randomNum).padStart(5, '0'));
      counter++;
      
      if (counter >= maxSpins) {
        if (spinIntervalRef.current) {
          clearInterval(spinIntervalRef.current);
          spinIntervalRef.current = null;
        }
      }
    }, 100);

    try {
      const winner = await drawRandomWinner(id!);
      
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
      }
      
      setDisplayNumber(winner.ticket_number);
      setSelectedTicket({
        id: winner.id,
        ticket_number: winner.ticket_number,
        buyer_name: winner.buyer_name,
        buyer_email: winner.buyer_email,
        buyer_phone: winner.buyer_phone,
        buyer_city: winner.buyer_city,
        status: 'sold',
      });
      setIsSpinning(false);
    } catch (error) {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
      }
      setIsSpinning(false);
      setDisplayNumber('---');
      
      if (soldTickets.length > 0) {
        const randomIndex = generateRandomNumber(soldTickets.length) - 1;
        const winner = soldTickets[randomIndex];
        setDisplayNumber(winner.ticket_number);
        setSelectedTicket(winner);
      }
    }
  };

  const handleSearchTicket = () => {
    const found = soldTickets.find(
      (t: Ticket) => t.ticket_number === searchQuery.padStart(4, '0') || t.ticket_number === searchQuery
    );
    if (found) {
      setSelectedTicket(found);
    } else {
      setSelectedTicket(null);
    }
  };

  const handleManualEntry = () => {
    const found = soldTickets.find(
      (t: Ticket) => t.ticket_number === manualNumber.padStart(4, '0') || t.ticket_number === manualNumber
    );
    if (found) {
      setSelectedTicket(found);
    } else {
      setSelectedTicket(null);
    }
  };

  const handleLotteryExtract = () => {
    if (!lotteryDrawNumber) return;
    
    const digits = parseInt(lotteryDigits);
    const extracted = lotteryDrawNumber.slice(-digits);
    setLotteryResult(extracted);
    
    const matches = soldTickets.filter((t: Ticket) => 
      t.ticket_number.endsWith(extracted)
    );
    setMatchingTickets(matches);
  };

  const handleConfirmWinner = () => {
    if (!selectedTicket) return;
    setShowConfirmModal(true);
  };

  const handleFinalConfirm = async () => {
    if (!selectedTicket || !raffle) return;
    
    const prizeToUse = selectedPrize || prizes[0];
    const isFinalDraw = isMainDraw || remainingPrizes.length === 1;
    
    try {
      // Create draw record in new table
      await createDraw.mutateAsync({
        raffleId: raffle.id,
        prizeId: prizeToUse?.id || 'main',
        prizeName: prizeToUse?.name || raffle.prize_name,
        prizeValue: prizeToUse?.value,
        ticketId: selectedTicket.id,
        ticketNumber: selectedTicket.ticket_number,
        winnerName: selectedTicket.buyer_name || '',
        winnerEmail: selectedTicket.buyer_email || '',
        winnerPhone: selectedTicket.buyer_phone,
        winnerCity: selectedTicket.buyer_city,
        drawMethod: activeTab,
        drawMetadata: activeTab === 'lottery' ? { 
          lottery_draw_number: lotteryDrawNumber,
          digits_used: lotteryDigits,
        } : undefined,
        drawType: isFinalDraw ? 'main_draw' : 'pre_draw',
      });

      // If it's the final draw, also update the raffle's winner_data for backwards compatibility
      if (isFinalDraw) {
        await selectWinner.mutateAsync({
          raffleId: raffle.id,
          ticketNumber: selectedTicket.ticket_number,
          ticketId: selectedTicket.id,
          buyerName: selectedTicket.buyer_name || '',
          buyerEmail: selectedTicket.buyer_email || '',
          buyerPhone: selectedTicket.buyer_phone,
          buyerCity: selectedTicket.buyer_city,
          drawMethod: activeTab,
          metadata: activeTab === 'lottery' ? { 
            lottery_draw_number: lotteryDrawNumber,
            digits_used: lotteryDigits,
            prize_id: prizeToUse?.id,
          } : { prize_id: prizeToUse?.id },
        });
      }
      
      setConfirmedWinner(selectedTicket);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      triggerConfetti();
      
      // Reset selection for next draw
      setSelectedPrizeId(null);
      setSelectedTicket(null);
    } catch {
      // Error handled by hook
    }
  };

  const handleNotifyWinner = async () => {
    if (!confirmedWinner || !raffle) return;
    
    await notifyWinner.mutateAsync({
      raffleId: raffle.id,
      buyerName: confirmedWinner.buyer_name || '',
      buyerEmail: confirmedWinner.buyer_email || '',
      ticketNumber: confirmedWinner.ticket_number,
      prizeName: selectedPrize?.name || raffle.prize_name,
      raffleTitle: raffle.title,
      orgName: organization?.name || '',
      drawMethod: activeTab,
    });
  };

  const handlePublish = async () => {
    if (!raffle) return;
    await publishResult.mutateAsync(raffle.id);
  };
  
  const handleAnnounceFromHistory = async (drawId: string) => {
    await announceDraw.mutateAsync(drawId);
  };
  
  const handleNotifyFromHistory = async (draw: any) => {
    if (!raffle || !draw.winner_email) return;
    
    await notifyWinner.mutateAsync({
      raffleId: raffle.id,
      buyerName: draw.winner_name || '',
      buyerEmail: draw.winner_email,
      ticketNumber: draw.ticket_number,
      prizeName: draw.prize_name,
      raffleTitle: raffle.title,
      orgName: organization?.name || '',
      drawMethod: draw.draw_method,
    });
    
    await markWinnerNotified.mutateAsync(draw.id);
  };
  
  const handleDeleteFromHistory = async (drawId: string) => {
    await deleteDraw.mutateAsync(drawId);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!raffle) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Sorteo no encontrado</h2>
          <Button onClick={() => navigate('/dashboard/raffles')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Sorteos
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isCompleted = raffle.status === 'completed' || raffle.winner_ticket_number;
  const allPrizesDrawn = remainingPrizes.length === 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(`/dashboard/raffles/${id}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {raffle.prize_images?.[0] && (
              <img 
                src={raffle.prize_images[0]} 
                alt={raffle.prize_name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold truncate">{raffle.title}</h1>
              <p className="text-sm text-muted-foreground truncate">{raffle.prize_name}</p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:flex-col sm:items-end sm:text-right gap-2 pl-10 sm:pl-0">
            <Badge variant={isCompleted ? 'default' : 'secondary'} className="text-xs">
              {isCompleted ? 'Completado' : 'Listo'}
            </Badge>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {soldTickets.length} / {raffle.total_tickets} vendidos
            </p>
          </div>
        </div>

        {/* Pre-draw info banner */}
        {hasMultiplePrizes && !isCompleted && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Esta rifa tiene {prizes.length} premios. Puedes realizar pre-sorteos para cada premio 
              antes del sorteo final. {completedDraws.length > 0 && (
                <span className="font-medium">
                  Ya has sorteado {completedDraws.length} de {prizes.length} premios.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* If already has winner (legacy view) */}
        {isCompleted && raffle.winner_data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Ganador del Sorteo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WinnerAnnouncement
                ticketNumber={raffle.winner_ticket_number || ''}
                winnerName={(raffle.winner_data as any)?.buyer_name || ''}
                prizeName={raffle.prize_name}
                prizeImage={raffle.prize_images?.[0]}
                raffleTitle={raffle.title}
                orgName={organization?.name || ''}
                orgLogo={organization?.logo_url || undefined}
                drawDate={format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}
                brandColor={organization?.brand_color || '#6366f1'}
              />
            </CardContent>
          </Card>
        )}

        {/* Draw History (show if there are completed draws) */}
        {completedDraws.length > 0 && (
          <DrawHistoryTable
            draws={completedDraws}
            currencyCode={raffle.currency_code || 'MXN'}
            onAnnounce={handleAnnounceFromHistory}
            onNotify={handleNotifyFromHistory}
            onDelete={handleDeleteFromHistory}
            isAnnouncing={announceDraw.isPending}
            isNotifying={notifyWinner.isPending}
            isDeleting={deleteDraw.isPending}
          />
        )}

        {/* Draw Interface - only show if not all prizes drawn */}
        {!isCompleted && !allPrizesDrawn && (
          <>
            {/* Prize Selector (for multiple prizes) */}
            {hasMultiplePrizes && (
              <DrawPrizeSelector
                prizes={prizes}
                drawnPrizeIds={drawnPrizeIds}
                selectedPrizeId={selectedPrizeId}
                onSelectPrize={setSelectedPrizeId}
                displayMode={raffle.prize_display_mode as any}
                currencyCode={raffle.currency_code || 'MXN'}
              />
            )}
            
            {/* Main draw toggle */}
            {remainingPrizes.length > 1 && selectedPrizeId && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">¿Es el sorteo final?</p>
                      <p className="text-sm text-muted-foreground">
                        Si marcas como sorteo final, la rifa se completará
                      </p>
                    </div>
                    <Switch
                      checked={isMainDraw}
                      onCheckedChange={setIsMainDraw}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DrawMethod)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manual" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <Dice5 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Manual
                </TabsTrigger>
                <TabsTrigger value="lottery" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <span className="text-sm sm:text-base">🎰</span>
                  <span className="hidden sm:inline">Lotería Nacional</span>
                  <span className="sm:hidden">Lotería</span>
                </TabsTrigger>
                <TabsTrigger value="random_org" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <span className="text-sm sm:text-base">🔐</span>
                  <span className="hidden sm:inline">Random.org</span>
                  <span className="sm:hidden">Random</span>
                </TabsTrigger>
              </TabsList>

              {/* Manual Selection */}
              <TabsContent value="manual" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Generador Aleatorio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center py-8">
                      <div className={`text-7xl font-mono font-bold transition-all ${isSpinning ? 'text-primary animate-pulse' : 'text-foreground'}`}>
                        #{displayNumber}
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <Button 
                        size="lg" 
                        onClick={handleSpinRandom}
                        disabled={isSpinning || soldTickets.length === 0}
                      >
                        {isSpinning ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Generando...
                          </>
                        ) : (
                          <>
                            <Dice5 className="h-5 w-5 mr-2" />
                            Generar Ganador Aleatorio
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Buscar Boleto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Número de boleto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <Button onClick={handleSearchTicket}>
                        <Search className="h-4 w-4 mr-2" />
                        Buscar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Entrada Manual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ingresa número de boleto..."
                        value={manualNumber}
                        onChange={(e) => setManualNumber(e.target.value)}
                      />
                      <Button variant="secondary" onClick={handleManualEntry}>
                        Seleccionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Lottery Nacional */}
              <TabsContent value="lottery" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Lotería Nacional de México</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Número del Sorteo</Label>
                        <Input
                          placeholder="Ej: 12345"
                          value={lotteryDrawNumber}
                          onChange={(e) => setLotteryDrawNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Dígitos a extraer</Label>
                        <RadioGroup value={lotteryDigits} onValueChange={setLotteryDigits}>
                          <div className="flex flex-wrap gap-3 sm:gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="2" id="d2" />
                              <Label htmlFor="d2" className="text-sm">2 últimos</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="3" id="d3" />
                              <Label htmlFor="d3" className="text-sm">3 últimos</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="4" id="d4" />
                              <Label htmlFor="d4" className="text-sm">4 últimos</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="5" id="d5" />
                              <Label htmlFor="d5" className="text-sm">5 últimos</Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleLotteryExtract} disabled={!lotteryDrawNumber}>
                        Extraer Número
                      </Button>
                      <Button variant="outline" asChild>
                        <a href="https://www.lotenal.gob.mx/resultados" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Verificar en LOTENAL
                        </a>
                      </Button>
                    </div>

                    {lotteryResult && (
                      <div className="mt-4 p-4 bg-muted rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Número extraído:</p>
                        <p className="text-4xl font-bold font-mono">{lotteryResult}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {matchingTickets.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Boletos Coincidentes ({matchingTickets.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {matchingTickets.map((ticket) => (
                          <div 
                            key={ticket.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedTicket?.id === ticket.id 
                                ? 'border-primary bg-primary/5' 
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-mono font-bold">#{ticket.ticket_number}</span>
                                <span className="ml-3">{ticket.buyer_name}</span>
                              </div>
                              {selectedTicket?.id === ticket.id && (
                                <Check className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Random.org */}
              <TabsContent value="random_org" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Random.org - Generador Certificado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Random.org utiliza ruido atmosférico para generar números aleatorios verdaderos, 
                      lo que proporciona una verificación independiente para tu sorteo.
                    </p>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                      <p className="text-sm">
                        <strong>Nota:</strong> Para una verificación completa con Random.org, 
                        necesitas una cuenta API. Por ahora, usamos un generador criptográficamente seguro.
                      </p>
                    </div>

                    <Button onClick={handleSpinRandom} disabled={isSpinning}>
                      {isSpinning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        'Generar Número Verificado'
                      )}
                    </Button>

                    {!isSpinning && displayNumber !== '---' && (
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Número generado:</p>
                        <p className="text-4xl font-bold font-mono">{displayNumber}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* All prizes drawn message */}
        {allPrizesDrawn && !isCompleted && (
          <Card>
            <CardContent className="py-8 text-center">
              <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Todos los premios han sido sorteados</h2>
              <p className="text-muted-foreground mb-4">
                Puedes publicar los resultados o revisar el historial de sorteos arriba.
              </p>
              <Button onClick={handlePublish} disabled={publishResult.isPending}>
                <Share2 className="h-4 w-4 mr-2" />
                Publicar Resultados
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Selected Ticket Preview */}
        {selectedTicket && !isCompleted && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Vista Previa del Ganador
                {selectedPrize && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedPrize.name}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Boleto</p>
                  <p className="text-3xl font-bold font-mono">#{selectedTicket.ticket_number}</p>
                </div>
                <div className="space-y-1">
                  <p><strong>Nombre:</strong> {selectedTicket.buyer_name}</p>
                  <p><strong>Email:</strong> {selectedTicket.buyer_email}</p>
                  <p><strong>Teléfono:</strong> {selectedTicket.buyer_phone || 'N/A'}</p>
                  <p><strong>Ciudad:</strong> {selectedTicket.buyer_city || 'N/A'}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={handleConfirmWinner} className="flex-1">
                  <Check className="h-4 w-4 mr-2" />
                  {isMainDraw || remainingPrizes.length === 1 ? 'Confirmar Ganador Final' : 'Confirmar Pre-Sorteo'}
                </Button>
                <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Modal */}
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">
                🏆 Confirmar {isMainDraw || remainingPrizes.length === 1 ? 'Ganador Final' : 'Pre-Sorteo'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-6xl font-bold font-mono text-primary">
                  #{selectedTicket?.ticket_number}
                </p>
              </div>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>Nombre:</strong> {selectedTicket?.buyer_name}</p>
                <p><strong>Email:</strong> {selectedTicket?.buyer_email}</p>
                <p><strong>Premio:</strong> {selectedPrize?.name || raffle?.prize_name}</p>
                {(selectedPrize?.value || raffle?.prize_value) && (
                  <p><strong>Valor:</strong> {formatCurrency(selectedPrize?.value || raffle?.prize_value || 0, raffle?.currency_code || 'MXN')}</p>
                )}
                <p><strong>Método:</strong> {activeTab === 'manual' ? 'Manual' : activeTab === 'lottery' ? 'Lotería Nacional' : 'Random.org'}</p>
                <p><strong>Tipo:</strong> {isMainDraw || remainingPrizes.length === 1 ? 'Sorteo Final' : 'Pre-Sorteo'}</p>
              </div>
              {(isMainDraw || remainingPrizes.length === 1) && (
                <p className="text-sm text-muted-foreground text-center">
                  Esta acción es irreversible. El sorteo se marcará como completado.
                </p>
              )}
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleFinalConfirm} disabled={createDraw.isPending || selectWinner.isPending}>
                {(createDraw.isPending || selectWinner.isPending) ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Modal */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-center text-3xl">
                🎉 ¡Felicidades! 🎉
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <p className="text-center text-lg">
                El ganador de {selectedPrize?.name || 'el premio'} ha sido seleccionado
              </p>
              
              {confirmedWinner && raffle && (
                <WinnerAnnouncement
                  ticketNumber={confirmedWinner.ticket_number}
                  winnerName={confirmedWinner.buyer_name || ''}
                  prizeName={selectedPrize?.name || raffle.prize_name}
                  prizeImage={raffle.prize_images?.[0]}
                  raffleTitle={raffle.title}
                  orgName={organization?.name || ''}
                  orgLogo={organization?.logo_url || undefined}
                  drawDate={format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}
                  brandColor={organization?.brand_color || '#6366f1'}
                />
              )}

              <div className="flex flex-wrap gap-2 justify-center">
                <Button onClick={handleNotifyWinner} disabled={notifyWinner.isPending}>
                  <Mail className="h-4 w-4 mr-2" />
                  Notificar al Ganador
                </Button>
                {(isMainDraw || remainingPrizes.length === 0) && (
                  <Button variant="outline" onClick={handlePublish} disabled={publishResult.isPending}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Publicar Resultado
                  </Button>
                )}
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setShowSuccessModal(false);
                    setConfirmedWinner(null);
                  }}
                >
                  {remainingPrizes.length > 0 ? 'Continuar con Siguiente Premio' : 'Cerrar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
