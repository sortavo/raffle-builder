import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from '../_shared/cors.ts';

async function generateImage(apiKey: string, prompt: string, attempt: number = 1): Promise<{ imageUrl: string; description: string }> {
  console.log(`Attempt ${attempt}: Generating logo with prompt`);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image-preview',
      messages: [
        {
          role: 'user',
          content: `Generate an image: ${prompt}. IMPORTANT: You MUST generate an actual image, not just describe it.`
        }
      ],
      modalities: ['image', 'text']
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI Gateway error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error('RATE_LIMIT');
    }
    if (response.status === 402) {
      throw new Error('PAYMENT_REQUIRED');
    }
    
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  console.log('AI Gateway response received, checking for image...');

  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const textContent = data.choices?.[0]?.message?.content;

  if (!imageUrl) {
    console.log('No image in response, text content:', textContent);
    
    // Retry up to 3 times if no image generated
    if (attempt < 3) {
      console.log(`Retrying... attempt ${attempt + 1}`);
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      return generateImage(apiKey, prompt, attempt + 1);
    }
    
    throw new Error('No image generated after multiple attempts');
  }

  return {
    imageUrl,
    description: textContent || 'Logo generated successfully'
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req);
  }

  try {
    // ========== AUTHENTICATION ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[GENERATE-LOGO] Missing or invalid Authorization header');
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
      console.error('[GENERATE-LOGO] Invalid token:', authError?.message);
      return corsJsonResponse(req, { error: 'Invalid or expired token' }, 401);
    }

    // Verify user has at least one role (is a registered platform user)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .limit(1);

    if (!roles || roles.length === 0) {
      console.error(`[GENERATE-LOGO] User ${user.id} has no roles`);
      return corsJsonResponse(req, { error: 'No tienes permiso para usar esta función' }, 403);
    }

    console.log(`[GENERATE-LOGO] Authorized: user ${user.id}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = `Create a monochromatic tech-style typographic logo for "Sortavo" - a digital raffle platform.
The logo should feature:
- Sharp, geometric, futuristic sans-serif typography spelling "Sortavo"
- MONOCHROMATIC color scheme: pure black or dark charcoal/graphite gray text
- TRANSPARENT background (no background color, just the text)
- Clean, minimal, corporate tech aesthetic
- High resolution with crisp vector-style edges
- The word "Sortavo" should be the only element, pure typography
- Inspired by tech companies like Apple, Uber, or Airbnb logos
- Very clean and professional, no gradients or colors
- Make sure to generate an actual image of the logo with transparent background`;

    const result = await generateImage(LOVABLE_API_KEY, prompt);

    return corsJsonResponse(req, result);

  } catch (error) {
    console.error('Error generating logo:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate logo';
    
    if (errorMessage === 'RATE_LIMIT') {
      return corsJsonResponse(req, { error: 'Rate limit exceeded. Please try again later.' }, 429);
    }
    
    if (errorMessage === 'PAYMENT_REQUIRED') {
      return corsJsonResponse(req, { error: 'Payment required. Please add credits to your workspace.' }, 402);
    }
    
    return corsJsonResponse(req, { error: errorMessage }, 500);
  }
});
