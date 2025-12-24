import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject?: string;
  template: 'reservation' | 'proof_received' | 'approved' | 'rejected' | 'reminder' | 'winner';
  data: Record<string, any>;
}

const subjects: Record<string, string> = {
  reservation: '🎟️ Boletos Reservados',
  proof_received: '📄 Comprobante Recibido',
  approved: '✅ Pago Confirmado',
  rejected: '⚠️ Revisión de Pago',
  reminder: '🎊 Recordatorio del Sorteo',
  winner: '🏆 ¡Felicidades, Ganaste!',
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