// C2 Security: Migrated from xlsx (CVE prototype pollution, no fix available) to ExcelJS
import ExcelJS from 'exceljs';
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

  // Create workbook with ExcelJS
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sortavo';
  workbook.created = new Date();

  // Create transactions sheet
  const transactionsSheet = workbook.addWorksheet('Transacciones');

  // Define columns with headers and widths
  transactionsSheet.columns = [
    { header: 'Referencia', key: 'referencia', width: 15 },
    { header: 'Boletos', key: 'boletos', width: 10 },
    { header: 'Comprador', key: 'comprador', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Teléfono', key: 'telefono', width: 15 },
    { header: 'Ciudad', key: 'ciudad', width: 20 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Monto', key: 'monto', width: 12 },
    { header: 'Método', key: 'metodo', width: 20 },
    { header: 'Fecha Reserva', key: 'fechaReserva', width: 20 },
    { header: 'Fecha Venta', key: 'fechaVenta', width: 20 },
  ];

  // Style header row
  transactionsSheet.getRow(1).font = { bold: true };
  transactionsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Add data rows
  (orders || []).forEach(order => {
    transactionsSheet.addRow({
      referencia: order.reference_code || '',
      boletos: order.ticket_count,
      comprador: order.buyer_name || '',
      email: order.buyer_email || '',
      telefono: order.buyer_phone || '',
      ciudad: order.buyer_city || '',
      estado: STATUS_LABELS[order.status || 'available'] || order.status,
      monto: order.order_total || (order.ticket_count * ticketPrice),
      metodo: order.payment_method || '',
      fechaReserva: order.reserved_at ? new Date(order.reserved_at).toLocaleString('es-MX') : '',
      fechaVenta: order.sold_at ? new Date(order.sold_at).toLocaleString('es-MX') : ''
    });
  });

  // Create summary sheet
  const summarySheet = workbook.addWorksheet('Resumen');
  summarySheet.columns = [
    { header: 'Métrica', key: 'metrica', width: 30 },
    { header: 'Valor', key: 'valor', width: 20 },
  ];

  // Style header row
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Calculate summary data
  const soldOrders = (orders || []).filter(o => o.status === 'sold');
  const reservedOrders = (orders || []).filter(o => o.status === 'reserved');
  const totalTicketsSold = soldOrders.reduce((sum, o) => sum + (o.ticket_count || 0), 0);
  const totalTicketsReserved = reservedOrders.reduce((sum, o) => sum + (o.ticket_count || 0), 0);
  const totalRevenue = soldOrders.reduce((sum, o) => sum + (o.order_total || 0), 0);

  // Add summary rows
  summarySheet.addRow({ metrica: 'Total Boletos Vendidos', valor: totalTicketsSold });
  summarySheet.addRow({ metrica: 'Total Boletos Reservados', valor: totalTicketsReserved });
  summarySheet.addRow({ metrica: 'Órdenes Vendidas', valor: soldOrders.length });
  summarySheet.addRow({ metrica: 'Ingresos Totales', valor: `$${totalRevenue.toLocaleString('es-MX')}` });
  summarySheet.addRow({ metrica: 'Precio por Boleto', valor: `$${ticketPrice.toLocaleString('es-MX')}` });

  // Generate file and trigger download
  const fileName = `transacciones-${raffleName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.xlsx`;

  // Write to buffer and create blob for download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return { success: true, count: orders?.length || 0 };
}
