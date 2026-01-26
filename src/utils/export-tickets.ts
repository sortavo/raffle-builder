import { supabase } from '@/integrations/supabase/client';

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  sold: 'Vendido',
  canceled: 'Cancelado'
};

const SERVER_EXPORT_THRESHOLD = 50000; // Use server export for 50k+ tickets

type TicketStatus = 'available' | 'reserved' | 'sold' | 'canceled';

// Server-side export for large raffles using the compatibility view
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

// Client-side export using orders table
async function exportTicketsClientSide(
  raffleId: string,
  raffleName?: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ success: boolean; count: number }> {
  // Get raffle info for numbering
  const { data: raffle } = await supabase
    .from('raffles')
    .select('total_tickets, numbering_config')
    .eq('id', raffleId)
    .single();

  // Get all orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('ticket_ranges, lucky_indices, status, buyer_name, buyer_email, buyer_phone, buyer_city, sold_at')
    .eq('raffle_id', raffleId)
    .in('status', ['reserved', 'sold']);

  if (error) throw error;

  // Expand orders to individual tickets
  const tickets: { 
    ticket_number: string; 
    status: string; 
    buyer_name: string | null;
    buyer_email: string | null;
    buyer_phone: string | null;
    buyer_city: string | null;
    sold_at: string | null;
  }[] = [];

  for (const order of orders || []) {
    const ranges = order.ticket_ranges as { s: number; e: number }[] || [];
    for (const range of ranges) {
      for (let i = range.s; i <= range.e; i++) {
        tickets.push({
          ticket_number: String(i).padStart(String(raffle?.total_tickets || 1).length, '0'),
          status: order.status,
          buyer_name: order.buyer_name,
          buyer_email: order.buyer_email,
          buyer_phone: order.buyer_phone,
          buyer_city: order.buyer_city,
          sold_at: order.sold_at,
        });
      }
    }
    // Add lucky indices
    for (const idx of order.lucky_indices || []) {
      tickets.push({
        ticket_number: String(idx).padStart(String(raffle?.total_tickets || 1).length, '0'),
        status: order.status,
        buyer_name: order.buyer_name,
        buyer_email: order.buyer_email,
        buyer_phone: order.buyer_phone,
        buyer_city: order.buyer_city,
        sold_at: order.sold_at,
      });
    }
  }

  if (onProgress) {
    onProgress(tickets.length, tickets.length);
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
  const { data } = await supabase.rpc('get_virtual_ticket_counts', {
    p_raffle_id: raffleId
  });

  const ticketCount = (data as { total_count: number }[] | null)?.[0]?.total_count || 0;
  
  if (import.meta.env.DEV) console.log(`Export method: ${ticketCount >= SERVER_EXPORT_THRESHOLD ? 'server' : 'client'} (${ticketCount} tickets)`);

  if (ticketCount >= SERVER_EXPORT_THRESHOLD) {
    // Use server-side export for large raffles
    return exportTicketsViaServer(raffleId, raffleName, undefined, onProgress);
  } else {
    // Use client-side export for small raffles
    return exportTicketsClientSide(raffleId, raffleName, onProgress);
  }
}
