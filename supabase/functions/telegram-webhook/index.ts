import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_API = "https://api.telegram.org/bot";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[TELEGRAM-WEBHOOK] ${step}`, details ? JSON.stringify(details) : "");
};

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

function generateLinkCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const update = await req.json();
    logStep("Received update", { update_id: update.update_id });

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
      logStep("Callback query", { data });

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

      // Find connection with this code
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

      // Update connection
      await supabase
        .from("telegram_connections")
        .update({
          telegram_chat_id: chatId,
          telegram_username: username,
          link_code: null,
          link_code_expires_at: null,
          verified_at: new Date().toISOString(),
        })
        .eq("id", conn.id);

      await sendTelegramMessage(
        chatId,
        `✅ <b>¡Cuenta vinculada exitosamente!</b>\n\n` +
        `Organización: <b>${conn.organizations?.name}</b>\n\n` +
        `Ahora recibirás notificaciones de:\n` +
        `• Nuevas reservas de boletos\n` +
        `• Comprobantes de pago\n` +
        `• Recordatorios de sorteos\n\n` +
        `Usa /config para personalizar tus notificaciones.`
      );
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

    // Handle /ventas command
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

      const { count: todaySales } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "sold")
        .gte("sold_at", today.toISOString())
        .in("raffle_id", raffleIds);

      await sendTelegramMessage(
        chatId,
        `📊 <b>Ventas de Hoy</b>\n\n` +
        `Boletos vendidos: <b>${todaySales || 0}</b>\n\n` +
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
