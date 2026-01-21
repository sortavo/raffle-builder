import { supabase } from "@/integrations/supabase/client";

interface CreateNotificationParams {
  userId: string;
  organizationId?: string;
  type: 'ticket_sold' | 'payment_pending' | 'payment_approved' | 'payment_rejected' | 'raffle_completed' | 'raffle_ending_soon' | 'winner_selected' | 'system' | 'subscription' | 'payment_failed' | 'trial_ending';
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  // Cast to any to handle dynamic schema - types will be regenerated after migration
  const insertData = {
    user_id: params.userId,
    organization_id: params.organizationId || null,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link || null,
    metadata: params.metadata || {}
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('notifications')
    .insert(insertData);

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Helper functions for common notifications
export async function notifyTicketSold(
  organizerId: string,
  organizationId: string,
  raffleId: string,
  raffleName: string,
  ticketNumber: string,
  buyerName: string
) {
  await createNotification({
    userId: organizerId,
    organizationId,
    type: 'ticket_sold',
    title: '🎫 Boleto vendido',
    message: `${buyerName} compró el boleto #${ticketNumber} en "${raffleName}"`,
    link: `/dashboard/raffles/${raffleId}?tab=buyers`,
    metadata: { raffleId, ticketNumber, buyerName }
  });
}

export async function notifyPaymentPending(
  organizerId: string,
  organizationId: string,
  raffleId: string,
  raffleName: string,
  ticketNumbers: string[],
  buyerName: string
) {
  await createNotification({
    userId: organizerId,
    organizationId,
    type: 'payment_pending',
    title: '⏳ Pago pendiente de aprobación',
    message: `${buyerName} subió comprobante para ${ticketNumbers.length} boleto(s) en "${raffleName}"`,
    link: `/dashboard/raffles/${raffleId}?tab=approvals`,
    metadata: { raffleId, ticketNumbers, buyerName }
  });
}

export async function notifyPaymentApproved(
  buyerId: string,
  raffleName: string,
  ticketNumbers: string[]
) {
  await createNotification({
    userId: buyerId,
    type: 'payment_approved',
    title: '✅ Pago aprobado',
    message: `Tu pago fue aprobado. ${ticketNumbers.length} boleto(s) confirmado(s) en "${raffleName}"`,
    metadata: { raffleName, ticketNumbers }
  });
}

export async function notifyPaymentRejected(
  buyerId: string,
  raffleName: string,
  ticketNumbers: string[],
  reason?: string
) {
  await createNotification({
    userId: buyerId,
    type: 'payment_rejected',
    title: '❌ Pago rechazado',
    message: `Tu pago fue rechazado para ${ticketNumbers.length} boleto(s) en "${raffleName}"${reason ? `: ${reason}` : ''}`,
    metadata: { raffleName, ticketNumbers, reason }
  });
}

export async function notifyWinnerSelected(
  winnerId: string,
  raffleName: string,
  ticketNumber: string,
  prizeName: string
) {
  await createNotification({
    userId: winnerId,
    type: 'winner_selected',
    title: '🏆 ¡GANASTE!',
    message: `Tu boleto #${ticketNumber} ganó "${prizeName}" en el sorteo "${raffleName}"`,
    metadata: { raffleName, ticketNumber, prizeName }
  });
}

export async function notifyRaffleCompleted(
  organizerId: string,
  organizationId: string,
  raffleId: string,
  raffleName: string,
  winnerName: string,
  ticketNumber: string
) {
  await createNotification({
    userId: organizerId,
    organizationId,
    type: 'raffle_completed',
    title: '🎉 Sorteo completado',
    message: `El ganador de "${raffleName}" es ${winnerName} con el boleto #${ticketNumber}`,
    link: `/dashboard/raffles/${raffleId}`,
    metadata: { raffleId, winnerName, ticketNumber }
  });
}

export async function notifyRaffleEndingSoon(
  userId: string,
  organizationId: string,
  raffleName: string,
  raffleId: string,
  hoursRemaining: number
) {
  await createNotification({
    userId: userId,
    organizationId,
    type: 'raffle_ending_soon',
    title: '⚠️ Sorteo próximo a finalizar',
    message: `El sorteo "${raffleName}" finaliza en ${hoursRemaining} horas`,
    link: `/dashboard/raffles/${raffleId}`,
    metadata: { raffleId, hoursRemaining }
  });
}

export async function notifySubscriptionChange(
  userId: string,
  organizationId: string,
  action: 'upgraded' | 'downgraded' | 'renewed' | 'cancelled',
  planName: string
) {
  const messages = {
    upgraded: `Tu plan ha sido actualizado a ${planName}`,
    downgraded: `Tu plan ha sido cambiado a ${planName}`,
    renewed: `Tu suscripción ${planName} ha sido renovada`,
    cancelled: `Tu suscripción ${planName} ha sido cancelada`
  };

  const titles = {
    upgraded: '🚀 Plan actualizado',
    downgraded: '📉 Plan cambiado',
    renewed: '🔄 Suscripción renovada',
    cancelled: '⚠️ Suscripción cancelada'
  };

  await createNotification({
    userId,
    organizationId,
    type: 'subscription',
    title: titles[action],
    message: messages[action],
    link: '/dashboard/settings?tab=subscription',
    metadata: { action, planName }
  });
}

export async function notifySystem(
  userId: string,
  title: string,
  message: string,
  link?: string
) {
  await createNotification({
    userId,
    type: 'system',
    title: `ℹ️ ${title}`,
    message,
    link
  });
}
