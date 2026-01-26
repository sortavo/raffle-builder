import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Users, 
  Ticket,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { exportBuyersToCSV } from '@/utils/export-buyers';
import { exportTicketsToCSV } from '@/utils/export-tickets';
import { exportTransactionsToExcel } from '@/utils/export-transactions';
import { exportFinancialReportPDF } from '@/utils/export-financial-pdf';

interface ExportMenuProps {
  raffleId: string;
  raffleName: string;
}

type ExportType = 'buyers' | 'tickets' | 'transactions' | 'financial';

const LARGE_DATASET_THRESHOLD = 500000; // 500K

export function ExportMenu({ raffleId, raffleName }: ExportMenuProps) {
  const [loading, setLoading] = useState<ExportType | null>(null);
  const [ticketCount, setTicketCount] = useState<number | null>(null);
  const [buyerCount, setBuyerCount] = useState<number | null>(null);

  // Fetch counts on mount to determine export strategy
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Get ticket count from orders table
        const { data: ordersData } = await supabase
          .from('orders')
          .select('ticket_count')
          .eq('raffle_id', raffleId);
        
        const tickets = ordersData?.reduce((sum, o) => sum + (o.ticket_count || 0), 0) || 0;
        setTicketCount(tickets);

        // Get buyer count directly from orders
        const { count: buyerCountResult } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('raffle_id', raffleId)
          .not('buyer_name', 'is', null);

        setBuyerCount(buyerCountResult || 0);
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };

    fetchCounts();
  }, [raffleId]);

  const isLargeDataset = (ticketCount || 0) >= LARGE_DATASET_THRESHOLD;

  const handleExport = async (type: ExportType) => {
    setLoading(type);
    
    try {
      switch (type) {
        case 'buyers':
          const buyersResult = await exportBuyersToCSV(raffleId, raffleName);
          toast.success(`Exportados ${buyersResult.count.toLocaleString()} compradores`);
          break;
        
        case 'tickets':
          const ticketsResult = await exportTicketsToCSV(raffleId, raffleName);
          toast.success(`Exportados ${ticketsResult.count.toLocaleString()} boletos`);
          break;
        
        case 'transactions':
          const transResult = await exportTransactionsToExcel(raffleId, raffleName);
          toast.success(`Exportadas ${transResult.count.toLocaleString()} transacciones`);
          break;
        
        case 'financial':
          await exportFinancialReportPDF(raffleId, raffleName);
          toast.success('Reporte financiero generado');
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error al exportar datos');
    } finally {
      setLoading(null);
    }
  };

  const getEstimatedTime = (count: number | null): string => {
    if (!count) return '';
    if (count < 50000) return '';
    if (count < 500000) return '~1-2 min';
    if (count < 1000000) return '~2-5 min';
    return '~5+ min';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="hidden xl:inline">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {isLargeDataset && (
          <>
            <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Rifa grande: {ticketCount?.toLocaleString()} boletos
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem 
          onClick={() => handleExport('buyers')}
          disabled={loading !== null}
        >
          <Users className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Exportar Compradores (CSV)</span>
            {buyerCount && buyerCount >= 50000 && (
              <span className="text-xs text-muted-foreground">
                {buyerCount.toLocaleString()} registros {getEstimatedTime(buyerCount)}
              </span>
            )}
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleExport('tickets')}
          disabled={loading !== null}
        >
          <Ticket className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Exportar Boletos (CSV)</span>
            {ticketCount && ticketCount >= 50000 && (
              <span className="text-xs text-muted-foreground">
                {ticketCount.toLocaleString()} registros {getEstimatedTime(ticketCount)}
              </span>
            )}
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => handleExport('transactions')}
          disabled={loading !== null || isLargeDataset}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Exportar Transacciones (Excel)</span>
            {isLargeDataset && (
              <span className="text-xs text-muted-foreground">
                No disponible para rifas grandes
              </span>
            )}
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleExport('financial')}
          disabled={loading !== null}
        >
          <FileText className="h-4 w-4 mr-2" />
          <span>Reporte Financiero (PDF)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
