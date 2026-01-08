import { vi } from 'vitest';

// Mock order data (replaces legacy ticket mocks)
export const mockOrders = [
  { 
    id: '1', 
    reference_code: 'REF001',
    ticket_ranges: [{ s: 0, e: 0 }],
    ticket_count: 1,
    status: 'reserved', 
    buyer_name: 'Test User',
    buyer_email: 'test@test.com',
    buyer_phone: '+1234567890',
    order_total: 100,
    raffle_id: 'raffle-1',
    reserved_at: new Date().toISOString(),
    reserved_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  },
  { 
    id: '2', 
    reference_code: 'REF002',
    ticket_ranges: [{ s: 1, e: 2 }],
    ticket_count: 2,
    status: 'sold', 
    buyer_name: 'Sold User',
    buyer_email: 'sold@test.com',
    buyer_phone: '+0987654321',
    order_total: 200,
    raffle_id: 'raffle-1',
    reserved_at: new Date().toISOString(),
    sold_at: new Date().toISOString(),
  },
];

// Create chainable mock for Supabase client
export function createSupabaseMock(options: {
  selectData?: any;
  updateData?: any;
  error?: Error | null;
  updateCount?: number;
}) {
  const { selectData = [], updateData = [], error = null, updateCount } = options;

  const chainMock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: selectData[0] || null, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: selectData[0] || null, error }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  };

  // For update operations, return the specified count of items
  if (updateCount !== undefined) {
    chainMock.select = vi.fn().mockResolvedValue({
      data: updateData.slice(0, updateCount),
      error,
    });
  } else {
    chainMock.select = vi.fn().mockImplementation(() => ({
      ...chainMock,
      data: selectData,
      error,
    }));
  }

  return chainMock;
}

// Mock Supabase client
export const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/image.jpg' } }),
    }),
  },
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
  },
  rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }),
  removeChannel: vi.fn(),
};
