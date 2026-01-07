import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  sold: 'Confirmado',
  canceled: 'Cancelado'
};

const BATCH_SIZE = 1000;

// Helper to fetch transaction tickets in batches to avoid Supabase row limit
async function fetchTransactionTicketsInBatches(raffleId: string): Promise<any[]> {
  const allTickets: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('sold_tickets')
      .select('*')
      .eq('raffle_id', raffleId)
      .in('status', ['sold', 'reserved'])
      .order('sold_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      allTickets.push(...data);
      offset += BATCH_SIZE;
      hasMore = data.length === BATCH_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allTickets;
}

export async function exportTransactionsToExcel(
  raffleId: string, 
  raffleName: string,
  onProgress?: (loaded: number, total: number) => void
) {
  // 1. Get total count first for progress tracking
  const { count: totalCount } = await supabase
    .from('sold_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('raffle_id', raffleId)
    .in('status', ['sold', 'reserved']);

  // 2. Query transactions in batches
  const tickets = await fetchTransactionTicketsInBatches(raffleId);
  
  if (onProgress) {
    onProgress(tickets.length, totalCount || tickets.length);
  }
  
  // 3. Get raffle info for pricing
  const { data: raffle } = await supabase
    .from('raffles')
    .select('ticket_price, currency_code')
    .eq('id', raffleId)
    .single();
  
  const ticketPrice = raffle?.ticket_price || 0;
  
  // 4. Prepare data for Excel
  const transactions = tickets.map(ticket => ({
    'Boleto': ticket.ticket_number,
    'Comprador': ticket.buyer_name || '',
    'Email': ticket.buyer_email || '',
    'Teléfono': ticket.buyer_phone || '',
    'Ciudad': ticket.buyer_city || '',
    'Estado': STATUS_LABELS[ticket.status || 'available'] || ticket.status,
    'Monto': ticketPrice,
    'Método': ticket.payment_method || '',
    'Referencia': ticket.payment_reference || '',
    'Fecha Reserva': ticket.reserved_at ? new Date(ticket.reserved_at).toLocaleString('es-MX') : '',
    'Fecha Venta': ticket.sold_at ? new Date(ticket.sold_at).toLocaleString('es-MX') : ''
  }));
  
  // 5. Create workbook
  const wb = XLSX.utils.book_new();
  
  // 6. Create main sheet
  const ws = XLSX.utils.json_to_sheet(transactions);
  
  // 7. Set column widths
  const colWidths = [
    { wch: 12 }, // Boleto
    { wch: 25 }, // Comprador
    { wch: 30 }, // Email
    { wch: 15 }, // Teléfono
    { wch: 20 }, // Ciudad
    { wch: 12 }, // Estado
    { wch: 12 }, // Monto
    { wch: 20 }, // Método
    { wch: 20 }, // Referencia
    { wch: 20 }, // Fecha Reserva
    { wch: 20 }, // Fecha Venta
  ];
  ws['!cols'] = colWidths;
  
  // 8. Add summary sheet
  const soldTickets = tickets.filter(t => t.status === 'sold');
  const reservedTickets = tickets.filter(t => t.status === 'reserved');
  const totalRevenue = soldTickets.length * ticketPrice;
  
  const summary = [
    { 'Métrica': 'Total Boletos Vendidos', 'Valor': soldTickets.length },
    { 'Métrica': 'Total Boletos Reservados', 'Valor': reservedTickets.length },
    { 'Métrica': 'Ingresos Totales', 'Valor': `$${totalRevenue.toLocaleString('es-MX')}` },
    { 'Métrica': 'Precio por Boleto', 'Valor': `$${ticketPrice.toLocaleString('es-MX')}` },
  ];
  
  const summaryWs = XLSX.utils.json_to_sheet(summary);
  summaryWs['!cols'] = [{ wch: 30 }, { wch: 20 }];
  
  // 9. Add sheets to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
  
  // 10. Generate file
  const fileName = `transacciones-${raffleName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  return { success: true, count: tickets.length };
}
