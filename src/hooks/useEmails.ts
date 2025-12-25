import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";

type EmailTemplate = 'reservation' | 'proof_received' | 'approved' | 'approved_bulk' | 'rejected' | 'reminder' | 'winner';

interface SendEmailParams {
  to: string;
  template: EmailTemplate;
  data: Record<string, any>;
}

export function useEmails() {
  const sendEmail = useMutation({
    mutationFn: async ({ to, template, data }: SendEmailParams) => {
      const { data: result, error } = await supabase.functions.invoke('send-email', {
        body: { to, template, data },
      });

      if (error) {
        console.error('Email send error:', error);
        // Don't throw - emails failing shouldn't break the flow
        return { success: false, error: error.message };
      }
      
      return result;
    },
  });

  const sendReservationEmail = async (params: {
    to: string;
    buyerName: string;
    ticketNumbers: string[];
    raffleTitle: string;
    raffleSlug: string;
    amount: number;
    currency: string;
    timerMinutes: number;
  }) => {
    return sendEmail.mutateAsync({
      to: params.to,
      template: 'reservation',
      data: {
        buyer_name: params.buyerName,
        ticket_numbers: params.ticketNumbers,
        raffle_title: params.raffleTitle,
        amount: params.amount,
        currency: params.currency,
        timer_minutes: params.timerMinutes,
        payment_url: `${window.location.origin}/r/${params.raffleSlug}/payment`,
      },
    });
  };

  const sendProofReceivedEmail = async (params: {
    to: string;
    buyerName: string;
    ticketNumbers: string[];
    raffleTitle: string;
  }) => {
    return sendEmail.mutateAsync({
      to: params.to,
      template: 'proof_received',
      data: {
        buyer_name: params.buyerName,
        ticket_numbers: params.ticketNumbers,
        raffle_title: params.raffleTitle,
      },
    });
  };

  const sendApprovedEmail = async (params: {
    to: string;
    buyerName: string;
    ticketNumbers: string[];
    raffleTitle: string;
    raffleSlug: string;
  }) => {
    return sendEmail.mutateAsync({
      to: params.to,
      template: 'approved',
      data: {
        buyer_name: params.buyerName,
        ticket_numbers: params.ticketNumbers,
        raffle_title: params.raffleTitle,
        raffle_url: `${window.location.origin}/r/${params.raffleSlug}`,
      },
    });
  };

  const sendRejectedEmail = async (params: {
    to: string;
    buyerName: string;
    ticketNumbers: string[];
    raffleTitle: string;
    raffleSlug: string;
    rejectionReason?: string;
  }) => {
    return sendEmail.mutateAsync({
      to: params.to,
      template: 'rejected',
      data: {
        buyer_name: params.buyerName,
        ticket_numbers: params.ticketNumbers,
        raffle_title: params.raffleTitle,
        raffle_url: `${window.location.origin}/r/${params.raffleSlug}`,
        rejection_reason: params.rejectionReason || 'El comprobante no coincide con el monto',
      },
    });
  };

  const sendWinnerEmail = async (params: {
    to: string;
    buyerName: string;
    ticketNumber: string;
    prizeName: string;
    raffleTitle: string;
  }) => {
    return sendEmail.mutateAsync({
      to: params.to,
      template: 'winner',
      data: {
        buyer_name: params.buyerName,
        ticket_numbers: [params.ticketNumber],
        prize_name: params.prizeName,
        raffle_title: params.raffleTitle,
      },
    });
  };

  const sendBulkApprovedEmail = async (params: {
    to: string;
    buyerName: string;
    ticketNumbers: string[];
    raffleTitle: string;
    raffleSlug: string;
    referenceCode?: string;
  }) => {
    return sendEmail.mutateAsync({
      to: params.to,
      template: 'approved_bulk',
      data: {
        buyer_name: params.buyerName,
        ticket_numbers: params.ticketNumbers,
        raffle_title: params.raffleTitle,
        raffle_url: `${window.location.origin}/r/${params.raffleSlug}`,
        reference_code: params.referenceCode,
      },
    });
  };

  return {
    sendEmail,
    sendReservationEmail,
    sendProofReceivedEmail,
    sendApprovedEmail,
    sendRejectedEmail,
    sendWinnerEmail,
    sendBulkApprovedEmail,
  };
}
