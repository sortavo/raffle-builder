import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
};

const BASE_URL = 'https://sortavo.com';

// Static pages with their priority and change frequency
const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
  { path: '/features', priority: '0.9', changefreq: 'monthly' },
  { path: '/help', priority: '0.7', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/system-status', priority: '0.4', changefreq: 'daily' },
];

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = formatDate(new Date());
    
    // Start building sitemap
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    // Add static pages
    for (const page of STATIC_PAGES) {
      sitemap += `  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Fetch public organizations
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('slug, name, logo_url, updated_at')
      .not('slug', 'is', null)
      .eq('suspended', false)
      .order('updated_at', { ascending: false });

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
    } else if (organizations) {
      for (const org of organizations) {
        if (!org.slug) continue;
        
        sitemap += `  <url>
    <loc>${BASE_URL}/${escapeXml(org.slug)}</loc>
    <lastmod>${formatDate(org.updated_at || today)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>`;
        
        if (org.logo_url) {
          sitemap += `
    <image:image>
      <image:loc>${escapeXml(org.logo_url)}</image:loc>
      <image:title>${escapeXml(org.name)}</image:title>
    </image:image>`;
        }
        
        sitemap += `
  </url>
`;
      }
    }

    // Fetch active raffles with their organization slugs
    const { data: raffles, error: raffleError } = await supabase
      .from('raffles')
      .select(`
        slug,
        title,
        updated_at,
        prize_images,
        status,
        organizations!inner(slug)
      `)
      .in('status', ['active', 'paused'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (raffleError) {
      console.error('Error fetching raffles:', raffleError);
    } else if (raffles) {
      for (const raffle of raffles) {
        const orgSlug = (raffle.organizations as any)?.slug;
        if (!orgSlug || !raffle.slug) continue;
        
        const changefreq = raffle.status === 'active' ? 'daily' : 'weekly';
        const priority = raffle.status === 'active' ? '0.8' : '0.5';
        
        sitemap += `  <url>
    <loc>${BASE_URL}/${escapeXml(orgSlug)}/${escapeXml(raffle.slug)}</loc>
    <lastmod>${formatDate(raffle.updated_at || today)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>`;
        
        // Add prize images
        const images = raffle.prize_images as string[] | null;
        if (images && images.length > 0) {
          for (const imageUrl of images.slice(0, 5)) { // Limit to 5 images per URL
            sitemap += `
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:title>${escapeXml(raffle.title)}</image:title>
    </image:image>`;
          }
        }
        
        sitemap += `
  </url>
`;
      }
    }

    sitemap += `</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    
    // Return basic sitemap on error
    const basicSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(basicSitemap, {
      status: 200,
      headers: corsHeaders,
    });
  }
});
