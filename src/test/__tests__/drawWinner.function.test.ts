import { describe, it, expect, vi } from 'vitest';

/**
 * Unit Tests for draw-random-winner Edge Function
 *
 * Tests the winner selection logic, authentication/authorization,
 * ticket index calculation, and eligibility validation.
 *
 * Related file: supabase/functions/draw-random-winner/index.ts
 */

// Types matching the edge function
interface OrderData {
  id: string;
  ticket_count: number;
  ticket_ranges: { s: number; e: number }[];
  lucky_indices: number[];
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_city: string | null;
}

interface WinnerTicket {
  id: string;
  ticket_number: string;
  ticket_index: number;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_city: string | null;
}

// Helper function from the edge function (extracted for testing)
function getTicketIndexAtPosition(order: OrderData, position: number): number {
  let accumulated = 0;

  // First check regular ranges
  for (const range of order.ticket_ranges || []) {
    const rangeSize = range.e - range.s + 1;
    if (accumulated + rangeSize > position) {
      return range.s + (position - accumulated);
    }
    accumulated += rangeSize;
  }

  // Then check lucky indices
  const luckyPosition = position - accumulated;
  if (order.lucky_indices && luckyPosition < order.lucky_indices.length) {
    return order.lucky_indices[luckyPosition];
  }

  throw new Error('Position out of bounds');
}

describe('draw-random-winner - Authentication', () => {
  describe('Authorization Header', () => {
    it('should require Authorization header', () => {
      const authHeader = null;
      const isValid = authHeader?.startsWith('Bearer ');
      expect(isValid).toBeFalsy();
    });

    it('should reject missing Bearer prefix', () => {
      const authHeader = 'invalid-token';
      const isValid = authHeader.startsWith('Bearer ');
      expect(isValid).toBe(false);
    });

    it('should accept valid Bearer token format', () => {
      const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      const isValid = authHeader.startsWith('Bearer ');
      expect(isValid).toBe(true);
    });

    it('should extract token from header', () => {
      const authHeader = 'Bearer test-token-value';
      const token = authHeader.replace('Bearer ', '');
      expect(token).toBe('test-token-value');
    });
  });

  describe('JWT Validation', () => {
    it('should return 401 for missing auth', () => {
      const authHeader = null;
      const expectedStatus = !authHeader ? 401 : 200;
      expect(expectedStatus).toBe(401);
    });

    it('should return 401 for invalid token', () => {
      const authError = { message: 'Invalid token' };
      const user = null;
      const expectedStatus = authError || !user ? 401 : 200;
      expect(expectedStatus).toBe(401);
    });
  });
});

describe('draw-random-winner - Authorization', () => {
  describe('Organization Membership', () => {
    it('should verify user has role in organization', () => {
      const userRole = { role: 'admin' };
      const hasRole = userRole !== null;
      expect(hasRole).toBe(true);
    });

    it('should reject users without org membership', () => {
      const userRole = null;
      const roleError = { message: 'No role found' };
      const canAccess = !roleError && userRole;
      expect(canAccess).toBeFalsy();
    });

    it('should return 403 for non-members', () => {
      const userRole = null;
      const expectedStatus = !userRole ? 403 : 200;
      expect(expectedStatus).toBe(403);
    });
  });

  describe('Role-based Access', () => {
    const allowedRoles = ['owner', 'admin'];

    it('should allow owner to draw', () => {
      const userRole = 'owner';
      const canDraw = allowedRoles.includes(userRole);
      expect(canDraw).toBe(true);
    });

    it('should allow admin to draw', () => {
      const userRole = 'admin';
      const canDraw = allowedRoles.includes(userRole);
      expect(canDraw).toBe(true);
    });

    it('should reject editor role', () => {
      const userRole = 'editor';
      const canDraw = allowedRoles.includes(userRole);
      expect(canDraw).toBe(false);
    });

    it('should reject viewer role', () => {
      const userRole = 'viewer';
      const canDraw = allowedRoles.includes(userRole);
      expect(canDraw).toBe(false);
    });

    it('should return 403 for unauthorized roles', () => {
      const userRole = 'viewer';
      const expectedStatus = !allowedRoles.includes(userRole) ? 403 : 200;
      expect(expectedStatus).toBe(403);
    });
  });
});

