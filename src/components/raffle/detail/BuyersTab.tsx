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
import { useBuyers } from '@/hooks/useBuyers';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/EmptyState';

interface BuyersTabProps {
  raffleId: string;
}

const BUYERS_PER_PAGE = 20;

export function BuyersTab({ raffleId }: BuyersTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

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
          <div className="flex flex-col gap-3 sm:gap-4">
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
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[130px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sold">Vendidos</SelectItem>
                  <SelectItem value="reserved">Reservados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full sm:w-[130px]">
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
              <Button onClick={handleExport} variant="outline" size="sm" className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                <span className="sm:inline">Exportar</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buyers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Compradores ({buyersData?.count || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : buyers.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="No hay compradores aún"
              description="Cuando alguien compre boletos, aparecerán aquí con su información de contacto."
            />
          ) : (
            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <div className="inline-block min-w-full align-middle px-4 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="hidden sm:table-cell">Contacto</TableHead>
                      <TableHead>Boletos</TableHead>
                      <TableHead className="hidden md:table-cell">Estado</TableHead>
                      <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                      <TableHead className="hidden lg:table-cell">Ciudad</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {buyers.map((buyer) => (
                    <TableRow key={buyer.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{buyer.name || 'Sin nombre'}</p>
                          <p className="text-xs text-muted-foreground sm:hidden truncate">{buyer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="space-y-0.5">
                          {buyer.email && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
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
                        {getStatusBadge(buyer.status || 'unknown')}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {buyer.date ? format(new Date(buyer.date), 'dd MMM', { locale: es }) : '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {buyer.city || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {buyer.phone && (
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
                          )}
                          {buyer.email && (
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
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
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
    </div>
  );
}