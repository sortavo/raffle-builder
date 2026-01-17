import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from '../_shared/cors.ts';

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  sold: 'Vendido',
  canceled: 'Cancelado',
};

const BATCH_SIZE = 1000;

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

    console.log(`[EXPORT-BUYERS] Authorized: user ${user.id} with role '${userRole.role}' exporting buyers for raffle ${raffle_id}`);

    // ========== BUSINESS LOGIC ==========
    const raffleName = raffle?.title || raffle_id.slice(0, 8);

    // Get total count first
    const { data: firstPage } = await supabase.rpc('get_buyers_paginated', {
      p_raffle_id: raffle_id,
      p_status: status_filter || null,
      p_city: null,
      p_search: null,
      p_start_date: null,
      p_end_date: null,
      p_page: 1,
      p_page_size: 1,
    });

    const totalCount = firstPage && firstPage.length > 0 ? Number(firstPage[0].total_count) : 0;
    console.log(`Total buyers to export: ${totalCount}`);

    if (totalCount === 0) {
      return corsJsonResponse(req, { error: 'No buyers found' }, 404);
    }

    // CSV headers
    const headers = ['Nombre', 'Email', 'Teléfono', 'Ciudad', 'Boletos', 'Cantidad', 'Estado', 'Fecha'];
    const csvRows: string[] = [headers.join(',')];

    // Fetch and process in batches
    let page = 1;
    let processedCount = 0;

    while (processedCount < totalCount) {
      console.log(`Fetching batch ${page}, processed: ${processedCount}/${totalCount}`);

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
        console.error('Error fetching buyers:', error);
        throw error;
      }

      if (!buyers || buyers.length === 0) break;

      // Convert each buyer to CSV row
      for (const buyer of buyers) {
        const row = [
          buyer.buyer_name || '',
          buyer.buyer_email || '',
          buyer.buyer_phone || '',
          buyer.buyer_city || '',
          (buyer.ticket_numbers || []).join('; '),
          String(buyer.ticket_count || 0),
          STATUS_LABELS[buyer.status] || buyer.status || '',
          buyer.first_reserved_at ? new Date(buyer.first_reserved_at).toLocaleString('es-MX') : '',
        ];

        // Escape CSV values
        const escapedRow = row.map(cell => `"${String(cell).replace(/"/g, '""')}"`);
        csvRows.push(escapedRow.join(','));
      }

      processedCount += buyers.length;
      page++;

      // Safety check to prevent infinite loops
      if (page > 10000) {
        console.warn('Reached maximum page limit');
        break;
      }
    }

    console.log(`Export complete: ${processedCount} buyers`);

    // Add BOM for UTF-8 Excel compatibility
    const BOM = '\uFEFF';
    const csvContent = BOM + csvRows.join('\n');

    // Generate filename
    const sanitizedName = raffleName.replace(/[^a-zA-Z0-9]/g, '-');
    const fileName = `compradores-${sanitizedName}-${Date.now()}.csv`;

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Total-Count': String(processedCount),
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return corsJsonResponse(req, { error: message }, 500);
  }
});
