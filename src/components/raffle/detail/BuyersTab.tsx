import { useState } from 'react';
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
import { 
  Search, 
  Download,
  MessageCircle,
  Mail,
  ChevronLeft,
  ChevronRight,
  Users
} from 'lucide-react';
import { useBuyers, getWhatsAppLink, getMailtoLink, exportBuyers } from '@/hooks/useBuyers';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BuyersTabProps {
  raffleId: string;
}

const BUYERS_PER_PAGE = 20;

export function BuyersTab({ raffleId }: BuyersTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { useBuyersList, useCities } = useBuyers();
  
  const { data: buyersData, isLoading } = useBuyersList(raffleId, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    city: cityFilter !== 'all' ? cityFilter : undefined,
    search: searchQuery || undefined,
    page: currentPage,
    limit: BUYERS_PER_PAGE,
  });

  const { data: cities = [] } = useCities(raffleId);

  const buyers = buyersData?.data || [];
  const totalPages = Math.ceil((buyersData?.total || 0) / BUYERS_PER_PAGE);

  const handleExport = async () => {
    await exportBuyers(raffleId);
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
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sold">Vendidos</SelectItem>
                <SelectItem value="reserved">Reservados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[150px]">
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
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Buyers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Compradores ({buyersData?.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : buyers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay compradores registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Boleto(s)</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buyers.map((buyer) => (
                    <TableRow key={buyer.id}>
                      <TableCell className="font-medium">
                        {buyer.buyer_name || 'Sin nombre'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {buyer.buyer_email && (
                            <div className="text-sm text-muted-foreground">
                              {buyer.buyer_email}
                            </div>
                          )}
                          {buyer.buyer_phone && (
                            <div className="text-sm text-muted-foreground">
                              {buyer.buyer_phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          #{buyer.ticket_number}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(buyer.status || 'unknown')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {buyer.sold_at ? format(new Date(buyer.sold_at), 'dd MMM yyyy', { locale: es }) : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {buyer.buyer_city || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {buyer.buyer_phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a 
                                href={getWhatsAppLink(buyer.buyer_phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              </a>
                            </Button>
                          )}
                          {buyer.buyer_email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a href={getMailtoLink(buyer.buyer_email)}>
                                <Mail className="h-4 w-4 text-blue-600" />
                              </a>
                            </Button>
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
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
