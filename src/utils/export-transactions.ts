import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  sold: 'Confirmado',
  canceled: 'Cancelado'
};

export async function exportTransactionsToExcel(
  raffleId: string, 
  raffleName: string,
  onProgress?: (loaded: number, total: number) => void
) {
  // Get raffle info for pricing
  const { data: raffle } = await supabase
    .from('raffles')
    .select('ticket_price, currency_code')
    .eq('id', raffleId)
    .single();
  
  const ticketPrice = raffle?.ticket_price || 0;

  // Query orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('raffle_id', raffleId)
    .in('status', ['sold', 'reserved'])
    .order('sold_at', { ascending: true });
  
  if (error) throw error;

  if (onProgress) {
    onProgress(orders?.length || 0, orders?.length || 0);
  }
  
  // Prepare data for Excel - one row per order
  const transactions = (orders || []).map(order => ({
    'Referencia': order.reference_code || '',
    'Boletos': order.ticket_count,
    'Comprador': order.buyer_name || '',
    'Email': order.buyer_email || '',
    'Teléfono': order.buyer_phone || '',
    'Ciudad': order.buyer_city || '',
    'Estado': STATUS_LABELS[order.status || 'available'] || order.status,
    'Monto': order.order_total || (order.ticket_count * ticketPrice),
    'Método': order.payment_method || '',
    'Fecha Reserva': order.reserved_at ? new Date(order.reserved_at).toLocaleString('es-MX') : '',
    'Fecha Venta': order.sold_at ? new Date(order.sold_at).toLocaleString('es-MX') : ''
  }));
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Create main sheet
  const ws = XLSX.utils.json_to_sheet(transactions);
  
  // Set column widths
  const colWidths = [
    { wch: 15 }, // Referencia
    { wch: 10 }, // Boletos
    { wch: 25 }, // Comprador
    { wch: 30 }, // Email
    { wch: 15 }, // Teléfono
    { wch: 20 }, // Ciudad
    { wch: 12 }, // Estado
    { wch: 12 }, // Monto
    { wch: 20 }, // Método
    { wch: 20 }, // Fecha Reserva
    { wch: 20 }, // Fecha Venta
  ];
  ws['!cols'] = colWidths;
  
  // Add summary sheet
  const soldOrders = (orders || []).filter(o => o.status === 'sold');
  const reservedOrders = (orders || []).filter(o => o.status === 'reserved');
  const totalTicketsSold = soldOrders.reduce((sum, o) => sum + (o.ticket_count || 0), 0);
  const totalTicketsReserved = reservedOrders.reduce((sum, o) => sum + (o.ticket_count || 0), 0);
  const totalRevenue = soldOrders.reduce((sum, o) => sum + (o.order_total || 0), 0);
  
  const summary = [
    { 'Métrica': 'Total Boletos Vendidos', 'Valor': totalTicketsSold },
    { 'Métrica': 'Total Boletos Reservados', 'Valor': totalTicketsReserved },
    { 'Métrica': 'Órdenes Vendidas', 'Valor': soldOrders.length },
    { 'Métrica': 'Ingresos Totales', 'Valor': `$${totalRevenue.toLocaleString('es-MX')}` },
    { 'Métrica': 'Precio por Boleto', 'Valor': `$${ticketPrice.toLocaleString('es-MX')}` },
  ];
  
  const summaryWs = XLSX.utils.json_to_sheet(summary);
  summaryWs['!cols'] = [{ wch: 30 }, { wch: 20 }];
  
  // Add sheets to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
  
  // Generate file
  const fileName = `transacciones-${raffleName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  return { success: true, count: orders?.length || 0 };
}
