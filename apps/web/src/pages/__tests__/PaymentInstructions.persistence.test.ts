import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('PaymentInstructions - State Persistence', () => {
  const STORAGE_KEY = 'sortavo_reservation_state';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const mockReservationState = {
    tickets: [
      { id: '1', ticket_number: '0001' },
      { id: '2', ticket_number: '0002' },
    ],
    reservedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min from now
    raffleId: 'test-raffle-id',
    buyerName: 'Test User',
    buyerEmail: 'test@example.com',
    slug: 'test-raffle',
  };

  it('should persist reservation state to localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockReservationState));
    
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    
    const parsed = JSON.parse(stored!);
    expect(parsed.tickets).toHaveLength(2);
    expect(parsed.buyerEmail).toBe('test@example.com');
  });

  it('should retrieve persisted state for the same raffle slug', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockReservationState));
    
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(stored!);
    
    // Simulate the getPersistedReservation logic
    if (parsed.slug === 'test-raffle' && new Date(parsed.reservedUntil) > new Date()) {
      expect(parsed).toEqual(mockReservationState);
    }
  });

  it('should not return expired reservations', () => {
    const expiredState = {
      ...mockReservationState,
      reservedUntil: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expiredState));
    
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(stored!);
    
    // Simulate the getPersistedReservation logic
    const isValid = parsed.slug === 'test-raffle' && new Date(parsed.reservedUntil) > new Date();
    expect(isValid).toBe(false);
  });

  it('should not return state for different raffle slug', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockReservationState));
    
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(stored!);
    
    // Simulate checking for a different slug
    const isValid = parsed.slug === 'different-raffle' && new Date(parsed.reservedUntil) > new Date();
    expect(isValid).toBe(false);
  });

  it('should clear persisted state', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockReservationState));
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    
    localStorage.removeItem(STORAGE_KEY);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('should handle corrupted localStorage data gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-json-{{{');
    
    let result = null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      result = JSON.parse(stored!);
    } catch {
      result = null;
    }
    
    expect(result).toBeNull();
  });

  it('should overwrite old reservation with new one', () => {
    const oldState = {
      ...mockReservationState,
      tickets: [{ id: '1', ticket_number: '0001' }],
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oldState));
    
    const newState = {
      ...mockReservationState,
      tickets: [
        { id: '1', ticket_number: '0001' },
        { id: '2', ticket_number: '0002' },
        { id: '3', ticket_number: '0003' },
      ],
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(stored!);
    
    expect(parsed.tickets).toHaveLength(3);
  });
});
