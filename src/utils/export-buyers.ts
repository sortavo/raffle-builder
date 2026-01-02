import { supabase } from '@/integrations/supabase/client';

const BATCH_SIZE = 1000;
const SERVER_EXPORT_THRESHOLD = 50000;

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  sold: 'Vendido',
  canceled: 'Cancelado',
};

// Server-side export for large datasets
async function exportBuyersViaServer(
  raffleId: string,
  raffleName?: string,
  statusFilter?: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ success: boolean; count: number }> {
  if (import.meta.env.DEV) console.log('Using server-side buyer export');

  const { data, error } = await supabase.functions.invoke('export-buyers-csv', {
    body: { 
      raffle_id: raffleId,
      status_filter: statusFilter || null
    },
  });

  if (error) throw error;

  // The edge function returns the CSV directly as text
  const csvContent = typeof data === 'string' ? data : await data.text?.() || JSON.stringify(data);
  
  // Count rows (minus header)
  const rowCount = csvContent.split('\n').length - 1;
  
  if (onProgress) {
    onProgress(rowCount, rowCount);
  }

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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

  return { success: true, count: rowCount };
}

// Client-side export for smaller datasets
async function exportBuyersClientSide(
  raffleId: string,
  raffleName?: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ success: boolean; count: number }> {
  if (import.meta.env.DEV) console.log('Using client-side buyer export');

  // Get total count first
  const { data: firstPage } = await supabase.rpc('get_buyers_paginated', {
    p_raffle_id: raffleId,
    p_status: null,
    p_city: null,
    p_search: null,
    p_start_date: null,
    p_end_date: null,
    p_page: 1,
    p_page_size: 1,
  });

  const totalCount = firstPage && firstPage.length > 0 ? Number(firstPage[0].total_count) : 0;

  if (totalCount === 0) {
    return { success: true, count: 0 };
  }

  // Fetch all buyers in batches
  const allBuyers: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase.rpc('get_buyers_paginated', {
      p_raffle_id: raffleId,
      p_status: null,
      p_city: null,
      p_search: null,
      p_start_date: null,
      p_end_date: null,
      p_page: page,
      p_page_size: BATCH_SIZE,
    });

    if (error) throw error;

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allBuyers.push(...data);
      
      if (onProgress) {
        onProgress(allBuyers.length, totalCount);
      }

      if (data.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  // Create CSV headers
  const headers = ['Nombre', 'Email', 'Teléfono', 'Ciudad', 'Boletos', 'Cantidad', 'Estado', 'Fecha'];

  // Convert data to CSV rows
  const rows = allBuyers.map(buyer => [
    buyer.buyer_name || '',
    buyer.buyer_email || '',
    buyer.buyer_phone || '',
    buyer.buyer_city || '',
    (buyer.ticket_numbers || []).join('; '),
    String(buyer.ticket_count || 0),
    STATUS_LABELS[buyer.status] || buyer.status || '',
    buyer.first_reserved_at ? new Date(buyer.first_reserved_at).toLocaleString('es-MX') : '',
  ]);

  // Generate CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Add BOM for proper Excel encoding
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Trigger download
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

  return { success: true, count: allBuyers.length };
}

// Main export function - chooses strategy based on count
export async function exportBuyersToCSV(
  raffleId: string,
  raffleName?: string,
  onProgress?: (loaded: number, total: number) => void
) {
  // Get total count to decide export strategy
  const { data: firstPage } = await supabase.rpc('get_buyers_paginated', {
    p_raffle_id: raffleId,
    p_status: null,
    p_city: null,
    p_search: null,
    p_start_date: null,
    p_end_date: null,
    p_page: 1,
    p_page_size: 1,
  });

  const totalCount = firstPage && firstPage.length > 0 ? Number(firstPage[0].total_count) : 0;

  if (import.meta.env.DEV) console.log(`Buyer count: ${totalCount}, threshold: ${SERVER_EXPORT_THRESHOLD}`);

  if (totalCount >= SERVER_EXPORT_THRESHOLD) {
    return exportBuyersViaServer(raffleId, raffleName, undefined, onProgress);
  } else {
    return exportBuyersClientSide(raffleId, raffleName, onProgress);
  }
}
