import { useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency-utils';
import { useToast } from '@/hooks/use-toast';

export interface OrderTicketData {
  id: string;
  ticket_number: string;
  ticket_index?: number;
  status: string;
  reserved_at: string | null;
  sold_at: string | null;
  payment_reference: string | null;
  order_total: number | null;
  payment_method?: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_city: string | null;
}

export interface OrderRaffleData {
  id?: string;
  title: string;
  slug: string;
  prize_name: string;
  draw_date: string | null;
  ticket_price: number;
  currency_code: string | null;
}

export interface OrderOrganizationData {
  name: string;
  logo_url?: string | null;
  whatsapp_number?: string | null;
}

export interface OrderReceiptData {
  tickets: OrderTicketData[];
  raffle: OrderRaffleData;
  organization?: OrderOrganizationData | null;
}

// Generate QR code as data URL
async function generateQRDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'H',
  });
}

// Get order status based on ticket statuses
function getOrderStatus(tickets: OrderTicketData[]): { label: string; allConfirmed: boolean } {
  const confirmedCount = tickets.filter(t => t.status === 'sold').length;
  const allConfirmed = confirmedCount === tickets.length;
  
  if (allConfirmed) {
    return { label: 'CONFIRMADO', allConfirmed: true };
  } else if (confirmedCount > 0) {
    return { label: 'PARCIALMENTE CONFIRMADO', allConfirmed: false };
  }
  return { label: 'PENDIENTE', allConfirmed: false };
}

