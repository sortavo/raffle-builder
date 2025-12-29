import { supabase } from '@/integrations/supabase/client';

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  sold: 'Vendido',
  canceled: 'Cancelado'
};

const BATCH_SIZE = 1000;
const SERVER_EXPORT_THRESHOLD = 50000; // Use server export for 50k+ tickets

type TicketStatus = 'available' | 'reserved' | 'sold' | 'canceled';

// Helper to fetch all tickets in batches (for small raffles)
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

// Server-side export for large raffles
async function exportTicketsViaServer(
  raffleId: string,
  raffleName?: string,
  statusFilter?: TicketStatus | TicketStatus[],
  onProgress?: (loaded: number, total: number) => void
): Promise<{ success: boolean; count: number }> {
  const { data, error } = await supabase.functions.invoke('export-tickets-csv', {
    body: { 
      raffle_id: raffleId,
      status_filter: statusFilter 
    }
  });

  if (error) {
    console.error('Server export error:', error);
    throw new Error('Error al exportar boletos desde el servidor');
  }

  // The response is the CSV content directly
  const csvContent = typeof data === 'string' ? data : await data.text?.() || data;
  
  // Get count from response or estimate
  const lineCount = csvContent.split('\n').length - 1; // -1 for header
  
  if (onProgress) {
    onProgress(lineCount, lineCount);
  }

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
  
  return { success: true, count: lineCount };
}

// Client-side export for small raffles
async function exportTicketsClientSide(
  raffleId: string,
  raffleName?: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ success: boolean; count: number }> {
  // Get total count first for progress tracking
  const { count: totalCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('raffle_id', raffleId);

  // Query ALL tickets in batches
  const tickets = await fetchAllTicketsInBatches(raffleId);
  
  if (onProgress) {
    onProgress(tickets.length, totalCount || tickets.length);
  }
  
  // Headers
  const headers = [
    'Número de Boleto',
    'Estado',
    'Comprador',
    'Email',
    'Teléfono',
    'Ciudad',
    'Fecha de Compra'
  ];
  
  // Map data
  const rows = tickets.map(ticket => [
    ticket.ticket_number,
    STATUS_LABELS[ticket.status || 'available'] || ticket.status,
    ticket.buyer_name || '-',
    ticket.buyer_email || '-',
    ticket.buyer_phone || '-',
    ticket.buyer_city || '-',
    ticket.sold_at ? new Date(ticket.sold_at).toLocaleDateString('es-MX') : '-'
  ]);
  
  // Generate CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Download
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

export async function exportTicketsToCSV(
  raffleId: string, 
  raffleName?: string,
  onProgress?: (loaded: number, total: number) => void
) {
  // Check total ticket count to decide export method
  const { count: totalCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('raffle_id', raffleId);

  const ticketCount = totalCount || 0;
  
  console.log(`Export method: ${ticketCount >= SERVER_EXPORT_THRESHOLD ? 'server' : 'client'} (${ticketCount} tickets)`);

  if (ticketCount >= SERVER_EXPORT_THRESHOLD) {
    // Use server-side export for large raffles
    return exportTicketsViaServer(raffleId, raffleName, undefined, onProgress);
  } else {
    // Use client-side export for small raffles
    return exportTicketsClientSide(raffleId, raffleName, onProgress);
  }
}

// Export helper for other modules
export { fetchAllTicketsInBatches };
