import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Search, 
  Download,
  MessageCircle,
  Mail,
  ChevronLeft,
  ChevronRight,
  Users,
  Eye,
  FileDown,
  Image,
  Copy,
  DollarSign,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useBuyers, Buyer } from '@/hooks/useBuyers';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/EmptyState';
import { TicketDetailDialog } from './TicketDetailDialog';
import { formatCurrency } from '@/lib/currency-utils';
import { useOrderReceipt } from '@/hooks/useOrderReceipt';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface BuyersTabProps {
  raffleId: string;
  raffleTitle?: string;
  raffleSlug?: string;
  prizeName?: string;
  prizeImages?: string[];
  drawDate?: string | null;
  ticketPrice?: number;
  currencyCode?: string;
  organizationName?: string;
  organizationLogo?: string | null;
}

const BUYERS_PER_PAGE = 20;

// Payment method display helper
const getPaymentMethodLabel = (method: string | null): string => {
  if (!method) return '-';
  const labels: Record<string, string> = {
    'transfer': 'Transferencia',
    'spei': 'SPEI',
    'oxxo': 'OXXO',
    'paypal': 'PayPal',
    'card': 'Tarjeta',
    'cash': 'Efectivo',
  };
  return labels[method.toLowerCase()] || method;
};

export function BuyersTab({ 
  raffleId,
  raffleTitle = '',
  raffleSlug = '',
  prizeName = '',
  prizeImages = [],
  drawDate,
  ticketPrice = 0,
  currencyCode = 'MXN',
  organizationName = '',
  organizationLogo,
}: BuyersTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const { toast } = useToast();
  const { generateOrderReceipt, isGenerating } = useOrderReceipt();

  const { useBuyersList, useCities, exportBuyers, getWhatsAppLink, getMailtoLink } = useBuyers(raffleId);
  
  const { data: buyersData, isLoading } = useBuyersList({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    city: cityFilter !== 'all' ? cityFilter : undefined,
    search: searchQuery || undefined,
    page: currentPage,
    pageSize: BUYERS_PER_PAGE,
  });

  const { data: cities = [] } = useCities();

  const buyers = buyersData?.buyers || [];
  const totalPages = Math.ceil((buyersData?.count || 0) / BUYERS_PER_PAGE);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const confirmedBuyers = buyers.filter(b => b.status === 'sold');
    const pendingBuyers = buyers.filter(b => b.status === 'reserved');
    
    const totalRevenue = confirmedBuyers.reduce((sum, b) => {
      return sum + (b.orderTotal || b.ticketCount * ticketPrice);
    }, 0);
    
    const avgPerBuyer = confirmedBuyers.length > 0 
      ? totalRevenue / confirmedBuyers.length 
      : 0;

    return {
      totalRevenue,
      avgPerBuyer,
      pendingCount: pendingBuyers.length,
      confirmedCount: confirmedBuyers.length,
    };
  }, [buyers, ticketPrice]);

  const handleExport = async () => {
    try {
      const csv = await exportBuyers();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compradores-${raffleId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: 'CSV exportado correctamente' });
    } catch (error) {
      toast({ title: 'Error al exportar', variant: 'destructive' });
    }
  };

  const handleDownloadReceipt = async (buyer: Buyer) => {
    if (!buyer.paymentReference) {
      toast({ title: 'No hay referencia de orden', variant: 'destructive' });
      return;
    }

    try {
      // Fetch tickets for this order - include raffle_id to avoid cross-raffle matches
      const { data: ticketsData, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('raffle_id', raffleId)
        .eq('payment_reference', buyer.paymentReference)
        .order('ticket_index', { ascending: true });

      if (error) {
        console.error('Error fetching tickets:', error);
        toast({ title: 'Error al obtener boletos', variant: 'destructive' });
        return;
      }

      if (!ticketsData || ticketsData.length === 0) {
        toast({ title: 'No se encontraron boletos para esta orden', variant: 'destructive' });
        return;
      }

      await generateOrderReceipt({
        tickets: ticketsData.map(t => ({
          id: t.id,
          ticket_number: t.ticket_number,
          status: t.status || 'reserved',
          reserved_at: t.reserved_at,
          sold_at: t.sold_at,
          payment_reference: t.payment_reference,
          order_total: t.order_total ? Number(t.order_total) : null,
          buyer_name: t.buyer_name,
          buyer_email: t.buyer_email,
          buyer_phone: t.buyer_phone,
          buyer_city: t.buyer_city,
          payment_method: t.payment_method,
        })),
      raffle: {
        title: raffleTitle,
        slug: raffleSlug,
        prize_name: prizeName,
        draw_date: drawDate || null,
        ticket_price: ticketPrice,
        currency_code: currencyCode,
      },
      organization: {
        name: organizationName,
        logo_url: organizationLogo,
      },
    });

      toast({ title: 'Comprobante generado correctamente' });
    } catch (err) {
      console.error('Error generating receipt:', err);
      toast({ title: 'Error al generar comprobante', variant: 'destructive' });
    }
  };

  const handleCopyReference = (reference: string) => {
    navigator.clipboard.writeText(reference);
    toast({ title: 'Referencia copiada' });
  };

  const handleViewProof = async (buyer: Buyer) => {
    // Fetch payment proof URL
    const { data, error } = await supabase
      .from('tickets')
      .select('payment_proof_url')
      .eq('payment_reference', buyer.paymentReference)
      .not('payment_proof_url', 'is', null)
      .limit(1)
      .single();

    if (error || !data?.payment_proof_url) {
      toast({ title: 'No se encontró comprobante', variant: 'destructive' });
      return;
    }

    window.open(data.payment_proof_url, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sold':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/50">Vendido</Badge>;
      case 'reserved':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/50">Reservado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-3 sm:space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Card>
            <CardContent className="p-2.5 sm:p-4">
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Ingresos</span>
              </div>
              <p className="text-sm sm:text-lg font-semibold mt-1">
                {formatCurrency(summaryStats.totalRevenue, currencyCode)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2.5 sm:p-4">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Promedio</span>
              </div>
              <p className="text-sm sm:text-lg font-semibold mt-1">
                {formatCurrency(summaryStats.avgPerBuyer, currencyCode)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2.5 sm:p-4">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Pendientes</span>
              </div>
              <p className="text-sm sm:text-lg font-semibold mt-1">
                {summaryStats.pendingCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2.5 sm:p-4">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Confirmados</span>
              </div>
              <p className="text-sm sm:text-lg font-semibold mt-1">
                {summaryStats.confirmedCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 p-3 sm:p-4 sm:pt-4">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 sm:flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[130px] text-xs sm:text-sm">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="sold">Vendidos</SelectItem>
                    <SelectItem value="reserved">Reservados</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="w-full sm:w-[130px] text-xs sm:text-sm">
                    <SelectValue placeholder="Ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleExport} variant="outline" size="sm" className="col-span-2 sm:col-span-1 sm:w-auto gap-1.5">
                  <Download className="h-4 w-4" />
                  <span>Exportar</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buyers Table */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Compradores ({buyersData?.count || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-4 pt-0">
            {isLoading ? (
              <div className="p-4">
                <TableSkeleton rows={5} columns={5} />
              </div>
            ) : buyers.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title="No hay compradores aún"
                  description="Cuando alguien compre boletos, aparecerán aquí con su información de contacto."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Nombre</TableHead>
                      <TableHead className="hidden md:table-cell text-xs">Contacto</TableHead>
                      <TableHead className="text-xs">Boletos</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs">Monto</TableHead>
                      <TableHead className="hidden lg:table-cell text-xs">Método</TableHead>
                      <TableHead className="hidden md:table-cell text-xs">Estado</TableHead>
                      <TableHead className="text-right text-xs">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buyers.map((buyer) => (
                      <TableRow key={buyer.id}>
                        <TableCell>
                          <div className="min-w-0">
                            {buyer.soldAt ? (
                              <Tooltip>
                                <TooltipTrigger className="text-left">
                                  <p className="text-sm font-medium">
                                    {format(new Date(buyer.soldAt), 'd MMM', { locale: es })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(buyer.soldAt), 'HH:mm', { locale: es })}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Confirmado: {format(new Date(buyer.soldAt), "dd MMM yyyy, HH:mm", { locale: es })}
                                </TooltipContent>
                              </Tooltip>
                            ) : buyer.date ? (
                              <Tooltip>
                                <TooltipTrigger className="text-left">
                                  <p className="text-sm font-medium">
                                    {format(new Date(buyer.date), 'd MMM', { locale: es })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(buyer.date), 'HH:mm', { locale: es })}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Reservado: {format(new Date(buyer.date), "dd MMM yyyy, HH:mm", { locale: es })}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{buyer.name || 'Sin nombre'}</p>
                            <p className="text-xs text-muted-foreground sm:hidden truncate">{buyer.email}</p>
                            {buyer.city && (
                              <p className="text-xs text-muted-foreground lg:hidden">{buyer.city}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="space-y-0.5">
                            {buyer.email && (
                              <div className="text-sm text-muted-foreground truncate max-w-[180px]">
                                {buyer.email}
                              </div>
                            )}
                            {buyer.phone && (
                              <div className="text-sm text-muted-foreground">
                                {buyer.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {buyer.tickets.slice(0, 2).map((ticket) => (
                              <Badge key={ticket} variant="outline" className="text-xs">
                                #{ticket}
                              </Badge>
                            ))}
                            {buyer.tickets.length > 2 && (
                              <Badge variant="secondary" className="text-xs">+{buyer.tickets.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="font-medium">
                            {buyer.orderTotal 
                              ? formatCurrency(buyer.orderTotal, currencyCode)
                              : formatCurrency(buyer.ticketCount * ticketPrice, currencyCode)
                            }
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {buyer.paymentMethod ? (
                            <Badge variant="outline" className="text-xs">
                              {getPaymentMethodLabel(buyer.paymentMethod)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {buyer.paymentReference ? (
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                {buyer.paymentReference}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleCopyReference(buyer.paymentReference!)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            {getStatusBadge(buyer.status || 'unknown')}
                            {buyer.hasPaymentProof && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Image className="h-3.5 w-3.5 text-blue-500" />
                                </TooltipTrigger>
                                <TooltipContent>Tiene comprobante</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setSelectedBuyer(buyer);
                                    setTicketDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 text-primary" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver boletos</TooltipContent>
                            </Tooltip>
                            
                            {buyer.paymentReference && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleDownloadReceipt(buyer)}
                                    disabled={isGenerating}
                                  >
                                    <FileDown className="h-4 w-4 text-purple-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Descargar comprobante</TooltipContent>
                              </Tooltip>
                            )}
                            
                            {buyer.hasPaymentProof && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleViewProof(buyer)}
                                  >
                                    <Image className="h-4 w-4 text-blue-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver comprobante de pago</TooltipContent>
                              </Tooltip>
                            )}
                            
                            {buyer.phone && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    asChild
                                  >
                                    <a 
                                      href={getWhatsAppLink(buyer.phone)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <MessageCircle className="h-4 w-4 text-green-600" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Enviar WhatsApp</TooltipContent>
                              </Tooltip>
                            )}
                            
                            {buyer.email && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    asChild
                                  >
                                    <a href={getMailtoLink(buyer.email)}>
                                      <Mail className="h-4 w-4 text-blue-600" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Enviar email</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-full sm:w-auto"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-full sm:w-auto"
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Ticket Detail Dialog */}
        {selectedBuyer && (
          <TicketDetailDialog
            open={ticketDialogOpen}
            onOpenChange={setTicketDialogOpen}
            tickets={selectedBuyer.tickets.map((ticketNumber, idx) => ({
              id: `${selectedBuyer.id}-${idx}`,
              ticket_number: ticketNumber,
              buyer_name: selectedBuyer.name,
              buyer_email: selectedBuyer.email,
              buyer_phone: selectedBuyer.phone,
              buyer_city: selectedBuyer.city,
              status: selectedBuyer.status,
            }))}
            raffle={{
              id: raffleId,
              title: raffleTitle,
              slug: raffleSlug,
              prize_name: prizeName,
              prize_images: prizeImages,
              draw_date: drawDate || null,
              ticket_price: ticketPrice,
              currency_code: currencyCode,
            }}
            organization={{
              name: organizationName,
              logo_url: organizationLogo,
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
