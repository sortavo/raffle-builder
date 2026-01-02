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
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Phone
} from 'lucide-react';
import { useBuyers, Buyer } from '@/hooks/useBuyers';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency-utils';
import { TicketDetailDialog } from './TicketDetailDialog';

export interface BuyersTabProps {
  raffleId: string;
  raffleTitle: string;
  raffleSlug: string;
  prizeName: string;
  prizeImages: string[];
  drawDate: string | null;
  ticketPrice: number;
  currencyCode: string;
  organizationName: string;
  organizationLogo?: string | null;
}

interface SummaryStats {
  totalRevenue: number;
  avgPerBuyer: number;
  pendingCount: number;
  confirmedCount: number;
}

export function BuyersTab({ 
  raffleId, 
  raffleTitle,
  raffleSlug,
  prizeName,
  prizeImages,
  drawDate,
  ticketPrice,
  currencyCode,
  organizationName,
  organizationLogo,
}: BuyersTabProps) {
  const { toast } = useToast();
  const { useBuyersList, useCities, exportBuyers, getWhatsAppLink } = useBuyers(raffleId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const itemsPerPage = 10;

  // Use the hook-based queries
  const { data: buyersData, isLoading } = useBuyersList({
    status: statusFilter === 'all' ? undefined : statusFilter,
    city: cityFilter === 'all' ? undefined : cityFilter,
    search: searchTerm || undefined,
    page: currentPage,
    pageSize: itemsPerPage,
  });
  
  const { data: citiesData } = useCities();
  
  const buyers = buyersData?.buyers || [];
  const totalCount = buyersData?.count || 0;
  const cities = citiesData || [];

  // Summary stats
  const summaryStats = useMemo<SummaryStats>(() => {
    if (!buyers || buyers.length === 0) {
      return {
        totalRevenue: 0,
        avgPerBuyer: 0,
        pendingCount: 0,
        confirmedCount: 0
      };
    }

    const totalRevenue = buyers.reduce((sum, buyer) => sum + (buyer.orderTotal || 0), 0);
    const avgPerBuyer = buyers.length > 0 ? totalRevenue / buyers.length : 0;
    const pendingCount = buyers.filter(b => b.status === 'reserved').length;
    const confirmedCount = buyers.filter(b => b.status === 'sold').length;

    return {
      totalRevenue,
      avgPerBuyer,
      pendingCount,
      confirmedCount
    };
  }, [buyers]);

  // Pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Handlers
  const handleExportCSV = async () => {
    try {
      const csv = await exportBuyers();
      if (csv) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `compradores-${raffleTitle}.csv`;
        link.click();
        toast({
          title: "CSV exportado",
          description: "La lista de compradores se descargó exitosamente",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar el archivo",
        variant: "destructive",
      });
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast({
      title: "Email copiado",
      description: "El email se copió al portapapeles",
    });
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast({
      title: "Teléfono copiado",
      description: "El teléfono se copió al portapapeles",
    });
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const message = `Hola ${name}, gracias por tu compra en ${raffleTitle}`;
    window.open(getWhatsAppLink(phone, message), '_blank');
  };

  const handleEmail = (email: string, name: string) => {
    const subject = encodeURIComponent(`Confirmación - ${raffleTitle}`);
    const body = encodeURIComponent(`Hola ${name},\n\nGracias por tu compra.`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const getPaymentMethodLabel = (method: string | null): string => {
    if (!method) return '-';
    const labels: Record<string, string> = {
      transfer: 'Transferencia',
      cash: 'Efectivo',
      card: 'Tarjeta',
      paypal: 'PayPal',
      other: 'Otro'
    };
    return labels[method] || method;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      sold: 'default',
      reserved: 'secondary',
      available: 'outline',
      canceled: 'destructive'
    } as const;
    
    const labels: Record<string, string> = {
      sold: 'Confirmado',
      reserved: 'Pendiente',
      available: 'Disponible',
      canceled: 'Cancelado'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando compradores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Cards - ULTRA COMPACTO para mobile */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-3 w-full min-w-0">
        {/* Card 1: Ingresos */}
        <Card className="min-w-0 w-full">
          <CardContent className="p-2 sm:p-3 min-w-0">
            <div className="flex flex-col items-center gap-0.5 sm:gap-1 min-w-0 w-full">
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-[10px] sm:text-xs font-medium truncate">
                  Ingresos
                </span>
              </div>
              <p className="text-sm sm:text-lg font-bold truncate w-full text-center">
                {formatCurrency(summaryStats.totalRevenue, currencyCode)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Promedio */}
        <Card className="min-w-0 w-full">
          <CardContent className="p-2 sm:p-3 min-w-0">
            <div className="flex flex-col items-center gap-0.5 sm:gap-1 min-w-0 w-full">
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-[10px] sm:text-xs font-medium truncate">
                  Promedio
                </span>
              </div>
              <p className="text-sm sm:text-lg font-bold truncate w-full text-center">
                {formatCurrency(summaryStats.avgPerBuyer, currencyCode)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Pendientes */}
        <Card className="min-w-0 w-full">
          <CardContent className="p-2 sm:p-3 min-w-0">
            <div className="flex flex-col items-center gap-0.5 sm:gap-1 min-w-0 w-full">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-[10px] sm:text-xs font-medium truncate">
                  Pendientes
                </span>
              </div>
              <p className="text-sm sm:text-lg font-bold truncate w-full text-center">
                {summaryStats.pendingCount}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Confirmados */}
        <Card className="min-w-0 w-full">
          <CardContent className="p-2 sm:p-3 min-w-0">
            <div className="flex flex-col items-center gap-0.5 sm:gap-1 min-w-0 w-full">
              <div className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-[10px] sm:text-xs font-medium truncate">
                  Confirmados
                </span>
              </div>
              <p className="text-sm sm:text-lg font-bold truncate w-full text-center">
                {summaryStats.confirmedCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Compradores ({totalCount})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={totalCount === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="sold">Confirmados</SelectItem>
                <SelectItem value="reserved">Pendientes</SelectItem>
                <SelectItem value="canceled">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cityFilter} onValueChange={(value) => {
              setCityFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las ciudades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ciudades</SelectItem>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mobile: Cards List */}
          <div className="block md:hidden space-y-3">
            {buyers.map((buyer) => (
              <Card key={buyer.id} className="overflow-hidden">
                <CardContent className="p-3 space-y-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{buyer.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{buyer.city}</p>
                    </div>
                    {getStatusBadge(buyer.status)}
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Boletos:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {buyer.tickets.slice(0, 3).map((ticket, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[10px] px-1">
                            {ticket}
                          </Badge>
                        ))}
                        {buyer.tickets.length > 3 && (
                          <Badge variant="secondary" className="text-[10px] px-1">
                            +{buyer.tickets.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <p className="font-semibold">{formatCurrency(buyer.orderTotal || 0, currencyCode)}</p>
                    </div>
                  </div>

                  {/* Contact */}
                  {(buyer.email || buyer.phone) && (
                    <div className="space-y-1 text-xs pt-2 border-t">
                      {buyer.email && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{buyer.email}</span>
                        </div>
                      )}
                      {buyer.phone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span>{buyer.phone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBuyer(buyer)}
                      className="flex-1 text-xs h-7"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                    {buyer.phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWhatsApp(buyer.phone!, buyer.name)}
                        className="flex-1 text-xs h-7"
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        WhatsApp
                      </Button>
                    )}
                    {buyer.email && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEmail(buyer.email!, buyer.name)}
                        className="flex-1 text-xs h-7"
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Boletos</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buyers.map((buyer) => (
                  <TableRow key={buyer.id}>
                    <TableCell className="font-medium">{buyer.name}</TableCell>
                    <TableCell>{buyer.city}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {buyer.email && (
                          <div className="flex items-center gap-1 text-xs">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{buyer.email}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyEmail(buyer.email!)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {buyer.phone && (
                          <div className="flex items-center gap-1 text-xs">
                            <Phone className="h-3 w-3" />
                            <span>{buyer.phone}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyPhone(buyer.phone!)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {buyer.tickets.slice(0, 5).map((ticket, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {ticket}
                          </Badge>
                        ))}
                        {buyer.tickets.length > 5 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-xs cursor-help">
                                  +{buyer.tickets.length - 5}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="grid grid-cols-5 gap-1 max-w-xs">
                                  {buyer.tickets.slice(5).map((ticket, idx) => (
                                    <span key={idx} className="text-xs">{ticket}</span>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(buyer.orderTotal || 0, currencyCode)}
                    </TableCell>
                    <TableCell>{getPaymentMethodLabel(buyer.paymentMethod)}</TableCell>
                    <TableCell>
                      {buyer.paymentReference ? (
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {buyer.paymentReference}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(buyer.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBuyer(buyer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {buyer.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleWhatsApp(buyer.phone!, buyer.name)}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {buyer.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEmail(buyer.email!, buyer.name)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Empty State */}
          {buyers.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || cityFilter !== 'all'
                  ? 'No se encontraron compradores con los filtros aplicados'
                  : 'Aún no hay compradores registrados'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
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
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      {selectedBuyer && (
        <TicketDetailDialog
          open={!!selectedBuyer}
          onOpenChange={(open) => !open && setSelectedBuyer(null)}
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
            draw_date: drawDate,
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
  );
}
