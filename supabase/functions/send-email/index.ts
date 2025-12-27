import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject?: string;
  template: 'reservation' | 'proof_received' | 'approved' | 'approved_bulk' | 'rejected' | 'reminder' | 'winner' | 'payment_reminder' | 'pending_approvals';
  data: Record<string, any>;
}

const subjects: Record<string, string> = {
  reservation: '🎟️ Boletos Reservados',
  proof_received: '📄 Comprobante Recibido',
  approved: '✅ Pago Confirmado',
  approved_bulk: '🎉 ¡Todos tus Boletos Confirmados!',
  rejected: '⚠️ Revisión de Pago',
  reminder: '🎊 Recordatorio del Sorteo',
  winner: '🏆 ¡Felicidades, Ganaste!',
  payment_reminder: '⏰ Tu reservación está por expirar',
  pending_approvals: '📋 Comprobantes pendientes de aprobar',
};

const templates: Record<string, (data: any) => string> = {
  reservation: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
        .tickets { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .ticket-number { display: inline-block; background: #e0e7ff; color: #4f46e5; padding: 5px 12px; border-radius: 20px; margin: 3px; font-weight: 600; }
        .total { font-size: 24px; font-weight: bold; color: #4f46e5; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
        .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 15px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">🎟️ ¡Boletos Reservados!</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${data.buyer_name}</strong>,</p>
          <p>Has reservado los siguientes boletos para <strong>${data.raffle_title}</strong>:</p>
          
          <div class="tickets">
            ${(data.ticket_numbers || []).map((n: string) => `<span class="ticket-number">#${n}</span>`).join('')}
          </div>
          
          <p>Total a pagar: <span class="total">${data.currency} ${data.amount}</span></p>
          
          <div class="warning">
            ⏰ <strong>Tu reservación expira en ${data.timer_minutes || 15} minutos.</strong><br>
            Completa tu pago y sube tu comprobante para confirmar tus boletos.
          </div>
          
          <center>
            <a href="${data.payment_url || '#'}" class="button">Subir Comprobante</a>
          </center>
          
          <p style="margin-top: 20px;">¡Buena suerte! 🍀</p>
        </div>
        <div class="footer">
          <p>Sortavo - Tu plataforma de sorteos</p>
        </div>
      </div>
    </body>
    </html>
  `,

  proof_received: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
        .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">📄 Comprobante Recibido</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${data.buyer_name}</strong>,</p>
          <p>Hemos recibido tu comprobante de pago para los boletos:</p>
          <p><strong>${(data.ticket_numbers || []).map((n: string) => `#${n}`).join(', ')}</strong></p>
          
          <div class="info-box">
            📋 Estamos revisando tu pago y te confirmaremos en las próximas horas.
          </div>
          
          <p>Gracias por participar en <strong>${data.raffle_title}</strong>!</p>
        </div>
        <div class="footer">
          <p>Sortavo - Tu plataforma de sorteos</p>
        </div>
      </div>
    </body>
    </html>
  `,

  approved: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
        .tickets { background: #d1fae5; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
        .ticket-number { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; margin: 3px; font-weight: 600; font-size: 18px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 15px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">🎉 ¡Pago Confirmado!</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${data.buyer_name}</strong>,</p>
          <p>Tu pago ha sido aprobado. Tus boletos están <strong>confirmados</strong>:</p>
          
          <div class="tickets">
            ${(data.ticket_numbers || []).map((n: string) => `<span class="ticket-number">#${n}</span>`).join('')}
          </div>
          
          <p><strong>Sorteo:</strong> ${data.raffle_title}</p>
          
          <p>Ya estás participando oficialmente. ¡Mucha suerte! 🍀</p>
          
          <center>
            <a href="${data.raffle_url || '#'}" class="button">Ver Sorteo</a>
          </center>
        </div>
        <div class="footer">
          <p>Sortavo - Tu plataforma de sorteos</p>
        </div>
      </div>
    </body>
    </html>
  `,

  approved_bulk: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669, #047857); color: white; padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0; }
        .header h1 { margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header .subtitle { opacity: 0.9; margin-top: 8px; font-size: 16px; }
        .content { background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .summary-card { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #10b981; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
        .summary-card .count { font-size: 48px; font-weight: 800; color: #059669; line-height: 1; }
        .summary-card .label { color: #047857; font-weight: 600; margin-top: 5px; }
        .reference-badge { display: inline-block; background: #f0fdf4; border: 1px solid #86efac; color: #166534; padding: 6px 14px; border-radius: 20px; font-family: monospace; font-weight: 600; margin: 10px 0; }
        .tickets-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 20px 0; padding: 20px; background: #f9fafb; border-radius: 12px; }
        .ticket-chip { display: inline-flex; align-items: center; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 10px 18px; border-radius: 25px; font-weight: 700; font-size: 16px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3); }
        .ticket-chip .hash { opacity: 0.8; margin-right: 2px; }
        .raffle-info { background: #f8fafc; border-left: 4px solid #10b981; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .raffle-info .title { font-weight: 700; color: #1f2937; font-size: 18px; }
        .success-message { text-align: center; padding: 20px; }
        .success-message .icon { font-size: 40px; margin-bottom: 10px; }
        .success-message p { color: #374151; font-size: 16px; margin: 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 14px 35px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); transition: transform 0.2s; }
        .button:hover { transform: translateY(-2px); }
        .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        .confetti { font-size: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="confetti">🎊 ✨ 🎉</div>
          <h1>¡Todos tus Boletos Confirmados!</h1>
          <div class="subtitle">Tu pago ha sido verificado exitosamente</div>
        </div>
        <div class="content">
          <p>Hola <strong>${data.buyer_name}</strong>,</p>
          
          <div class="summary-card">
            <div class="count">${(data.ticket_numbers || []).length}</div>
            <div class="label">Boletos Confirmados</div>
            ${data.reference_code ? `<div class="reference-badge">Código: ${data.reference_code}</div>` : ''}
          </div>
          
          <p style="text-align: center; color: #6b7280; margin-bottom: 5px;">Tus números de la suerte:</p>
          
          <div class="tickets-grid">
            ${(data.ticket_numbers || []).map((n: string) => `<span class="ticket-chip"><span class="hash">#</span>${n}</span>`).join('')}
          </div>
          
          <div class="raffle-info">
            <div class="title">🎯 ${data.raffle_title}</div>
          </div>
          
          <div class="success-message">
            <div class="icon">🍀</div>
            <p>Ya estás participando oficialmente.<br><strong>¡Te deseamos mucha suerte!</strong></p>
          </div>
          
          <center style="margin-top: 25px;">
            <a href="${data.raffle_url || '#'}" class="button">Ver mi Sorteo</a>
          </center>
        </div>
        <div class="footer">
          <p>Sortavo - Tu plataforma de sorteos</p>
          <p style="margin-top: 5px;">Guarda este correo como comprobante de tu participación</p>
        </div>
      </div>
    </body>
    </html>
  `,

  rejected: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 15px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">⚠️ Revisión de Pago</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${data.buyer_name}</strong>,</p>
          <p>Necesitamos que revises tu pago para los boletos: <strong>${(data.ticket_numbers || []).map((n: string) => `#${n}`).join(', ')}</strong></p>
          
          <div class="warning">
            <strong>Motivo:</strong> ${data.rejection_reason || 'El comprobante no coincide con el monto'}
          </div>
          
          <p>Por favor, contacta al organizador o intenta de nuevo.</p>
          
          <center>
            <a href="${data.raffle_url || '#'}" class="button">Volver al Sorteo</a>
          </center>
        </div>
        <div class="footer">
          <p>Sortavo - Tu plataforma de sorteos</p>
        </div>
      </div>
    </body>
    </html>
  `,

  reminder: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
        .tickets { background: #ede9fe; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
        .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 15px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">🎊 ¡Mañana es el Sorteo!</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${data.buyer_name}</strong>,</p>
          <p>Te recordamos que mañana es el sorteo de <strong>${data.raffle_title}</strong></p>
          
          <div class="tickets">
            <p>Tus boletos:</p>
            <p style="font-size: 20px; font-weight: bold;">${(data.ticket_numbers || []).map((n: string) => `#${n}`).join(', ')}</p>
          </div>
          
          <p>¡Mucha suerte! 🍀</p>
          
          <center>
            <a href="${data.raffle_url || '#'}" class="button">Ver Sorteo</a>
          </center>
        </div>
        <div class="footer">
          <p>Sortavo - Tu plataforma de sorteos</p>
        </div>
      </div>
    </body>
    </html>
  `,

  winner: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #1f2937; padding: 40px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
        .winner-box { background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center; border: 2px solid #f59e0b; }
        .ticket { font-size: 36px; font-weight: bold; color: #d97706; }
        .prize { font-size: 24px; font-weight: bold; color: #1f2937; margin-top: 10px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0; font-size: 32px;">🎉🏆 ¡FELICIDADES, GANASTE! 🏆🎉</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${data.buyer_name}</strong>,</p>
          
          <div class="winner-box">
            <p style="margin: 0;">Tu boleto ganador:</p>
            <p class="ticket">#${(data.ticket_numbers || [])[0]}</p>
            <p class="prize">🎁 ${data.prize_name}</p>
          </div>
          
          <p>El organizador se pondrá en contacto contigo para coordinar la entrega de tu premio.</p>
          
          <p style="font-size: 24px; text-align: center;">¡Felicidades nuevamente! 🎊</p>
        </div>
        <div class="footer">
          <p>Sortavo - Tu plataforma de sorteos</p>
        </div>
      </div>
    </body>
    </html>
  `,

  payment_reminder: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
        .timer { font-size: 48px; font-weight: bold; color: #d97706; text-align: center; margin: 20px 0; }
        .tickets { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
        .ticket-number { display: inline-block; background: #f59e0b; color: white; padding: 5px 12px; border-radius: 20px; margin: 3px; font-weight: 600; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; margin-top: 15px; font-weight: 600; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">⏰ ¡Tu reservación está por expirar!</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${data.buyer_name}</strong>,</p>
          
          <div class="timer">
            ${data.minutes_remaining} min
          </div>
          
          <p style="text-align: center;">restantes para completar tu pago</p>
          
          <div class="tickets">
            <p style="margin: 0 0 10px 0;">Tus boletos reservados:</p>
            ${(data.ticket_numbers || []).map((n: string) => `<span class="ticket-number">#${n}</span>`).join('')}
          </div>
          
          <div class="warning">
            ⚠️ <strong>Si no subes tu comprobante de pago a tiempo, tus boletos serán liberados</strong> y podrían ser comprados por otra persona.
          </div>
          
          <p><strong>Sorteo:</strong> ${data.raffle_title}</p>
          
          <center>
            <a href="${data.payment_url || '#'}" class="button">Subir Comprobante Ahora</a>
          </center>
        </div>
        <div class="footer">
          <p>Sortavo - Tu plataforma de sorteos</p>
        </div>
      </div>
    </body>
    </html>
  `,

  pending_approvals: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
        .count-box { background: #dbeafe; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
        .count { font-size: 48px; font-weight: bold; color: #1d4ed8; }
        .raffle-item { background: white; padding: 12px 15px; border-radius: 8px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center; }
        .raffle-name { font-weight: 600; }
        .pending-badge { background: #fef3c7; color: #d97706; padding: 4px 12px; border-radius: 20px; font-weight: 600; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; margin-top: 15px; font-weight: 600; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">📋 Comprobantes Pendientes</h1>
        </div>
        <div class="content">
          <p>Hola,</p>
          <p>Tienes comprobantes de pago esperando tu aprobación en <strong>${data.org_name}</strong>:</p>
          
          <div class="count-box">
            <div class="count">${data.total_pending}</div>
            <div>comprobantes pendientes</div>
          </div>
          
          ${(data.raffles || []).map((r: any) => `
            <div class="raffle-item">
              <span class="raffle-name">🎟️ ${r.title}</span>
              <span class="pending-badge">${r.count} pendiente${r.count > 1 ? 's' : ''}</span>
            </div>
          `).join('')}
          
          ${data.waiting_hours >= 2 ? `
            <div class="warning">
              ⏰ El comprobante más antiguo lleva <strong>${data.waiting_hours} horas</strong> esperando aprobación.
            </div>
          ` : ''}
          
          <p>Tus compradores están esperando la confirmación de sus boletos. Una aprobación rápida mejora su experiencia.</p>
          
          <center>
            <a href="${data.dashboard_url || '#'}" class="button">Revisar Comprobantes</a>
          </center>
        </div>
        <div class="footer">
          <p>Sortavo - Tu plataforma de sorteos</p>
        </div>
      </div>
    </body>
    </html>
  `,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, template, data }: EmailRequest = await req.json();

    if (!to || !template) {
      throw new Error('Missing required fields: to, template');
    }

    const htmlContent = templates[template](data);
    const emailSubject = subject || subjects[template] || 'Notificación de Sortavo';

    // For demo/development: log instead of sending real emails
    if (!RESEND_API_KEY) {
      console.log('Demo mode - Email would be sent:', { to, subject: emailSubject, template, data });
      return new Response(
        JSON.stringify({ success: true, id: 'demo-' + Date.now(), demo: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sortavo <onboarding@resend.dev>',
        to: [to],
        subject: emailSubject,
        html: htmlContent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', result);
      throw new Error(result.message || 'Email send failed');
    }

    console.log('Email sent successfully:', { to, template, id: result.id });

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Email error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});