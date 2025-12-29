import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hctrnfkowqgcwnotosai.supabase.co';

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

export const mockTickets = [
  { id: '1', ticket_number: '001', status: 'available', raffle_id: '1' },
  { id: '2', ticket_number: '002', status: 'available', raffle_id: '1' },
  { id: '3', ticket_number: '003', status: 'sold', raffle_id: '1' },
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

  // Tickets endpoints
  http.get(`${SUPABASE_URL}/rest/v1/tickets`, ({ request }) => {
    const url = new URL(request.url);
    const raffleId = url.searchParams.get('raffle_id');
    
    if (raffleId) {
      const tickets = mockTickets.filter(t => t.raffle_id === raffleId.replace('eq.', ''));
      return HttpResponse.json(tickets);
    }
    
    return HttpResponse.json(mockTickets);
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/tickets`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json([{ ...mockTickets[0], ...body }]);
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
