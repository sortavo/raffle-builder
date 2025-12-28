import { supabase } from '@/integrations/supabase/client';

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  sold: 'Vendido',
  canceled: 'Cancelado'
};

const BATCH_SIZE = 1000;

type TicketStatus = 'available' | 'reserved' | 'sold' | 'canceled';

// Helper to fetch all tickets in batches to avoid Supabase row limit
async function fetchAllTicketsInBatches(
  raffleId: string, 
  statusFilter?: TicketStatus | TicketStatus[]
): Promise<any[]> {
  const allTickets: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('tickets')
      .select('*')
      .eq('raffle_id', raffleId)
      .order('ticket_number', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (statusFilter) {
      if (Array.isArray(statusFilter)) {
        query = query.in('status', statusFilter);
      } else {
        query = query.eq('status', statusFilter);
      }
    }

    const { data, error } = await query;
    
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

export async function exportTicketsToCSV(
  raffleId: string, 
  raffleName?: string,
  onProgress?: (loaded: number, total: number) => void
) {
  // 1. Get total count first for progress tracking
  const { count: totalCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('raffle_id', raffleId);

  // 2. Query ALL tickets in batches
  const tickets = await fetchAllTicketsInBatches(raffleId);
  
  if (onProgress) {
    onProgress(tickets.length, totalCount || tickets.length);
  }
  
  // 3. Headers
  const headers = [
    'Número de Boleto',
    'Estado',
    'Comprador',
    'Email',
    'Teléfono',
    'Ciudad',
    'Fecha de Compra'
  ];
  
  // 4. Map data
  const rows = tickets.map(ticket => [
    ticket.ticket_number,
    STATUS_LABELS[ticket.status || 'available'] || ticket.status,
    ticket.buyer_name || '-',
    ticket.buyer_email || '-',
    ticket.buyer_phone || '-',
    ticket.buyer_city || '-',
    ticket.sold_at ? new Date(ticket.sold_at).toLocaleDateString('es-MX') : '-'
  ]);
  
  // 5. Generate CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // 6. Download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const fileName = raffleName 
    ? `boletos-${raffleName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.csv`
    : `boletos-${raffleId.slice(0, 8)}-${Date.now()}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return { success: true, count: tickets.length };
}

// Export helper for other modules
export { fetchAllTicketsInBatches };
