import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';

// Use aggregated queries instead of loading all tickets
export async function exportFinancialReportPDF(raffleId: string, raffleName: string) {
  // 1. Get raffle info
  const { data: raffle } = await supabase
    .from('raffles')
    .select('*')
    .eq('id', raffleId)
    .single();

  if (!raffle) throw new Error('Raffle not found');

  // 2. Get aggregated ticket stats from orders table
  const { data: soldOrdersData } = await supabase
    .from('orders')
    .select('ticket_count, payment_method, buyer_city, order_total')
    .eq('raffle_id', raffleId)
    .eq('status', 'sold');

  const { data: reservedOrdersData } = await supabase
    .from('orders')
    .select('ticket_count')
    .eq('raffle_id', raffleId)
    .eq('status', 'reserved');

  const soldCount = soldOrdersData?.reduce((sum, o) => sum + (o.ticket_count || 0), 0) || 0;
  const reservedCount = reservedOrdersData?.reduce((sum, o) => sum + (o.ticket_count || 0), 0) || 0;

  // 3. Get payment method breakdown from orders
  const paymentMethods: Record<string, number> = {};
  soldOrdersData?.forEach(o => {
    if (o.payment_method) {
      const method = o.payment_method;
      paymentMethods[method] = (paymentMethods[method] || 0) + (o.ticket_count || 0);
    }
  });

  // 4. Get city breakdown from orders
  const cities: Record<string, number> = {};
  soldOrdersData?.forEach(o => {
    if (o.buyer_city) {
      const city = o.buyer_city;
      cities[city] = (cities[city] || 0) + (o.ticket_count || 0);
    }
  });

  // 5. Get top buyers using the paginated function (already aggregated)
  const { data: topBuyersData } = await supabase.rpc('get_buyers_paginated', {
    p_raffle_id: raffleId,
    p_status: 'sold',
    p_city: null,
    p_search: null,
    p_start_date: null,
    p_end_date: null,
    p_page: 1,
    p_page_size: 10, // Only top 10
  });

  // 6. Calculate metrics
  const ticketPrice = raffle.ticket_price || 0;
  const soldTickets = soldCount || 0;
  const totalTickets = raffle.total_tickets;
  const totalRevenue = soldTickets * ticketPrice;
  const availableTickets = totalTickets - soldTickets - (reservedCount || 0);
  const conversionRate = totalTickets > 0 ? (soldTickets / totalTickets) * 100 : 0;

  // 7. Create PDF
  const doc = new jsPDF();

  // 8. Header
  doc.setFontSize(20);
  doc.text('Reporte Financiero', 105, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.text(raffleName, 105, 30, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 105, 38, { align: 'center' });

  // 9. Summary Section
  doc.setFontSize(14);
  doc.text('Resumen Ejecutivo', 20, 55);

  const summaryData = [
    ['Ingresos Totales', `$${totalRevenue.toLocaleString('es-MX')}`],
    ['Boletos Vendidos', `${soldTickets.toLocaleString()} / ${totalTickets.toLocaleString()}`],
    ['Boletos Reservados', (reservedCount || 0).toLocaleString()],
    ['Boletos Disponibles', availableTickets.toLocaleString()],
    ['Tasa de Conversión', `${conversionRate.toFixed(1)}%`],
    ['Precio por Boleto', `$${ticketPrice.toLocaleString('es-MX')}`],
    ['Valor del Premio', `$${(raffle.prize_value || 0).toLocaleString('es-MX')}`],
  ];

  autoTable(doc, {
    startY: 60,
    head: [['Métrica', 'Valor']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] }
  });

  // 10. Payment Methods Section
  // @ts-ignore - jspdf-autotable adds this property
  let finalY = doc.lastAutoTable?.finalY || 60;

  if (Object.keys(paymentMethods).length > 0) {
    doc.setFontSize(14);
    doc.text('Métodos de Pago', 20, finalY + 15);

    const paymentData = Object.entries(paymentMethods)
      .sort(([, a], [, b]) => b - a)
      .map(([method, count]) => [
        method,
        count.toLocaleString(),
        soldTickets > 0 ? `${((count / soldTickets) * 100).toFixed(1)}%` : '0%'
      ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Método de Pago', 'Cantidad', 'Porcentaje']],
      body: paymentData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    // @ts-ignore
    finalY = doc.lastAutoTable?.finalY || finalY + 20;
  }

  // 11. Geographic Distribution
  if (Object.keys(cities).length > 0) {
    doc.setFontSize(14);
    doc.text('Distribución Geográfica', 20, finalY + 15);

    const cityDataSorted = Object.entries(cities)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([city, count]) => [
        city,
        count.toLocaleString(),
        soldTickets > 0 ? `${((count / soldTickets) * 100).toFixed(1)}%` : '0%'
      ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Ciudad', 'Boletos', 'Porcentaje']],
      body: cityDataSorted,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    // @ts-ignore
    finalY = doc.lastAutoTable?.finalY || finalY + 20;
  }

  // 12. Top Buyers (already aggregated from RPC)
  if (topBuyersData && topBuyersData.length > 0) {
    const topBuyers = topBuyersData
      .filter((b: any) => Number(b.ticket_count) > 1)
      .slice(0, 10);

    if (topBuyers.length > 0) {
      // Check if we need a new page
      if (finalY > 230) {
        doc.addPage();
        finalY = 10;
      }

      doc.setFontSize(14);
      doc.text('Top 10 Compradores', 20, finalY + 15);

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Nombre', 'Email', 'Boletos', 'Total']],
        body: topBuyers.map((b: any) => [
          b.buyer_name || 'Sin nombre',
          b.buyer_email || '-',
          String(b.ticket_count),
          `$${(Number(b.ticket_count) * ticketPrice).toLocaleString('es-MX')}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }
      });
    }
  }

  // 13. Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // 14. Save
  const fileName = `reporte-financiero-${raffleName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pdf`;
  doc.save(fileName);

  return { success: true };
}
