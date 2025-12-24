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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Trophy, 
  Dice5, 
  Search, 
  Check, 
  X,
  Mail,
  Download,
  Share2,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useRaffles } from '@/hooks/useRaffles';
import { useDrawWinner } from '@/hooks/useDrawWinner';
import { useTickets } from '@/hooks/useTickets';
import { useAuth } from '@/hooks/useAuth';
import { WinnerAnnouncement } from '@/components/raffle/WinnerAnnouncement';
import { formatCurrency } from '@/lib/currency-utils';
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

export default function DrawWinner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { organization } = useAuth();
  
  const { useRaffleById } = useRaffles();
  const { data: raffle, isLoading } = useRaffleById(id);
  const { useTicketsList } = useTickets(id);
  const { data: ticketsData } = useTicketsList({ status: 'sold', pageSize: 10000 });
  const allTickets = ticketsData?.tickets || [];
  const { selectWinner, notifyWinner, publishResult, generateRandomNumber } = useDrawWinner();

  const [activeTab, setActiveTab] = useState<DrawMethod>('manual');
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayNumber, setDisplayNumber] = useState('---');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
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

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
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

  const handleSpinRandom = () => {
    if (soldTickets.length === 0) return;
    
    setIsSpinning(true);
    setSelectedTicket(null);
    
    let counter = 0;
    const maxSpins = 30;
    
    spinIntervalRef.current = setInterval(() => {
      const randomIndex = generateRandomNumber(soldTickets.length) - 1;
      setDisplayNumber(soldTickets[randomIndex].ticket_number);
      counter++;
      
      if (counter >= maxSpins) {
        if (spinIntervalRef.current) {
          clearInterval(spinIntervalRef.current);
        }
        setIsSpinning(false);
        const finalIndex = generateRandomNumber(soldTickets.length) - 1;
        const winner = soldTickets[finalIndex];
        setDisplayNumber(winner.ticket_number);
        setSelectedTicket(winner);
      }
    }, 100);
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
    
    try {
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
        } : undefined,
      });
      
      setConfirmedWinner(selectedTicket);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      triggerConfetti();
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
      prizeName: raffle.prize_name,
      raffleTitle: raffle.title,
      orgName: organization?.name || '',
      drawMethod: activeTab,
    });
  };

  const handlePublish = async () => {
    if (!raffle) return;
    await publishResult.mutateAsync(raffle.id);
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(`/dashboard/raffles/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {raffle.prize_images?.[0] && (
                <img 
                  src={raffle.prize_images[0]} 
                  alt={raffle.prize_name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold">{raffle.title}</h1>
                <p className="text-muted-foreground">{raffle.prize_name}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge variant={isCompleted ? 'default' : 'secondary'}>
              {isCompleted ? 'Completado' : 'Listo para Sortear'}
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">
              {soldTickets.length} / {raffle.total_tickets} vendidos
            </p>
          </div>
        </div>

        {/* If already has winner */}
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

        {/* Draw Interface - only show if no winner yet */}
        {!isCompleted && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DrawMethod)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual">
                <Dice5 className="h-4 w-4 mr-2" />
                Manual
              </TabsTrigger>
              <TabsTrigger value="lottery">
                🎰 Lotería Nacional
              </TabsTrigger>
              <TabsTrigger value="random_org">
                🔐 Random.org
              </TabsTrigger>
            </TabsList>

            {/* Manual Selection */}
            <TabsContent value="manual" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Generador Aleatorio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Spinner display */}
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

              {/* Search ticket */}
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

              {/* Manual entry */}
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
                        <div className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="2" id="d2" />
                            <Label htmlFor="d2">2 últimos</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="3" id="d3" />
                            <Label htmlFor="d3">3 últimos</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="4" id="d4" />
                            <Label htmlFor="d4">4 últimos</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="5" id="d5" />
                            <Label htmlFor="d5">5 últimos</Label>
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

              {/* Matching tickets */}
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
        )}

        {/* Selected Ticket Preview */}
        {selectedTicket && !isCompleted && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Vista Previa del Ganador
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
                  Confirmar Ganador
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
                🏆 Confirmar Ganador
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
                <p><strong>Premio:</strong> {raffle?.prize_name}</p>
                <p><strong>Valor:</strong> {formatCurrency(raffle?.prize_value || 0, raffle?.currency_code || 'MXN')}</p>
                <p><strong>Método:</strong> {activeTab === 'manual' ? 'Manual' : activeTab === 'lottery' ? 'Lotería Nacional' : 'Random.org'}</p>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Esta acción es irreversible. El sorteo se marcará como completado.
              </p>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleFinalConfirm} disabled={selectWinner.isPending}>
                {selectWinner.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Confirmar Ganador
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
                El ganador ha sido seleccionado exitosamente
              </p>
              
              {confirmedWinner && raffle && (
                <WinnerAnnouncement
                  ticketNumber={confirmedWinner.ticket_number}
                  winnerName={confirmedWinner.buyer_name || ''}
                  prizeName={raffle.prize_name}
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
                <Button variant="outline" onClick={handlePublish} disabled={publishResult.isPending}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Publicar Resultado
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => navigate(`/dashboard/raffles/${id}`)}
                >
                  Volver al Sorteo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
