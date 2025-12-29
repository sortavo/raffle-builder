import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { raffle_id, status_filter } = await req.json();

    if (!raffle_id) {
      return new Response(
        JSON.stringify({ error: 'raffle_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting buyer export for raffle: ${raffle_id}, status: ${status_filter || 'all'}`);

    // Get raffle info for filename
    const { data: raffle } = await supabase
      .from('raffles')
      .select('title')
      .eq('id', raffle_id)
      .single();

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
      return new Response(
        JSON.stringify({ error: 'No buyers found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
