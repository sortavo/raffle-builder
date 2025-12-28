import { supabase } from '@/integrations/supabase/client';

const BATCH_SIZE = 1000;

// Helper to fetch sold tickets in batches to avoid Supabase row limit
async function fetchSoldTicketsInBatches(raffleId: string): Promise<any[]> {
  const allTickets: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('raffle_id', raffleId)
      .eq('status', 'sold')
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

export async function exportBuyersToCSV(
  raffleId: string, 
  raffleName?: string,
  onProgress?: (loaded: number, total: number) => void
) {
  // 1. Get total count first for progress tracking
  const { count: totalCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('raffle_id', raffleId)
    .eq('status', 'sold');

  // 2. Query all sold tickets in batches
  const tickets = await fetchSoldTicketsInBatches(raffleId);
  
  if (onProgress) {
    onProgress(tickets.length, totalCount || tickets.length);
  }
  
  // 3. Create CSV headers
  const headers = [
    'Boleto',
    'Nombre',
    'Email',
    'Teléfono',
    'Ciudad',
    'Método de Pago',
    'Referencia de Pago',
    'Fecha de Compra'
  ];
  
  // 4. Convert data to CSV rows
  const rows = tickets.map(ticket => [
    ticket.ticket_number,
    ticket.buyer_name || '',
    ticket.buyer_email || '',
    ticket.buyer_phone || '',
    ticket.buyer_city || '',
    ticket.payment_method || '',
    ticket.payment_reference || '',
    ticket.sold_at ? new Date(ticket.sold_at).toLocaleString('es-MX') : ''
  ]);
  
  // 5. Generate CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  // 6. Add BOM for proper Excel encoding
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // 7. Trigger download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const fileName = raffleName 
    ? `compradores-${raffleName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.csv`
    : `compradores-${raffleId.slice(0, 8)}-${Date.now()}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return { success: true, count: tickets.length };
}
