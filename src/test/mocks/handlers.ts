import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xnwqrgumstikdmsxtame.supabase.co';

// Mock data
export const mockRaffles = [
  {
    id: '1',
    title: 'Test Raffle',
    slug: 'test-raffle',
    prize_name: 'Test Prize',
    ticket_price: 100,
    total_tickets: 100,
    status: 'active',
    organization_id: 'org-1',
  },
];

export const mockOrders = [
  { 
    id: '1', 
    reference_code: 'REF001',
    ticket_ranges: [{ s: 0, e: 2 }],
    ticket_count: 3,
    status: 'sold', 
    raffle_id: '1',
    buyer_name: 'Test Buyer',
    buyer_email: 'buyer@test.com',
    order_total: 300,
    reserved_at: new Date().toISOString(),
    sold_at: new Date().toISOString(),
  },
  { 
    id: '2', 
    reference_code: 'REF002',
    ticket_ranges: [{ s: 3, e: 4 }],
    ticket_count: 2,
    status: 'reserved', 
    raffle_id: '1',
    buyer_name: 'Another Buyer',
    buyer_email: 'another@test.com',
    order_total: 200,
    reserved_at: new Date().toISOString(),
    sold_at: null,
  },
];

export const mockOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org',
  email: 'test@example.com',
};

// MSW handlers for Supabase REST API
export const handlers = [
  // Auth endpoints
  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json({
      id: 'user-1',
      email: 'test@example.com',
      role: 'authenticated',
    });
  }),

  http.post(`${SUPABASE_URL}/auth/v1/token`, async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string };
    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
        },
      });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  // Raffles endpoints
  http.get(`${SUPABASE_URL}/rest/v1/raffles`, ({ request }) => {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    
    if (slug) {
      const raffle = mockRaffles.find(r => r.slug === slug.replace('eq.', ''));
      return HttpResponse.json(raffle ? [raffle] : []);
    }
    
    return HttpResponse.json(mockRaffles);
  }),

  http.get(`${SUPABASE_URL}/rest/v1/raffles/:id`, ({ params }) => {
    const raffle = mockRaffles.find(r => r.id === params.id);
    return raffle 
      ? HttpResponse.json(raffle)
      : HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  // Orders endpoints
  http.get(`${SUPABASE_URL}/rest/v1/orders`, ({ request }) => {
    const url = new URL(request.url);
    const raffleId = url.searchParams.get('raffle_id');
    
    if (raffleId) {
      const orders = mockOrders.filter(o => o.raffle_id === raffleId.replace('eq.', ''));
      return HttpResponse.json(orders);
    }
    
    return HttpResponse.json(mockOrders);
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/orders`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{ ...mockOrders[0], ...body }]);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/orders`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newOrder = {
      id: `order-${Date.now()}`,
      reference_code: `REF${Date.now()}`,
      ticket_ranges: body.ticket_ranges || [{ s: 0, e: 0 }],
      ticket_count: body.ticket_count || 1,
      status: 'reserved',
      raffle_id: body.raffle_id,
      buyer_name: body.buyer_name,
      buyer_email: body.buyer_email,
      order_total: body.order_total || 100,
      reserved_at: new Date().toISOString(),
      ...body,
    };
    return HttpResponse.json([newOrder], { status: 201 });
  }),

  // Organizations endpoints
  http.get(`${SUPABASE_URL}/rest/v1/organizations`, ({ request }) => {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    
    if (slug) {
      return HttpResponse.json(
        mockOrganization.slug === slug.replace('eq.', '') ? [mockOrganization] : []
      );
    }
    
    return HttpResponse.json([mockOrganization]);
  }),

  // Edge functions
  http.post(`${SUPABASE_URL}/functions/v1/*`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Storage
  http.post(`${SUPABASE_URL}/storage/v1/object/*`, () => {
    return HttpResponse.json({ 
      Key: 'test/path/file.jpg',
      Id: 'file-id',
    });
  }),

  http.get(`${SUPABASE_URL}/storage/v1/object/public/*`, () => {
    return HttpResponse.json({ publicUrl: 'https://example.com/image.jpg' });
  }),
];