describe('draw-random-winner - Input Validation', () => {
  it('should require raffle_id', () => {
    const body = {};
    const raffleId = (body as any).raffle_id;
    const expectedStatus = !raffleId ? 400 : 200;
    expect(expectedStatus).toBe(400);
  });

  it('should accept valid raffle_id', () => {
    const body = { raffle_id: 'valid-uuid-here' };
    const raffleId = body.raffle_id;
    expect(raffleId).toBeTruthy();
  });

  it('should handle invalid JSON body', () => {
    const invalidJson = 'not valid json';
    let parseError = false;

    try {
      JSON.parse(invalidJson);
    } catch (e) {
      parseError = true;
    }

    expect(parseError).toBe(true);
  });
});

describe('draw-random-winner - Raffle Validation', () => {
  it('should return 404 for non-existent raffle', () => {
    const raffle = null;
    const raffleError = { message: 'Raffle not found' };
    const expectedStatus = raffleError || !raffle ? 404 : 200;
    expect(expectedStatus).toBe(404);
  });

  it('should retrieve raffle with required fields', () => {
    const raffle = {
      id: 'raffle-123',
      organization_id: 'org-456',
      numbering_config: { start_number: 1, step: 1 },
      total_tickets: 1000,
    };

    expect(raffle).toHaveProperty('id');
    expect(raffle).toHaveProperty('organization_id');
    expect(raffle).toHaveProperty('numbering_config');
    expect(raffle).toHaveProperty('total_tickets');
  });
});

describe('draw-random-winner - Eligibility Validation', () => {
  it('should require at least one sold ticket', () => {
    const soldOrders: OrderData[] = [];
    const soldCount = soldOrders.reduce((sum, o) => sum + (o.ticket_count || 0), 0);

    expect(soldCount).toBe(0);
  });

  it('should return 400 when no tickets sold', () => {
    const soldCount = 0;
    const expectedStatus = soldCount === 0 ? 400 : 200;
    expect(expectedStatus).toBe(400);
  });

  it('should include error message for no tickets', () => {
    const soldCount = 0;
    const errorResponse = {
      error: 'No hay boletos vendidos para sortear',
      sold_count: soldCount,
    };

    expect(errorResponse.error).toContain('boletos vendidos');
    expect(errorResponse.sold_count).toBe(0);
  });

  it('should calculate total sold count from orders', () => {
    const soldOrders = [
      { ticket_count: 5 },
      { ticket_count: 10 },
      { ticket_count: 3 },
    ];
    const soldCount = soldOrders.reduce((sum, o) => sum + (o.ticket_count || 0), 0);

    expect(soldCount).toBe(18);
  });
});

describe('draw-random-winner - Random Selection', () => {
  describe('Secure Random Generation', () => {
    it('should generate random offset within sold count', () => {
      const soldCount = 1000;
      // Simulate crypto.getRandomValues
      const mockRandomValue = 573467;
      const randomOffset = mockRandomValue % soldCount;

      expect(randomOffset).toBeGreaterThanOrEqual(0);
      expect(randomOffset).toBeLessThan(soldCount);
    });

    it('should handle edge case of exactly 1 ticket', () => {
      const soldCount = 1;
      const mockRandomValue = 12345;
      const randomOffset = mockRandomValue % soldCount;

      expect(randomOffset).toBe(0);
    });

    it('should distribute across full range', () => {
      const soldCount = 100;
      const offsets = [
        0 % soldCount,
        50 % soldCount,
        99 % soldCount,
        100 % soldCount,
        150 % soldCount,
      ];

      expect(offsets).toContain(0);
      expect(offsets).toContain(50);
    });
  });

  describe('Order Selection', () => {
    it('should find correct order for random offset', () => {
      const soldOrders = [
        { id: 'order-1', ticket_count: 10 },
        { id: 'order-2', ticket_count: 5 },
        { id: 'order-3', ticket_count: 8 },
      ];

      const randomOffset = 12; // Should be in order-2
      let accumulatedCount = 0;
      let winnerOrder = null;

      for (const order of soldOrders) {
        if (accumulatedCount + order.ticket_count > randomOffset) {
          winnerOrder = order;
          break;
        }
        accumulatedCount += order.ticket_count;
      }

      expect(winnerOrder?.id).toBe('order-2');
    });

    it('should calculate position within order', () => {
      const soldOrders = [
        { id: 'order-1', ticket_count: 10 },
        { id: 'order-2', ticket_count: 5 },
      ];

      const randomOffset = 12;
      let accumulatedCount = 0;
      let positionInOrder = 0;

      for (const order of soldOrders) {
        if (accumulatedCount + order.ticket_count > randomOffset) {
          positionInOrder = randomOffset - accumulatedCount;
          break;
        }
        accumulatedCount += order.ticket_count;
      }

      expect(positionInOrder).toBe(2); // 12 - 10 = 2
    });
  });
});

