import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
// C4 Security: Use centralized CORS with origin whitelist instead of wildcard
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

const TELEGRAM_API = "https://api.telegram.org/bot";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[TELEGRAM-NOTIFY] ${step}`, details ? JSON.stringify(details) : "");
};

// Support for inline keyboard buttons
interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

interface InlineKeyboard {
  inline_keyboard: InlineKeyboardButton[][];
}

async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: InlineKeyboard) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) {
    logStep("TELEGRAM_BOT_TOKEN not configured");
    return false;
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    };

    // Add inline keyboard if provided
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }

    const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      logStep("Error sending message", { error, chatId });
      return false;
    }
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Exception sending message", { error: errorMessage });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { type, organizationId, raffleId, buyerEmail, data } = await req.json();
    logStep("Received notification request", { type, organizationId, raffleId, buyerEmail });

    // Notification types for organizers
    const organizerNotifications = [
      "ticket_reserved",
      "payment_proof_uploaded",
      "payment_approved",
      "payment_rejected",
      "reservation_expired",
      "raffle_ending",
      "winner_selected",
    ];

    // Notification types for buyers
    const buyerNotifications = [
      "reservation_confirmed",
      "payment_reminder",
      "buyer_payment_approved",
      "buyer_payment_rejected",
      "draw_reminder",
      "winner_notification",
      "organizer_announcement",
    ];

    let sent = false;

    // Handle organizer notifications (multi-user support: send to ALL connected users)
    if (organizerNotifications.includes(type) && organizationId) {
      // Explicit mapping to avoid string manipulation bugs
      const organizerPrefFieldMap: Record<string, string> = {
        ticket_reserved: "notify_ticket_reserved",
        payment_proof_uploaded: "notify_payment_proof",
        payment_approved: "notify_payment_approved",
        payment_rejected: "notify_payment_rejected",
        reservation_expired: "notify_reservation_expired",
        raffle_ending: "notify_raffle_ending",
        winner_selected: "notify_winner_selected",
      };
      const prefField = organizerPrefFieldMap[type] || `notify_${type}`;

      // Fetch ALL connections for this organization (multi-user support)
      const { data: connections } = await supabase
        .from("telegram_connections")
        .select("*")
        .eq("organization_id", organizationId)
        .not("telegram_chat_id", "is", null);

      const validConnections = (connections || []).filter(
        (c) => c.telegram_chat_id && c[prefField as keyof typeof c]
      );

      if (validConnections.length > 0) {
        let message = "";

        // Variable to hold optional inline keyboard
        let replyMarkup: InlineKeyboard | undefined;

        switch (type) {
          case "ticket_reserved":
            message = `🎫 <b>Nueva Reserva</b>\n\n` +
              `Sorteo: ${data.raffleName}\n` +
              `Comprador: ${data.buyerName}\n` +
              `Boletos: ${data.ticketCount}\n` +
              `Total: $${data.total} ${data.currency}`;
            break;
          case "payment_proof_uploaded":
            message = `💳 <b>Comprobante Recibido</b>\n\n` +
              `Sorteo: ${data.raffleName}\n` +
              `Comprador: ${data.buyerName}\n` +
              `Boletos: ${data.ticketCount || 1}\n` +
              `Referencia: <code>${data.reference}</code>`;

            // Add approve/reject buttons if orderId is provided
            if (data.orderId) {
              replyMarkup = {
                inline_keyboard: [
                  [
                    { text: "✅ Aprobar", callback_data: `approve_order_${data.orderId}` },
                    { text: "❌ Rechazar", callback_data: `reject_order_${data.orderId}` },
                  ],
                ],
              };
              message += `\n\n<i>Usa los botones para aprobar o rechazar:</i>`;
            }
            break;
          case "payment_approved":
            message = `✅ <b>Pago Aprobado</b>\n\n` +
              `Comprador: ${data.buyerName}\n` +
              `Boletos: ${data.ticketNumbers?.join(", ")}`;
            break;
          case "payment_rejected":
            message = `❌ <b>Pago Rechazado</b>\n\n` +
              `Comprador: ${data.buyerName}\n` +
              `Razón: ${data.reason || "No especificada"}`;
            break;
          case "raffle_ending":
            message = `⏰ <b>Sorteo por Terminar</b>\n\n` +
              `"${data.raffleName}" termina en 24 horas.\n` +
              `Boletos vendidos: ${data.soldCount}/${data.totalCount}`;
            break;
          case "reservation_expired":
            message = `⚠️ <b>Reservas Expiradas</b>\n\n` +
              `${data.expiredCount} reserva${data.expiredCount > 1 ? 's' : ''} expiró en "${data.raffleName}".\n` +
              `Boletos liberados: ${data.totalTickets}\n` +
              `Compradores: ${data.buyers?.slice(0, 3).join(', ')}${data.expiredCount > 3 ? '...' : ''}`;
            break;
          case "winner_selected":
            message = `🏆 <b>¡Ganador Seleccionado!</b>\n\n` +
              `Sorteo: ${data.raffleName}\n` +
              `Boleto ganador: ${data.winnerTicket}\n` +
              `Ganador: ${data.winnerName}`;
            break;
          default:
            message = `📢 Notificación: ${type}`;
        }

        // Send to ALL connected users
        const results = await Promise.all(
          validConnections.map((conn) =>
            sendTelegramMessage(conn.telegram_chat_id!, message, replyMarkup)
          )
        );

        sent = results.some((r) => r === true);
        logStep("Organizer notification sent", {
          type,
          recipients: validConnections.length,
          successCount: results.filter(Boolean).length,
          hasButtons: !!replyMarkup,
        });
      }
    }

    // Handle buyer notifications
    if (buyerNotifications.includes(type) && buyerEmail) {
      const prefFieldMap: Record<string, string> = {
        reservation_confirmed: "notify_reservation",
        payment_reminder: "notify_payment_reminder",
        buyer_payment_approved: "notify_payment_approved",
        buyer_payment_rejected: "notify_payment_rejected",
        draw_reminder: "notify_draw_reminder",
        winner_notification: "notify_winner",
        organizer_announcement: "notify_announcements",
      };
      
      const prefField = prefFieldMap[type];
      
      const { data: link } = await supabase
        .from("telegram_buyer_links")
        .select("*")
        .eq("buyer_email", buyerEmail)
        .maybeSingle();

      // Type guard for buyer link
      const buyerLink = link as { telegram_chat_id?: string; [key: string]: unknown } | null;
      if (buyerLink?.telegram_chat_id && buyerLink[prefField]) {
        let message = "";
        
        switch (type) {
          case "reservation_confirmed":
            message = `🎫 <b>Reserva Confirmada</b>\n\n` +
              `Sorteo: ${data.raffleName}\n` +
              `Boletos: ${data.ticketNumbers?.join(", ")}\n` +
              `Código de pago: <code>${data.reference}</code>\n` +
              `Vence en: ${data.expiresIn} minutos\n\n` +
              `Realiza tu pago y sube el comprobante.`;
            break;
          case "payment_reminder":
            message = `⏰ <b>Recordatorio de Pago</b>\n\n` +
              `Tu reserva para "${data.raffleName}" vence pronto.\n` +
              `Código: <code>${data.reference}</code>\n\n` +
              `¡No pierdas tus boletos!`;
            break;
          case "buyer_payment_approved":
            message = `✅ <b>¡Pago Confirmado!</b>\n\n` +
              `Sorteo: ${data.raffleName}\n` +
              `Tus boletos:\n${data.ticketNumbers?.map((t: string) => `• ${t}`).join("\n")}\n\n` +
              `¡Buena suerte! 🍀`;
            break;
          case "buyer_payment_rejected":
            message = `❌ <b>Pago Rechazado</b>\n\n` +
              `Tu pago para "${data.raffleName}" fue rechazado.\n` +
              `Razón: ${data.reason || "No especificada"}\n\n` +
              `Contacta al organizador para más información.`;
            break;
          case "draw_reminder":
            message = `🎰 <b>¡El Sorteo es Mañana!</b>\n\n` +
              `"${data.raffleName}" se realizará en 24 horas.\n` +
              `Tus boletos: ${data.ticketNumbers?.join(", ")}\n\n` +
              `¡Mucha suerte! 🍀`;
            break;
          case "winner_notification":
            message = `🏆🎉 <b>¡¡FELICIDADES!!</b> 🎉🏆\n\n` +
              `¡Tu boleto <b>${data.winnerTicket}</b> GANÓ en "${data.raffleName}"!\n\n` +
              `El organizador se pondrá en contacto contigo pronto.\n\n` +
              `Organización: ${data.organizerName}\n` +
              `Contacto: ${data.organizerPhone || data.organizerEmail}`;
            break;
          case "organizer_announcement":
            message = `📢 <b>Mensaje del Organizador</b>\n\n` +
              `${data.message}`;
            break;
          default:
            message = `📢 Notificación: ${type}`;
        }

        sent = await sendTelegramMessage(buyerLink.telegram_chat_id, message);
        logStep("Buyer notification sent", { type, buyerEmail, sent });
      }
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error processing notification", { error: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