export function useOrderReceipt() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateOrderReceipt = useCallback(async (data: OrderReceiptData): Promise<void> => {
    if (data.tickets.length === 0) {
      toast({
        title: 'Error',
        description: 'No hay boletos para generar el comprobante',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Dynamic import to reduce initial bundle size
      const jsPDF = (await import('jspdf')).default;
      
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      
      // Get order info from first ticket
      const firstTicket = data.tickets[0];
      const referenceCode = firstTicket.payment_reference || 'N/A';
      const orderStatus = getOrderStatus(data.tickets);
      const orderTotal = firstTicket.order_total || (data.tickets.length * data.raffle.ticket_price);
      const currency = data.raffle.currency_code || 'MXN';
      
      // Sort tickets by ticket_index or ticket_number
      const sortedTickets = [...data.tickets].sort((a, b) => {
        if (a.ticket_index !== undefined && b.ticket_index !== undefined) {
          return a.ticket_index - b.ticket_index;
        }
        return a.ticket_number.localeCompare(b.ticket_number, undefined, { numeric: true });
      });
      
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'https://sortavo.com';
      const verificationUrl = `${baseUrl}/order/${referenceCode}`;

      // ===== PAGE 1: SUMMARY =====
      let y = margin;

      // Header with organization name
      const orgName = data.organization?.name || 'SORTAVO';
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(orgName.toUpperCase(), margin, y + 6);
      
      // Status badge
      pdf.setFontSize(10);
      const statusWidth = pdf.getTextWidth(orderStatus.label) + 8;
      const statusX = pageWidth - margin - statusWidth;
      pdf.setFillColor(orderStatus.allConfirmed ? 34 : 234, orderStatus.allConfirmed ? 197 : 179, orderStatus.allConfirmed ? 94 : 8);
      pdf.roundedRect(statusX, y - 2, statusWidth, 10, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.text(orderStatus.label, statusX + 4, y + 5);
      pdf.setTextColor(0, 0, 0);
      
      y += 20;
      
      // Separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Raffle info section
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SORTEO', margin, y);
      y += 6;
      pdf.setFontSize(14);
      pdf.text(data.raffle.title, margin, y);
      y += 7;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`PREMIO: ${data.raffle.prize_name}`, margin, y);
      pdf.setTextColor(0, 0, 0);
      
      if (data.raffle.draw_date) {
        y += 5;
        const drawDate = format(new Date(data.raffle.draw_date), "dd 'de' MMMM yyyy, HH:mm", { locale: es });
        pdf.text(`FECHA DEL SORTEO: ${drawDate}`, margin, y);
      }
      
      y += 12;
      
      // Separator line
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Buyer details section
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DATOS DEL COMPRADOR', margin, y);
      y += 7;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const buyerDetails: string[] = [];
      if (firstTicket.buyer_name) buyerDetails.push(`Nombre: ${firstTicket.buyer_name}`);
      if (firstTicket.buyer_email) buyerDetails.push(`Email: ${firstTicket.buyer_email}`);
      if (firstTicket.buyer_phone) buyerDetails.push(`Teléfono: ${firstTicket.buyer_phone}`);
      if (firstTicket.buyer_city) buyerDetails.push(`Ciudad: ${firstTicket.buyer_city}`);
      
      buyerDetails.forEach(detail => {
        pdf.text(detail, margin, y);
        y += 5;
      });
      
      y += 7;
      
      // Separator line
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Purchase details section
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DETALLES DE COMPRA', margin, y);
      y += 7;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      if (firstTicket.reserved_at) {
        const reservedDate = format(new Date(firstTicket.reserved_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
        pdf.text(`Fecha de reserva: ${reservedDate}`, margin, y);
        y += 5;
      }
      
      if (firstTicket.sold_at) {
        const soldDate = format(new Date(firstTicket.sold_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
        pdf.text(`Fecha de confirmación: ${soldDate}`, margin, y);
        y += 5;
      }
      
      if (firstTicket.payment_method) {
        pdf.text(`Método de pago: ${firstTicket.payment_method}`, margin, y);
        y += 5;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total pagado: ${formatCurrency(orderTotal, currency)}`, margin, y);
      y += 5;
      pdf.text(`Cantidad de boletos: ${data.tickets.length}`, margin, y);
      pdf.setFont('helvetica', 'normal');
      
      y += 15;

      // QR Code section
      const qrDataURL = await generateQRDataURL(verificationUrl);
      const qrSize = 50;
      const qrX = (pageWidth - qrSize) / 2;
      
      pdf.addImage(qrDataURL, 'PNG', qrX, y, qrSize, qrSize);
      y += qrSize + 5;
      
      // Reference code below QR
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`REF: ${referenceCode}`, pageWidth / 2, y, { align: 'center' });
      y += 6;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${data.tickets.length} boleto${data.tickets.length !== 1 ? 's' : ''} en esta orden`, pageWidth / 2, y, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      
      y += 12;
      
      // Separator line
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8;
      
      // Footer info
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Escanea el QR para verificar tu compra en línea', pageWidth / 2, y, { align: 'center' });
      y += 4;
      pdf.text(verificationUrl, pageWidth / 2, y, { align: 'center' });
      
      if (data.organization?.whatsapp_number) {
        y += 6;
        pdf.text(`Contacto: wa.me/${data.organization.whatsapp_number.replace(/\D/g, '')}`, pageWidth / 2, y, { align: 'center' });
      }
      
      // Page number
      pdf.setFontSize(8);
      pdf.text(`Página 1 de ${Math.ceil(sortedTickets.length / 200) + 1}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      pdf.setTextColor(0, 0, 0);

      // ===== PAGES 2+: TICKET NUMBERS =====
      const ticketsPerPage = 200;
      const columns = 8;
      const colWidth = contentWidth / columns;
      const rowHeight = 7;
      const headerHeight = 25;
      
      let ticketIndex = 0;
      let pageNum = 2;
      const totalPages = Math.ceil(sortedTickets.length / ticketsPerPage) + 1;
      
      while (ticketIndex < sortedTickets.length) {
        pdf.addPage();
        y = margin;
        
        // Page header
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(data.raffle.title, margin, y + 5);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text(`REF: ${referenceCode}`, pageWidth - margin, y + 5, { align: 'right' });
        pdf.setTextColor(0, 0, 0);
        
        y += 10;
        pdf.setFontSize(9);
        pdf.text(`${data.tickets.length} boletos - Lista de números`, margin, y);
        y += headerHeight - 10;
        
        // Separator line
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 5;
        
        // Calculate how many tickets fit on this page
        const availableHeight = pageHeight - y - 20;
        const rowsPerPage = Math.floor(availableHeight / rowHeight);
        const ticketsThisPage = Math.min(ticketsPerPage, rowsPerPage * columns);
        
        // Draw ticket numbers in grid
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        
        let col = 0;
        let rowY = y;
        
        for (let i = 0; i < ticketsThisPage && ticketIndex < sortedTickets.length; i++) {
          const ticket = sortedTickets[ticketIndex];
          const x = margin + (col * colWidth);
          
          // Highlight status with subtle background
          if (ticket.status === 'sold') {
            pdf.setTextColor(34, 139, 34); // Green for confirmed
          } else if (ticket.status === 'reserved') {
            pdf.setTextColor(184, 134, 11); // Gold for pending
          } else {
            pdf.setTextColor(0, 0, 0);
          }
          
          pdf.text(ticket.ticket_number, x + 2, rowY + 4);
          pdf.setTextColor(0, 0, 0);
          
          col++;
          if (col >= columns) {
            col = 0;
            rowY += rowHeight;
          }
          
          ticketIndex++;
        }
        
        // Page footer
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text('sortavo.com', margin, pageHeight - 10);
        pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        pdf.setTextColor(0, 0, 0);
        
        pageNum++;
      }

      // Download the PDF
      const fileName = `comprobante-${referenceCode}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'Comprobante generado',
        description: `Se descargó el comprobante con ${data.tickets.length} boletos`,
      });

    } catch (error) {
      console.error('Error generating order receipt:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar el comprobante. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  return {
    generateOrderReceipt,
    isGenerating,
  };
}