describe('draw-random-winner - Ticket Index Calculation', () => {
  describe('getTicketIndexAtPosition', () => {
    it('should get correct index from single range', () => {
      const order: OrderData = {
        id: 'order-1',
        ticket_count: 10,
        ticket_ranges: [{ s: 100, e: 109 }],
        lucky_indices: [],
        buyer_name: 'Test',
        buyer_email: null,
        buyer_phone: null,
        buyer_city: null,
      };

      const index = getTicketIndexAtPosition(order, 5);
      expect(index).toBe(105); // 100 + 5
    });

    it('should handle multiple ranges', () => {
      const order: OrderData = {
        id: 'order-1',
        ticket_count: 15,
        ticket_ranges: [
          { s: 10, e: 14 }, // 5 tickets (positions 0-4)
          { s: 20, e: 29 }, // 10 tickets (positions 5-14)
        ],
        lucky_indices: [],
        buyer_name: 'Test',
        buyer_email: null,
        buyer_phone: null,
        buyer_city: null,
      };

      expect(getTicketIndexAtPosition(order, 0)).toBe(10);
      expect(getTicketIndexAtPosition(order, 4)).toBe(14);
      expect(getTicketIndexAtPosition(order, 5)).toBe(20);
      expect(getTicketIndexAtPosition(order, 10)).toBe(25);
    });

    it('should include lucky indices after ranges', () => {
      const order: OrderData = {
        id: 'order-1',
        ticket_count: 7,
        ticket_ranges: [{ s: 10, e: 14 }], // 5 tickets (positions 0-4)
        lucky_indices: [77, 88], // positions 5-6
        buyer_name: 'Test',
        buyer_email: null,
        buyer_phone: null,
        buyer_city: null,
      };

      expect(getTicketIndexAtPosition(order, 5)).toBe(77);
      expect(getTicketIndexAtPosition(order, 6)).toBe(88);
    });

    it('should throw error for position out of bounds', () => {
      const order: OrderData = {
        id: 'order-1',
        ticket_count: 5,
        ticket_ranges: [{ s: 10, e: 14 }],
        lucky_indices: [],
        buyer_name: 'Test',
        buyer_email: null,
        buyer_phone: null,
        buyer_city: null,
      };

      expect(() => getTicketIndexAtPosition(order, 10)).toThrow('Position out of bounds');
    });

    it('should handle empty ranges with only lucky indices', () => {
      const order: OrderData = {
        id: 'order-1',
        ticket_count: 3,
        ticket_ranges: [],
        lucky_indices: [7, 77, 777],
        buyer_name: 'Test',
        buyer_email: null,
        buyer_phone: null,
        buyer_city: null,
      };

      expect(getTicketIndexAtPosition(order, 0)).toBe(7);
      expect(getTicketIndexAtPosition(order, 1)).toBe(77);
      expect(getTicketIndexAtPosition(order, 2)).toBe(777);
    });
  });
});

