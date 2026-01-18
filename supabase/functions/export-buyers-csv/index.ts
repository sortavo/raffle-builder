// ============================================================================
// Export Buyers CSV - True Streaming Implementation
// ============================================================================
// Uses TransformStream to stream CSV data directly to response
// Prevents OOM errors for exports of 100K+ rows
// Processes in batches without accumulating in memory

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from '../_shared/cors.ts';

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  sold: 'Vendido',
  pending: 'Pendiente',
  canceled: 'Cancelado',
};

const BATCH_SIZE = 1000;
const MAX_ROWS = 500000; // 500K max to prevent runaway exports

/**
 * Sanitize CSV cell to prevent formula injection attacks.
 * Cells starting with =, +, -, @, \t, \r are prefixed with a single quote.
 */
function sanitizeCSVCell(value: string | null | undefined): string {
  const str = String(value || '');
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * Escape a value for CSV (handle quotes and commas)
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // ========== AUTHENTICATION ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[EXPORT-BUYERS] Missing or invalid Authorization header');
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
      console.error('[EXPORT-BUYERS] Invalid token:', authError?.message);
      return corsJsonResponse(req, { error: 'Invalid or expired token' }, 401);
    }

    // Parse body
    let body;
    try {
      body = await req.json();
    } catch {
      return corsJsonResponse(req, { error: 'Invalid JSON body' }, 400);
    }

    const { raffle_id, status_filter } = body;

    if (!raffle_id) {
      return corsJsonResponse(req, { error: 'raffle_id is required' }, 400);
    }

    // Service client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // ========== AUTHORIZATION ==========
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('title, organization_id')
      .eq('id', raffle_id)
      .single();

    if (raffleError || !raffle) {
      console.error('[EXPORT-BUYERS] Raffle not found:', raffle_id);
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
      console.error(`[EXPORT-BUYERS] User ${user.id} has no role in organization ${raffle.organization_id}`);
      return corsJsonResponse(req, { error: 'No tienes permiso para exportar datos de esta rifa' }, 403);
    }

    console.log(`[EXPORT-BUYERS] Authorized: user ${user.id} with role '${userRole.role}' exporting for raffle ${raffle_id}`);

    // ========== STREAMING EXPORT ==========
    const raffleName = raffle?.title || raffle_id.slice(0, 8);
    const sanitizedName = raffleName.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 50);
    const fileName = `compradores-${sanitizedName}-${Date.now()}.csv`;

    // Create a TransformStream for true streaming
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Start the response immediately with streaming headers
    const response = new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });

    // Process in background (non-blocking)
    (async () => {
      let totalWritten = 0;

      try {
        // Write BOM for Excel UTF-8 compatibility
        await writer.write(encoder.encode('\ufeff'));

        // Write CSV headers
        const headers = ['Nombre', 'Email', 'Teléfono', 'Ciudad', 'Boletos', 'Cantidad', 'Estado', 'Fecha'];
        await writer.write(encoder.encode(headers.join(',') + '\n'));

        let page = 1;
        let hasMore = true;

        while (hasMore && totalWritten < MAX_ROWS) {
          // Fetch batch using paginated RPC
          const { data: buyers, error } = await supabase.rpc('get_buyers_paginated', {
            p_raffle_id: raffle_id,
            p_status: status_filter || null,
            p_city: null,
            p_search: null,
            p_start_date: null,
            p_end_date: null,
            p_page: page,
            p_page_size: BATCH_SIZE,
          });

          if (error) {
            console.error('[EXPORT-BUYERS] Batch fetch error:', error);
            throw error;
          }

          if (!buyers || buyers.length === 0) {
            hasMore = false;
            break;
          }

          // Stream each row immediately
          for (const buyer of buyers) {
            if (totalWritten >= MAX_ROWS) break;

            const ticketNumbers = (buyer.ticket_numbers || []).join('; ');
            const status = STATUS_LABELS[buyer.status] || buyer.status || '';
            const date = buyer.first_reserved_at 
              ? new Date(buyer.first_reserved_at).toLocaleString('es-MX')
              : '';

            const row = [
              escapeCSV(sanitizeCSVCell(buyer.buyer_name)),
              escapeCSV(sanitizeCSVCell(buyer.buyer_email)),
              escapeCSV(sanitizeCSVCell(buyer.buyer_phone)),
              escapeCSV(sanitizeCSVCell(buyer.buyer_city)),
              escapeCSV(ticketNumbers),
              String(buyer.ticket_count || 0),
              escapeCSV(status),
              escapeCSV(date),
            ];

            await writer.write(encoder.encode(row.join(',') + '\n'));
            totalWritten++;
          }

          page++;
          hasMore = buyers.length === BATCH_SIZE;

          // Small delay between batches to prevent overwhelming the database
          if (hasMore) {
            await new Promise(r => setTimeout(r, 10));
          }

          // Log progress for monitoring
          if (page % 10 === 0) {
            console.log(`[EXPORT-BUYERS] Progress: ${totalWritten} rows exported`);
          }
        }

        console.log(`[EXPORT-BUYERS] Complete: ${totalWritten} rows exported for raffle ${raffle_id}`);
        await writer.close();
      } catch (error) {
        console.error('[EXPORT-BUYERS] Streaming error:', error);
        // Try to write error message before aborting
        try {
          await writer.write(encoder.encode(`\n\nError during export: ${error instanceof Error ? error.message : String(error)}\n`));
        } catch {
          // Ignore write error on abort
        }
        await writer.abort(error instanceof Error ? error : new Error(String(error)));
      }
    })();

    return response;

  } catch (error) {
    console.error('[EXPORT-BUYERS] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return corsJsonResponse(req, { error: message }, 500);
  }
});
