import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_TTL = 10; // seconds

interface RedisResponse {
  result: string | null;
}

// Simple Upstash Redis REST client (using pipeline format)
async function redisGet(url: string, token: string, key: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['GET', key]),
    });
    
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Redis GET] Error response: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    
    return data.result;
  } catch (error) {
    console.error('[Redis] GET error:', error);
    return null;
  }
}

async function redisSetEx(url: string, token: string, key: string, ttl: number, value: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['SETEX', key, ttl, value]),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Redis SETEX] Error response: ${errorText}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Redis] SETEX error:', error);
    return false;
  }
}

async function redisDelete(url: string, token: string, key: string): Promise<boolean> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['DEL', key]),
    });
    return true;
  } catch (error) {
    console.error('[Redis] DEL error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { raffle_id, invalidate } = body;
    
    if (!raffle_id) {
      return new Response(
        JSON.stringify({ error: 'raffle_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
    const cacheKey = `counts:${raffle_id}`;
    

    // Handle cache invalidation request
    if (invalidate && redisUrl && redisToken) {
      await redisDelete(redisUrl, redisToken, cacheKey);
      return new Response(
        JSON.stringify({ invalidated: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try cache first if Redis is configured
    if (redisUrl && redisToken) {
      const cached = await redisGet(redisUrl, redisToken, cacheKey);
      
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          console.log(`[get-ticket-counts] Cache HIT for ${raffle_id}, returning cached data`);
          return new Response(
            JSON.stringify({ ...parsed, cached: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (parseError) {
          console.error(`[Redis] Failed to parse cached value:`, parseError);
          // Invalid cache, continue to DB
        }
      }
    }

    console.log(`[get-ticket-counts] Cache MISS for ${raffle_id}, querying DB`);

    // Fallback to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Try the optimized blocks-based function first
    let counts: { total_count: number; sold_count: number; reserved_count: number; available_count: number } | null = null;
    
    const { data: blockData, error: blockError } = await supabase
      .rpc('get_ticket_counts_from_blocks', { p_raffle_id: raffle_id });

    if (!blockError && blockData?.[0]) {
      counts = blockData[0];
    } else {
      // Fallback to original function if blocks not initialized
      const { data, error } = await supabase
        .rpc('get_virtual_ticket_counts', { p_raffle_id: raffle_id });

      if (error) throw error;
      counts = data?.[0] || null;
    }

    const result = {
      total_count: counts?.total_count || 0,
      sold_count: counts?.sold_count || 0,
      reserved_count: counts?.reserved_count || 0,
      available_count: counts?.available_count || 0,
    };

    // Cache the result if Redis is available
    if (redisUrl && redisToken) {
      await redisSetEx(redisUrl, redisToken, cacheKey, CACHE_TTL, JSON.stringify(result));
    }

    return new Response(
      JSON.stringify({ ...result, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-ticket-counts] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