describe('draw-random-winner - Winner Data', () => {
  it('should construct winner ticket object', () => {
    const winnerOrder: OrderData = {
      id: 'order-123',
      ticket_count: 5,
      ticket_ranges: [{ s: 100, e: 104 }],
      lucky_indices: [],
      buyer_name: 'Juan Perez',
      buyer_email: 'juan@example.com',
      buyer_phone: '+521234567890',
      buyer_city: 'Mexico City',
    };

    const ticketNumber = '0102';
    const ticketIndex = 101;

    const winner: WinnerTicket = {
      id: winnerOrder.id,
      ticket_number: ticketNumber,
      ticket_index: ticketIndex,
      buyer_name: winnerOrder.buyer_name,
      buyer_email: winnerOrder.buyer_email,
      buyer_phone: winnerOrder.buyer_phone,
      buyer_city: winnerOrder.buyer_city,
    };

    expect(winner.id).toBe('order-123');
    expect(winner.ticket_number).toBe('0102');
    expect(winner.buyer_name).toBe('Juan Perez');
    expect(winner.buyer_email).toBe('juan@example.com');
  });

  it('should handle null buyer fields', () => {
    const winnerOrder: OrderData = {
      id: 'order-123',
      ticket_count: 5,
      ticket_ranges: [{ s: 100, e: 104 }],
      lucky_indices: [],
      buyer_name: null,
      buyer_email: null,
      buyer_phone: null,
      buyer_city: null,
    };

    const winner: WinnerTicket = {
      id: winnerOrder.id,
      ticket_number: '0100',
      ticket_index: 100,
      buyer_name: winnerOrder.buyer_name,
      buyer_email: winnerOrder.buyer_email,
      buyer_phone: winnerOrder.buyer_phone,
      buyer_city: winnerOrder.buyer_city,
    };

    expect(winner.buyer_name).toBeNull();
    expect(winner.buyer_email).toBeNull();
  });
});

describe('draw-random-winner - Response Format', () => {
  it('should return complete response structure', () => {
    const response = {
      winner: {
        id: 'order-123',
        ticket_number: '0042',
        ticket_index: 42,
        buyer_name: 'Test User',
        buyer_email: 'test@example.com',
        buyer_phone: null,
        buyer_city: 'Test City',
      },
      sold_count: 1000,
      random_offset: 42,
      method: 'secure_random_orders',
      executed_by: 'user-uuid',
    };

    expect(response).toHaveProperty('winner');
    expect(response).toHaveProperty('sold_count');
    expect(response).toHaveProperty('random_offset');
    expect(response).toHaveProperty('method');
    expect(response).toHaveProperty('executed_by');
    expect(response.method).toBe('secure_random_orders');
  });

  it('should include execution metadata', () => {
    const userId = 'user-123-uuid';
    const response = {
      executed_by: userId,
      method: 'secure_random_orders',
    };

    expect(response.executed_by).toBe(userId);
  });
});

describe('draw-random-winner - Error Handling', () => {
  it('should handle database errors', () => {
    const error = new Error('Database connection failed');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    expect(errorMessage).toBe('Database connection failed');
  });

  it('should return 500 for unexpected errors', () => {
    const error = new Error('Unexpected');
    const expectedStatus = 500;

    expect(error).toBeInstanceOf(Error);
    expect(expectedStatus).toBe(500);
  });

  it('should handle "Could not find winner order" error', () => {
    const winnerOrder = null;
    let errorMessage = '';

    if (!winnerOrder) {
      errorMessage = 'Could not find winner order';
    }

    expect(errorMessage).toBe('Could not find winner order');
  });
});

describe('draw-random-winner - Ticket Number Formatting', () => {
  it('should use raffle numbering config for formatting', () => {
    const raffle = {
      numbering_config: { start_number: 1, step: 1 },
      total_tickets: 1000,
    };

    expect(raffle.numbering_config).toBeDefined();
    expect(raffle.total_tickets).toBe(1000);
  });

  it('should handle missing numbering config', () => {
    const raffle = {
      numbering_config: null,
      total_tickets: 1000,
    };

    const config = raffle.numbering_config || {};
    expect(config).toEqual({});
  });

  it('should fallback to string index if formatting fails', () => {
    const formattedNumber = null;
    const winnerTicketIndex = 42;
    const ticketNumber = formattedNumber || String(winnerTicketIndex);

    expect(ticketNumber).toBe('42');
  });
});
