import { useState } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TicketData {
  id: string;
  ticket_number: string;
  buyer_name: string | null;
  buyer_email: string | null;
  status: string | null;
  payment_reference: string | null;
  raffles: {
    id: string;
    title: string;
    slug: string;
    prize_name: string;
    prize_images: string[] | null;
    draw_date: string | null;
    ticket_price: number;
    currency_code: string | null;
  } | null;
}

// Generate QR code as data URL
async function generateQRDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 120,
    margin: 1,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

export function useBulkTicketDownload() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generatePDF = async (tickets: TicketData[]) => {
    if (!tickets.length) return;

    setIsGenerating(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const ticketWidth = pageWidth - margin * 2;
      const ticketHeight = 85;
      const ticketsPerPage = 3;
      const spacing = 8;

      // Group tickets by raffle for better organization
      const groupedByRaffle = tickets.reduce((acc, ticket) => {
        const raffleId = ticket.raffles?.id || 'unknown';
        if (!acc[raffleId]) {
          acc[raffleId] = {
            raffle: ticket.raffles,
            tickets: [],
          };
        }
        acc[raffleId].tickets.push(ticket);
        return acc;
      }, {} as Record<string, { raffle: TicketData['raffles']; tickets: TicketData[] }>);

      let currentPage = 0;
      let ticketIndex = 0;

      for (const group of Object.values(groupedByRaffle)) {
        const { raffle, tickets: raffleTickets } = group;
        if (!raffle) continue;

        for (const ticket of raffleTickets) {
          const positionOnPage = ticketIndex % ticketsPerPage;

          // Add new page if needed
          if (ticketIndex > 0 && positionOnPage === 0) {
            pdf.addPage();
            currentPage++;
          }

          const yOffset = margin + positionOnPage * (ticketHeight + spacing);

          // Draw ticket background
          pdf.setFillColor(26, 26, 46); // Dark slate background
          pdf.roundedRect(margin, yOffset, ticketWidth, ticketHeight, 4, 4, 'F');

          // Draw gradient accent bar at top
          pdf.setFillColor(99, 102, 241); // Primary color
          pdf.roundedRect(margin, yOffset, ticketWidth, 8, 4, 4, 'F');
          pdf.setFillColor(26, 26, 46);
          pdf.rect(margin, yOffset + 4, ticketWidth, 4, 'F');

          // Header section
          const headerY = yOffset + 16;

          // Raffle title
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          const truncatedTitle = raffle.title.length > 40 
            ? raffle.title.substring(0, 37) + '...' 
            : raffle.title;
          pdf.text(truncatedTitle, margin + 6, headerY);

          // Prize name
          pdf.setTextColor(52, 211, 153); // Emerald
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          const truncatedPrize = raffle.prize_name.length > 50 
            ? raffle.prize_name.substring(0, 47) + '...' 
            : raffle.prize_name;
          pdf.text(`🏆 ${truncatedPrize}`, margin + 6, headerY + 6);

          // Status badge
          const isConfirmed = ticket.status === 'sold';
          if (isConfirmed) {
            pdf.setFillColor(16, 185, 129); // Emerald
            pdf.roundedRect(pageWidth - margin - 30, yOffset + 10, 25, 7, 2, 2, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(7);
            pdf.text('CONFIRMADO', pageWidth - margin - 28, yOffset + 15);
          } else {
            pdf.setFillColor(245, 158, 11); // Amber
            pdf.roundedRect(pageWidth - margin - 28, yOffset + 10, 23, 7, 2, 2, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(7);
            pdf.text('PENDIENTE', pageWidth - margin - 26, yOffset + 15);
          }

          // Dashed divider
          pdf.setDrawColor(75, 85, 99);
          pdf.setLineDashPattern([2, 2], 0);
          pdf.line(margin + 6, yOffset + 30, pageWidth - margin - 6, yOffset + 30);
          pdf.setLineDashPattern([], 0);

          // Ticket number section
          const contentY = yOffset + 42;

          pdf.setTextColor(148, 163, 184); // Slate-400
          pdf.setFontSize(8);
          pdf.text('NÚMERO DE BOLETO', margin + 6, contentY);

          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(28);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`#${ticket.ticket_number}`, margin + 6, contentY + 12);

          // Buyer info
          pdf.setTextColor(148, 163, 184);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          const buyerName = ticket.buyer_name || 'N/A';
          pdf.text(`Nombre: ${buyerName.length > 30 ? buyerName.substring(0, 27) + '...' : buyerName}`, margin + 6, contentY + 22);

          // Draw date
          if (raffle.draw_date) {
            const formattedDate = format(new Date(raffle.draw_date), "dd 'de' MMMM, yyyy", { locale: es });
            pdf.text(`📅 Sorteo: ${formattedDate}`, margin + 6, contentY + 29);
          }

          // Reference code
          if (ticket.payment_reference) {
            pdf.setTextColor(99, 102, 241);
            pdf.setFontSize(8);
            pdf.text(`Ref: ${ticket.payment_reference}`, margin + 6, contentY + 36);
          }

          // Generate real QR Code
          const qrX = pageWidth - margin - 35;
          const qrY = contentY - 5;
          const qrSize = 30;
          
          const verificationUrl = `${window.location.origin}/ticket/${ticket.id}`;
          try {
            const qrDataUrl = await generateQRDataURL(verificationUrl);
            pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
          } catch (qrError) {
            // Fallback: draw white box with text if QR fails
            console.error('QR generation failed:', qrError);
            pdf.setFillColor(255, 255, 255);
            pdf.roundedRect(qrX, qrY, qrSize, qrSize, 2, 2, 'F');
            pdf.setTextColor(26, 26, 46);
            pdf.setFontSize(6);
            pdf.text('Verificar en:', qrX + 2, qrY + 12);
            pdf.text('sortavo.com', qrX + 2, qrY + 18);
          }

          // Footer with ticket ID
          pdf.setTextColor(100, 116, 139);
          pdf.setFontSize(7);
          pdf.text(`ID: ${ticket.id.slice(0, 8)}`, margin + 6, yOffset + ticketHeight - 5);
          pdf.text('sortavo.com', pageWidth - margin - 20, yOffset + ticketHeight - 5);

          ticketIndex++;
        }
      }

      // Generate filename
      const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
      const filename = `mis-boletos-${timestamp}.pdf`;

      pdf.save(filename);

      toast({
        title: 'PDF generado',
        description: `Se descargaron ${tickets.length} boleto${tickets.length !== 1 ? 's' : ''} correctamente.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error al generar PDF',
        description: 'No se pudo generar el archivo. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generatePDF,
    isGenerating,
  };
}
