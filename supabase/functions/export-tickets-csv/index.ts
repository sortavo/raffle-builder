import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from '../_shared/cors.ts';

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  sold: 'Vendido',
  canceled: 'Cancelado'
};

interface TicketRange {
  s: number;
  e: number;
}

interface Order {
  ticket_ranges: TicketRange[];
  status: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_city: string | null;
  approved_at: string | null;
}

interface NumberingConfig {
  pad_width?: number;
  pad_char?: string;
  prefix?: string;
  suffix?: string;
  start_number?: number;
}

/**
 * Sanitize CSV cell to prevent formula injection attacks.
 * Cells starting with =, +, -, @, \t, \r are prefixed with a single quote.
 */
function sanitizeCSVCell(value: string | null | undefined): string {
  const str = String(value || '');
  // Escape formula injection characters
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

function formatTicketNumber(index: number, config: NumberingConfig | null): string {
  const startNumber = config?.start_number ?? 1;
  const ticketNum = startNumber + index;
  const padWidth = config?.pad_width ?? 4;
  const padChar = config?.pad_char ?? '0';
  const prefix = config?.prefix ?? '';
  const suffix = config?.suffix ?? '';
  
  const paddedNum = String(ticketNum).padStart(padWidth, padChar);
  return `${prefix}${paddedNum}${suffix}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // ========== AUTHENTICATION ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[EXPORT-TICKETS] Missing or invalid Authorization header');
      return corsJsonResponse(req, { error: 'Authorization required' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('[EXPORT-TICKETS] Invalid token:', authError?.message);
      return corsJsonResponse(req, { error: 'Invalid or expired token' }, 401);
    }

    // Parse body with try-catch
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return corsJsonResponse(req, { error: 'Invalid JSON body' }, 400);
    }

    const { raffle_id, status_filter } = body;

    if (!raffle_id) {
      return corsJsonResponse(req, { error: 'raffle_id is required' }, 400);
    }

    // Service client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========== AUTHORIZATION ==========
    // Get raffle and verify organization access
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('title, total_tickets, numbering_config, organization_id')
      .eq('id', raffle_id)
      .single();

    if (raffleError || !raffle) {
      console.error('[EXPORT-TICKETS] Raffle not found:', raffle_id);
      return corsJsonResponse(req, { error: 'Raffle not found' }, 404);
    }

    // Check user's role in the organization
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', raffle.organization_id)
      .single();

    if (roleError || !userRole) {
      console.error(`[EXPORT-TICKETS] User ${user.id} has no role in organization ${raffle.organization_id}`);
      return corsJsonResponse(req, { error: 'No tienes permiso para exportar datos de esta rifa' }, 403);
    }

    console.log(`[EXPORT-TICKETS] Authorized: user ${user.id} with role '${userRole.role}' exporting tickets for raffle ${raffle_id}`);

    // ========== BUSINESS LOGIC ==========
    const numberingConfig = raffle?.numbering_config as NumberingConfig | null;

    // Fetch orders and expand ticket_ranges into individual tickets
    let query = supabase
      .from('orders')
      .select('ticket_ranges, status, buyer_name, buyer_email, buyer_phone, buyer_city, approved_at')
      .eq('raffle_id', raffle_id);

    if (status_filter) {
      if (Array.isArray(status_filter)) {
        query = query.in('status', status_filter);
      } else {
        query = query.eq('status', status_filter);
      }
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    // Expand orders into individual tickets
    const tickets: Array<{
      ticket_index: number;
      ticket_number: string;
      status: string;
      buyer_name: string | null;
      buyer_email: string | null;
      buyer_phone: string | null;
      buyer_city: string | null;
      approved_at: string | null;
    }> = [];

    for (const order of (orders as Order[]) || []) {
      const ranges = order.ticket_ranges || [];
      for (const range of ranges) {
        for (let idx = range.s; idx <= range.e; idx++) {
          tickets.push({
            ticket_index: idx,
            ticket_number: formatTicketNumber(idx, numberingConfig),
            status: order.status,
            buyer_name: order.buyer_name,
            buyer_email: order.buyer_email,
            buyer_phone: order.buyer_phone,
            buyer_city: order.buyer_city,
            approved_at: order.approved_at,
          });
        }
      }
    }

    // Sort by ticket index
    tickets.sort((a, b) => a.ticket_index - b.ticket_index);

    console.log(`Exporting ${tickets.length} tickets for raffle ${raffle_id}`);

    // CSV headers
    const headers = [
      'Número de Boleto',
      'Estado',
      'Comprador',
      'Email',
      'Teléfono',
      'Ciudad',
      'Fecha de Aprobación'
    ];

    // Build CSV content with sanitization
    const csvRows: string[] = [headers.join(',')];

    for (const ticket of tickets) {
      const row = [
        ticket.ticket_number,  // Ticket numbers are formatted, generally safe
        STATUS_LABELS[ticket.status || 'available'] || ticket.status,
        sanitizeCSVCell(ticket.buyer_name) || '-',
        sanitizeCSVCell(ticket.buyer_email) || '-',
        sanitizeCSVCell(ticket.buyer_phone) || '-',
        sanitizeCSVCell(ticket.buyer_city) || '-',
        ticket.approved_at ? new Date(ticket.approved_at).toLocaleDateString('es-MX') : '-'
      ];
      csvRows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    }

    const BOM = '\uFEFF';
    const csvContent = BOM + csvRows.join('\n');

    // Generate filename
    const raffleName = raffle?.title || raffle_id.slice(0, 8);
    const safeRaffleName = raffleName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '-').slice(0, 50);
    const filename = `boletos-${safeRaffleName}-${Date.now()}.csv`;

    console.log(`Export complete: ${tickets.length} tickets exported`);

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Total-Count': String(tickets.length),
        'X-Filename': filename
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Export error:', errorMessage);
    return corsJsonResponse(req, { error: errorMessage }, 500);
  }
});
