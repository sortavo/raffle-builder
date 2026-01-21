import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
// C4 Security: Use centralized CORS with origin whitelist
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

const TELEGRAM_API = "https://api.telegram.org/bot";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[TELEGRAM-WEBHOOK] ${step}`, details ? JSON.stringify(details) : "");
};

// C5 Security: Verify Telegram webhook signature
// When setWebhook is called with secret_token, Telegram sends it in X-Telegram-Bot-Api-Secret-Token header
function verifyTelegramWebhook(req: Request): boolean {
  const webhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

  // If no secret configured, log warning but allow (for backwards compatibility during migration)
  if (!webhookSecret) {
    logStep("WARNING: TELEGRAM_WEBHOOK_SECRET not configured - webhook verification disabled");
    return true;
  }

  const receivedToken = req.headers.get("X-Telegram-Bot-Api-Secret-Token");

  if (!receivedToken) {
    logStep("Webhook verification failed: No secret token in request");
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (receivedToken.length !== webhookSecret.length) {
    logStep("Webhook verification failed: Token length mismatch");
    return false;
  }

  let result = 0;
  for (let i = 0; i < receivedToken.length; i++) {
    result |= receivedToken.charCodeAt(i) ^ webhookSecret.charCodeAt(i);
  }

  if (result !== 0) {
    logStep("Webhook verification failed: Invalid secret token");
    return false;
  }

  return true;
}

async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: object) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not configured");

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    logStep("Error sending message", { error });
  }
  return response.ok;
}

// Edit an existing message (to update text and remove buttons)
async function editTelegramMessage(chatId: string, messageId: number, text: string, replyMarkup?: object | null) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return false;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
  };

  // Set reply_markup to remove buttons (empty object removes keyboard)
  if (replyMarkup === null) {
    body.reply_markup = { inline_keyboard: [] };
  } else if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  const response = await fetch(`${TELEGRAM_API}${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    logStep("Error editing message", { error });
  }
  return response.ok;
}

// Answer callback query (stops loading indicator on button)
async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return false;

  const body: Record<string, unknown> = {
    callback_query_id: callbackQueryId,
  };
  if (text) body.text = text;

  const response = await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return response.ok;
}

function generateLinkCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper to expand compressed ticket ranges into display strings
function expandTicketRanges(ranges: unknown, luckyIndices: unknown): string[] {
  const result: string[] = [];
  const rangeArray = ranges as { s: number; e: number }[] || [];
  const luckyArray = luckyIndices as number[] || [];

  for (const range of rangeArray) {
    if (range.s === range.e) {
      result.push(`#${range.s}`);
    } else if (range.e - range.s <= 5) {
      // Expand small ranges
      for (let i = range.s; i <= range.e; i++) {
        result.push(`#${i}`);
      }
    } else {
      result.push(`#${range.s}-${range.e}`);
    }
  }

  for (const idx of luckyArray) {
    result.push(`#${idx}★`);
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  // C5 Security: Verify webhook authenticity before processing
  if (!verifyTelegramWebhook(req)) {
    logStep("Rejecting unauthenticated webhook request");
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const update = await req.json();
    logStep("Received verified update", { update_id: update.update_id });

    const message = update.message || update.callback_query?.message;
    const callbackQuery = update.callback_query;
    const chatId = message?.chat?.id?.toString();
    const text = message?.text || "";
    const username = message?.from?.username || message?.from?.first_name || "Usuario";

    if (!chatId) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle callback queries (inline button presses)
    if (callbackQuery) {
      const data = callbackQuery.data;
      const messageId = callbackQuery.message?.message_id;
      const callbackChatId = callbackQuery.message?.chat?.id?.toString() || chatId;
      const actionUsername = callbackQuery.from?.username || callbackQuery.from?.first_name || "Usuario";
      logStep("Callback query", { data, messageId });

      // Handle approve/reject order buttons
      if (data.startsWith("approve_order_") || data.startsWith("reject_order_")) {
        const isApprove = data.startsWith("approve_order_");
        const orderId = data.replace(isApprove ? "approve_order_" : "reject_order_", "");

        // Answer callback immediately to stop loading indicator
        await answerCallbackQuery(callbackQuery.id, isApprove ? "Procesando aprobación..." : "Procesando rechazo...");

        // Verify the user is authorized (is an organizer with this chat linked)
        const { data: conn } = await supabase
          .from("telegram_connections")
          .select("organization_id")
          .eq("telegram_chat_id", callbackChatId)
          .single();

        if (!conn) {
          await sendTelegramMessage(callbackChatId, "❌ No tienes permisos para esta acción.");
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get the order and verify it belongs to this organization
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("id, buyer_name, buyer_email, ticket_count, ticket_ranges, lucky_indices, status, raffle_id, raffles!inner(title, organization_id)")
          .eq("id", orderId)
          .single();

        if (orderError || !order) {
          // Edit message to show order not found
          if (messageId) {
            await editTelegramMessage(
              callbackChatId,
              messageId,
              `❌ <b>Orden no encontrada</b>\n\nEsta orden ya no existe en el sistema.`,
              null
            );
          }
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify the order belongs to this organization
        const raffle = order.raffles as { title: string; organization_id: string };
        if (raffle.organization_id !== conn.organization_id) {
          await sendTelegramMessage(callbackChatId, "❌ Esta orden no pertenece a tu organización.");
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if order is still in a state that can be approved/rejected
        if (order.status !== "reserved") {
          const statusEmoji = order.status === "sold" ? "✅" : "⚠️";
          const statusMsg = order.status === "sold" ? "APROBADA" : "PROCESADA";
          // Edit the message to show it's already processed
          if (messageId) {
            await editTelegramMessage(
              callbackChatId,
              messageId,
              `${statusEmoji} <b>Orden ya ${statusMsg}</b>\n\n` +
              `Sorteo: ${raffle.title}\n` +
              `Comprador: ${order.buyer_name}\n` +
              `Boletos: ${order.ticket_count}`,
              null
            );
          }
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (isApprove) {
          // Approve the order
          const { error: updateError } = await supabase
            .from("orders")
            .update({
              status: "sold",
              approved_at: new Date().toISOString(),
              sold_at: new Date().toISOString(),
            })
            .eq("id", orderId);

          if (updateError) {
            logStep("Error approving order", { error: updateError.message });
            await sendTelegramMessage(callbackChatId, "❌ Error al aprobar la orden.");
          } else {
            // Edit the original message to show approval (removes buttons)
            if (messageId) {
              await editTelegramMessage(
                callbackChatId,
                messageId,
                `✅ <b>APROBADA</b> por @${actionUsername}\n\n` +
                `Sorteo: ${raffle.title}\n` +
                `Comprador: ${order.buyer_name}\n` +
                `Boletos: ${order.ticket_count}`,
                null
              );
            }

            // Notify the buyer if they have Telegram linked
            if (order.buyer_email) {
              const { data: buyerLink } = await supabase
                .from("telegram_buyer_links")
                .select("telegram_chat_id, notify_payment_approved")
                .eq("buyer_email", order.buyer_email)
                .single();

              if (buyerLink?.telegram_chat_id && buyerLink.notify_payment_approved) {
                const ticketNumbers = expandTicketRanges(order.ticket_ranges, order.lucky_indices);
                await sendTelegramMessage(
                  buyerLink.telegram_chat_id,
                  `✅ <b>¡Pago Confirmado!</b>\n\n` +
                  `Sorteo: ${raffle.title}\n` +
                  `Tus boletos:\n${ticketNumbers.slice(0, 10).map((t: string) => `• ${t}`).join("\n")}${ticketNumbers.length > 10 ? `\n... y ${ticketNumbers.length - 10} más` : ""}\n\n` +
                  `¡Buena suerte! 🍀`
                );
              }
            }

            logStep("Order approved via Telegram", { orderId, approvedBy: actionUsername });
          }
        } else {
          // Reject the order (delete it so tickets become available again)
          const { error: deleteError } = await supabase
            .from("orders")
            .delete()
            .eq("id", orderId);

          if (deleteError) {
            logStep("Error rejecting order", { error: deleteError.message });
            await sendTelegramMessage(callbackChatId, "❌ Error al rechazar la orden.");
          } else {
            // Edit the original message to show rejection (removes buttons)
            if (messageId) {
              await editTelegramMessage(
                callbackChatId,
                messageId,
                `❌ <b>RECHAZADA</b> por @${actionUsername}\n\n` +
                `Sorteo: ${raffle.title}\n` +
                `Comprador: ${order.buyer_name}\n` +
                `Boletos liberados: ${order.ticket_count}`,
                null
              );
            }

            // Notify the buyer if they have Telegram linked
            if (order.buyer_email) {
              const { data: buyerLink } = await supabase
                .from("telegram_buyer_links")
                .select("telegram_chat_id, notify_payment_rejected")
                .eq("buyer_email", order.buyer_email)
                .single();

              if (buyerLink?.telegram_chat_id && buyerLink.notify_payment_rejected) {
                await sendTelegramMessage(
                  buyerLink.telegram_chat_id,
                  `❌ <b>Pago Rechazado</b>\n\n` +
                  `Tu pago para "${raffle.title}" fue rechazado.\n\n` +
                  `Contacta al organizador para más información.`
                );
              }
            }

            logStep("Order rejected via Telegram", { orderId, rejectedBy: actionUsername });
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (data.startsWith("toggle_org_")) {
        const field = data.replace("toggle_org_", "");
        const { data: conn } = await supabase
          .from("telegram_connections")
          .select("*")
          .eq("telegram_chat_id", chatId)
          .single();

        if (conn) {
          const currentValue = conn[field as keyof typeof conn];
          await supabase
            .from("telegram_connections")
            .update({ [field]: !currentValue })
            .eq("id", conn.id);

          await sendTelegramMessage(chatId, `✅ Preferencia actualizada: ${field} = ${!currentValue ? "ON" : "OFF"}`);
        }
      } else if (data.startsWith("toggle_buyer_")) {
        const field = data.replace("toggle_buyer_", "");
        const { data: link } = await supabase
          .from("telegram_buyer_links")
          .select("*")
          .eq("telegram_chat_id", chatId)
          .single();

        if (link) {
          const currentValue = link[field as keyof typeof link];
          await supabase
            .from("telegram_buyer_links")
            .update({ [field]: !currentValue })
            .eq("id", link.id);

          await sendTelegramMessage(chatId, `✅ Preferencia actualizada: ${field} = ${!currentValue ? "ON" : "OFF"}`);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle /start command
    if (text.startsWith("/start")) {
      const params = text.split(" ")[1];
      
      if (params?.startsWith("buyer_")) {
        // Buyer linking flow
        const emailBase64 = params.replace("buyer_", "");
        try {
          const email = atob(emailBase64);
          logStep("Buyer linking", { email });

          await supabase
            .from("telegram_buyer_links")
            .upsert({
              buyer_email: email,
              telegram_chat_id: chatId,
              telegram_username: username,
              verified_at: new Date().toISOString(),
            }, { onConflict: "buyer_email" });

          await sendTelegramMessage(
            chatId,
            `🎉 <b>¡Hola ${username}!</b>\n\n` +
            `Tu cuenta de Telegram ha sido vinculada con <b>${email}</b>.\n\n` +
            `Recibirás notificaciones sobre:\n` +
            `• Confirmación de reservas\n` +
            `• Estado de pagos\n` +
            `• Recordatorios de sorteos\n` +
            `• ¡Si ganas!\n\n` +
            `Usa /preferencias para configurar tus notificaciones.`
          );
        } catch {
          await sendTelegramMessage(chatId, "❌ Enlace inválido. Por favor, usa el botón desde la página del sorteo.");
        }
      } else {
        // General start message
        await sendTelegramMessage(
          chatId,
          `👋 <b>¡Bienvenido a Sortavo Bot!</b>\n\n` +
          `<b>Para Organizadores:</b>\n` +
          `Usa /vincular CÓDIGO para conectar tu cuenta.\n\n` +
          `<b>Para Compradores:</b>\n` +
          `Usa el botón "Recibir por Telegram" al comprar boletos.\n\n` +
          `Escribe /ayuda para ver todos los comandos.`
        );
      }
    }

    // Handle /vincular command (for organizers)
    else if (text.startsWith("/vincular")) {
      const code = text.split(" ")[1]?.toUpperCase();

      if (!code) {
        await sendTelegramMessage(chatId, "⚠️ Uso: /vincular CÓDIGO\n\nObtén tu código en Dashboard → Configuración → Telegram");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find pending connection with this code
      const { data: conn } = await supabase
        .from("telegram_connections")
        .select("*, organizations!inner(subscription_tier, name)")
        .eq("link_code", code)
        .gt("link_code_expires_at", new Date().toISOString())
        .single();

      if (!conn) {
        await sendTelegramMessage(chatId, "❌ Código inválido o expirado.\n\nGenera uno nuevo en el Dashboard.");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check subscription tier
      const tier = conn.organizations?.subscription_tier;
      if (!["premium", "enterprise"].includes(tier)) {
        await sendTelegramMessage(
          chatId,
          "⚠️ El Bot de Telegram está disponible solo para planes Premium y Enterprise.\n\n" +
          "Actualiza tu plan en Dashboard → Configuración → Suscripción"
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if this chat is already linked to this organization (multi-user support)
      const { data: existingLink } = await supabase
        .from("telegram_connections")
        .select("id")
        .eq("organization_id", conn.organization_id)
        .eq("telegram_chat_id", chatId)
        .not("id", "eq", conn.id)
        .maybeSingle();

      if (existingLink) {
        // Delete the pending connection since user is already linked
        await supabase.from("telegram_connections").delete().eq("id", conn.id);
        await sendTelegramMessage(
          chatId,
          `⚠️ Ya estás vinculado a <b>${conn.organizations?.name}</b>.\n\n` +
          `No necesitas vincularte de nuevo. Usa /config para ver tus preferencias.`
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update connection with chat details
      await supabase
        .from("telegram_connections")
        .update({
          telegram_chat_id: chatId,
          telegram_username: username,
          display_name: username,
          link_code: null,
          link_code_expires_at: null,
          verified_at: new Date().toISOString(),
        })
        .eq("id", conn.id);

      // Count how many users are now linked to this org
      const { count } = await supabase
        .from("telegram_connections")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", conn.organization_id)
        .not("telegram_chat_id", "is", null);

      const userCountMsg = count && count > 1 ? `\n\n👥 ${count} usuarios vinculados a esta organización.` : "";

      await sendTelegramMessage(
        chatId,
        `✅ <b>¡Cuenta vinculada exitosamente!</b>\n\n` +
        `Organización: <b>${conn.organizations?.name}</b>\n\n` +
        `Ahora recibirás notificaciones de:\n` +
        `• Nuevas reservas de boletos\n` +
        `• Comprobantes de pago\n` +
        `• Recordatorios de sorteos\n\n` +
        `Usa /config para personalizar tus notificaciones.${userCountMsg}`
      );

      logStep("User linked to organization", {
        organizationId: conn.organization_id,
        chatId,
        totalUsers: count
      });
    }

    // Handle /config command (organizer preferences)
    else if (text === "/config") {
      const { data: conn } = await supabase
        .from("telegram_connections")
        .select("*")
        .eq("telegram_chat_id", chatId)
        .single();

      if (!conn) {
        await sendTelegramMessage(chatId, "❌ No tienes una cuenta de organizador vinculada.\n\nUsa /vincular CÓDIGO primero.");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: `${conn.notify_ticket_reserved ? "✅" : "❌"} Boletos reservados`, callback_data: "toggle_org_notify_ticket_reserved" }],
          [{ text: `${conn.notify_payment_proof ? "✅" : "❌"} Comprobantes recibidos`, callback_data: "toggle_org_notify_payment_proof" }],
          [{ text: `${conn.notify_payment_approved ? "✅" : "❌"} Pagos aprobados`, callback_data: "toggle_org_notify_payment_approved" }],
          [{ text: `${conn.notify_payment_rejected ? "✅" : "❌"} Pagos rechazados`, callback_data: "toggle_org_notify_payment_rejected" }],
          [{ text: `${conn.notify_raffle_ending ? "✅" : "❌"} Sorteo por terminar`, callback_data: "toggle_org_notify_raffle_ending" }],
          [{ text: `${conn.notify_winner_selected ? "✅" : "❌"} Ganador seleccionado`, callback_data: "toggle_org_notify_winner_selected" }],
        ],
      };

      await sendTelegramMessage(chatId, "⚙️ <b>Configuración de Notificaciones</b>\n\nToca para activar/desactivar:", keyboard);
    }

    // Handle /preferencias command (buyer preferences)
    else if (text === "/preferencias") {
      const { data: link } = await supabase
        .from("telegram_buyer_links")
        .select("*")
        .eq("telegram_chat_id", chatId)
        .single();

      if (!link) {
        await sendTelegramMessage(chatId, "❌ No tienes una cuenta vinculada.\n\nVincula desde la página del sorteo.");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: `${link.notify_reservation ? "✅" : "❌"} Confirmación de reserva`, callback_data: "toggle_buyer_notify_reservation" }],
          [{ text: `${link.notify_payment_reminder ? "✅" : "❌"} Recordatorio de pago`, callback_data: "toggle_buyer_notify_payment_reminder" }],
          [{ text: `${link.notify_payment_approved ? "✅" : "❌"} Pago aprobado`, callback_data: "toggle_buyer_notify_payment_approved" }],
          [{ text: `${link.notify_draw_reminder ? "✅" : "❌"} Recordatorio de sorteo`, callback_data: "toggle_buyer_notify_draw_reminder" }],
          [{ text: `${link.notify_winner ? "✅" : "❌"} Si gano`, callback_data: "toggle_buyer_notify_winner" }],
          [{ text: `${link.notify_announcements ? "✅" : "❌"} Anuncios`, callback_data: "toggle_buyer_notify_announcements" }],
        ],
      };

      await sendTelegramMessage(chatId, "⚙️ <b>Tus Preferencias de Notificación</b>\n\nToca para activar/desactivar:", keyboard);
    }

    // Handle /ventas command - UPDATED to use orders table
    else if (text === "/ventas") {
      const { data: conn } = await supabase
        .from("telegram_connections")
        .select("organization_id")
        .eq("telegram_chat_id", chatId)
        .single();

      if (!conn) {
        await sendTelegramMessage(chatId, "❌ No tienes una cuenta vinculada.");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get raffle IDs for this organization
      const { data: raffles } = await supabase
        .from("raffles")
        .select("id")
        .eq("organization_id", conn.organization_id);
      
      const raffleIds = raffles?.map(r => r.id) || [];

      // Sum ticket_count from orders table instead of counting sold_tickets
      const { data: todayOrders } = await supabase
        .from("orders")
        .select("ticket_count")
        .eq("status", "sold")
        .gte("sold_at", today.toISOString())
        .in("raffle_id", raffleIds);

      const todaySales = todayOrders?.reduce((sum, o) => sum + (o.ticket_count || 0), 0) || 0;

      await sendTelegramMessage(
        chatId,
        `📊 <b>Ventas de Hoy</b>\n\n` +
        `Boletos vendidos: <b>${todaySales}</b>\n\n` +
        `Visita el Dashboard para ver el reporte completo.`
      );
    }

    // Handle /sorteos command
    else if (text === "/sorteos") {
      const { data: conn } = await supabase
        .from("telegram_connections")
        .select("organization_id")
        .eq("telegram_chat_id", chatId)
        .single();

      if (!conn) {
        await sendTelegramMessage(chatId, "❌ No tienes una cuenta vinculada.");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: raffles } = await supabase
        .from("raffles")
        .select("title, status, total_tickets")
        .eq("organization_id", conn.organization_id)
        .in("status", ["active", "paused"])
        .limit(5);

      if (!raffles?.length) {
        await sendTelegramMessage(chatId, "📭 No tienes sorteos activos.");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const list = raffles.map((r, i) => `${i + 1}. ${r.title} (${r.status})`).join("\n");
      await sendTelegramMessage(chatId, `🎰 <b>Tus Sorteos Activos</b>\n\n${list}`);
    }

    // Handle /desvincular command
    else if (text === "/desvincular") {
      const { data: conn } = await supabase
        .from("telegram_connections")
        .select("id")
        .eq("telegram_chat_id", chatId)
        .single();

      if (conn) {
        await supabase.from("telegram_connections").delete().eq("id", conn.id);
        await sendTelegramMessage(chatId, "✅ Tu cuenta de organizador ha sido desvinculada.");
      } else {
        const { data: link } = await supabase
          .from("telegram_buyer_links")
          .select("id")
          .eq("telegram_chat_id", chatId)
          .single();

        if (link) {
          await supabase.from("telegram_buyer_links").delete().eq("id", link.id);
          await sendTelegramMessage(chatId, "✅ Tu cuenta de comprador ha sido desvinculada.");
        } else {
          await sendTelegramMessage(chatId, "❌ No tienes ninguna cuenta vinculada.");
        }
      }
    }

    // Handle /ayuda command
    else if (text === "/ayuda") {
      await sendTelegramMessage(
        chatId,
        `📖 <b>Comandos Disponibles</b>\n\n` +
        `<b>Para Organizadores:</b>\n` +
        `/vincular CÓDIGO - Vincular cuenta\n` +
        `/config - Configurar notificaciones\n` +
        `/ventas - Ver ventas de hoy\n` +
        `/sorteos - Ver sorteos activos\n` +
        `/desvincular - Desvincular cuenta\n\n` +
        `<b>Para Compradores:</b>\n` +
        `/preferencias - Configurar notificaciones\n` +
        `/desvincular - Desvincular cuenta\n\n` +
        `/ayuda - Ver esta ayuda`
      );
    }

    // Handle plain text that looks like a linking code (6 alphanumeric chars)
    // This improves UX when user sends code after /vincular without combining them
    else if (/^[A-Z0-9]{6}$/i.test(text.trim())) {
      const code = text.trim().toUpperCase();
      logStep("Detected potential link code", { code });

      // Check if it's a valid organizer link code
      const { data: conn } = await supabase
        .from("telegram_connections")
        .select("*, organizations!inner(subscription_tier, name)")
        .eq("link_code", code)
        .gt("link_code_expires_at", new Date().toISOString())
        .single();

      if (conn) {
        // Check subscription tier
        const tier = conn.organizations?.subscription_tier;
        if (!["premium", "enterprise"].includes(tier)) {
          await sendTelegramMessage(
            chatId,
            "⚠️ El Bot de Telegram está disponible solo para planes Premium y Enterprise.\n\n" +
            "Actualiza tu plan en Dashboard → Configuración → Suscripción"
          );
        } else {
          // Check if this chat is already linked to this organization
          const { data: existingLink } = await supabase
            .from("telegram_connections")
            .select("id")
            .eq("organization_id", conn.organization_id)
            .eq("telegram_chat_id", chatId)
            .not("id", "eq", conn.id)
            .maybeSingle();

          if (existingLink) {
            await supabase.from("telegram_connections").delete().eq("id", conn.id);
            await sendTelegramMessage(
              chatId,
              `⚠️ Ya estás vinculado a <b>${conn.organizations?.name}</b>.\n\n` +
              `No necesitas vincularte de nuevo. Usa /config para ver tus preferencias.`
            );
          } else {
            // Update connection
            await supabase
              .from("telegram_connections")
              .update({
                telegram_chat_id: chatId,
                telegram_username: username,
                display_name: username,
                link_code: null,
                link_code_expires_at: null,
                verified_at: new Date().toISOString(),
              })
              .eq("id", conn.id);

            const { count } = await supabase
              .from("telegram_connections")
              .select("*", { count: "exact", head: true })
              .eq("organization_id", conn.organization_id)
              .not("telegram_chat_id", "is", null);

            const userCountMsg = count && count > 1 ? `\n\n👥 ${count} usuarios vinculados.` : "";

            await sendTelegramMessage(
              chatId,
              `✅ <b>¡Cuenta vinculada exitosamente!</b>\n\n` +
              `Organización: <b>${conn.organizations?.name}</b>\n\n` +
              `Ahora recibirás notificaciones de:\n` +
              `• Nuevas reservas de boletos\n` +
              `• Comprobantes de pago\n` +
              `• Recordatorios de sorteos\n\n` +
              `Usa /config para personalizar tus notificaciones.${userCountMsg}`
            );
            logStep("Organizer linked via plain code", { organizationId: conn.organization_id, totalUsers: count });
          }
        }
      } else {
        // Code not found - could be expired or invalid
        await sendTelegramMessage(
          chatId,
          `❌ El código <code>${code}</code> es inválido o ha expirado.\n\n` +
          `Genera uno nuevo en Dashboard → Configuración → Telegram.`
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error processing webhook", { error: errorMessage });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
