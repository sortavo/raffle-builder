import { vi } from 'vitest';

// Mock ticket data
export const mockAvailableTickets = [
  { id: '1', ticket_number: '0001', status: 'available' },
  { id: '2', ticket_number: '0002', status: 'available' },
  { id: '3', ticket_number: '0003', status: 'available' },
];

export const mockReservedTickets = [
  { id: '1', ticket_number: '0001', status: 'reserved', buyer_email: 'test@test.com' },
  { id: '2', ticket_number: '0002', status: 'reserved', buyer_email: 'test@test.com' },
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
};
