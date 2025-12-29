import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  sold: 'Vendido',
  canceled: 'Cancelado'
};

const BATCH_SIZE = 10000;

Deno.serve(async (req) => {
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

    // Get raffle info for filename
    const { data: raffle } = await supabase
      .from('raffles')
      .select('title')
      .eq('id', raffle_id)
      .single();

    // Get total count
    let countQuery = supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('raffle_id', raffle_id);

    if (status_filter) {
      if (Array.isArray(status_filter)) {
        countQuery = countQuery.in('status', status_filter);
      } else {
        countQuery = countQuery.eq('status', status_filter);
      }
    }

    const { count: totalCount } = await countQuery;
    console.log(`Exporting ${totalCount} tickets for raffle ${raffle_id}`);

    // CSV headers
    const headers = [
      'Número de Boleto',
      'Estado',
      'Comprador',
      'Email',
      'Teléfono',
      'Ciudad',
      'Fecha de Compra'
    ];

    // Build CSV content in batches
    const csvRows: string[] = [headers.join(',')];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('tickets')
        .select('ticket_number, status, buyer_name, buyer_email, buyer_phone, buyer_city, sold_at')
        .eq('raffle_id', raffle_id)
        .order('ticket_index', { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1);

      if (status_filter) {
        if (Array.isArray(status_filter)) {
          query = query.in('status', status_filter);
        } else {
          query = query.eq('status', status_filter);
        }
      }

      const { data: tickets, error } = await query;

      if (error) {
        console.error('Error fetching tickets:', error);
        throw error;
      }

      if (tickets && tickets.length > 0) {
        for (const ticket of tickets) {
          const row = [
            ticket.ticket_number,
            STATUS_LABELS[ticket.status || 'available'] || ticket.status,
            ticket.buyer_name || '-',
            ticket.buyer_email || '-',
            ticket.buyer_phone || '-',
            ticket.buyer_city || '-',
            ticket.sold_at ? new Date(ticket.sold_at).toLocaleDateString('es-MX') : '-'
          ];
          csvRows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
        }
        
        offset += BATCH_SIZE;
        hasMore = tickets.length === BATCH_SIZE;
        console.log(`Processed ${offset} tickets...`);
      } else {
        hasMore = false;
      }
    }

    const BOM = '\uFEFF';
    const csvContent = BOM + csvRows.join('\n');

    // Generate filename
    const raffleName = raffle?.title || raffle_id.slice(0, 8);
    const safeRaffleName = raffleName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '-').slice(0, 50);
    const filename = `boletos-${safeRaffleName}-${Date.now()}.csv`;

    console.log(`Export complete: ${csvRows.length - 1} tickets exported`);

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Total-Count': String(totalCount || 0),
        'X-Filename': filename
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Export error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
