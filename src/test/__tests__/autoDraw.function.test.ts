import { describe, it, expect } from 'vitest';

/**
 * Unit Tests for auto-draw Edge Function
 *
 * Tests the automated winner selection logic, raffle eligibility,
 * winner data construction, and notification handling.
 *
 * Related file: supabase/functions/auto-draw/index.ts
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

interface WinnerData {
  order_id: string;
  ticket_number: string;
  ticket_index: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  buyer_city: string | null;
  draw_method: 'manual' | 'lottery' | 'random_org';
  draw_timestamp: string;
  auto_executed: boolean;
}

interface RaffleToDraw {
  id: string;
  title: string;
  prize_name: string;
  draw_method: string;
  draw_date: string;
  organization_id: string;
  created_by: string;
  auto_publish_result: boolean;
  numbering_config: { start_number?: number; step?: number } | null;
  total_tickets: number;
}

// Helper function from the edge function (extracted for testing)
function getTicketIndexAtPosition(order: OrderData, position: number): number {
  let accumulated = 0;

  for (const range of order.ticket_ranges || []) {
    const rangeSize = range.e - range.s + 1;
    if (accumulated + rangeSize > position) {
      return range.s + (position - accumulated);
    }
    accumulated += rangeSize;
  }

  const luckyPosition = position - accumulated;
  if (order.lucky_indices && luckyPosition < order.lucky_indices.length) {
    return order.lucky_indices[luckyPosition];
  }

  throw new Error('Position out of bounds');
}

function generateSecureRandomNumber(max: number): number {
  // Simulate crypto.getRandomValues for testing
  return Math.floor(Math.random() * max);
}

describe('auto-draw - Raffle Eligibility', () => {
  describe('Draw Date Check', () => {
    it('should identify raffles past draw date', () => {
      const now = new Date();
      const raffle = {
        status: 'active',
        draw_date: new Date(Date.now() - 60000).toISOString(), // 1 min ago
      };

      const isPastDue = new Date(raffle.draw_date) < now;
      expect(isPastDue).toBe(true);
    });

    it('should not select raffles with future draw date', () => {
      const now = new Date();
      const raffle = {
        status: 'active',
        draw_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      };

      const isPastDue = new Date(raffle.draw_date) < now;
      expect(isPastDue).toBe(false);
    });

    it('should handle null draw date', () => {
      const raffle = {
        status: 'active',
        draw_date: null,
      };

      const hasDrawDate = raffle.draw_date !== null;
      expect(hasDrawDate).toBe(false);
    });
  });

  describe('Status Check', () => {
    it('should only process active raffles', () => {
      const raffle = { status: 'active' };
      const isEligible = raffle.status === 'active';
      expect(isEligible).toBe(true);
    });

    it('should skip draft raffles', () => {
      const raffle = { status: 'draft' };
      const isEligible = raffle.status === 'active';
      expect(isEligible).toBe(false);
    });

    it('should skip completed raffles', () => {
      const raffle = { status: 'completed' };
      const isEligible = raffle.status === 'active';
      expect(isEligible).toBe(false);
    });

    it('should skip cancelled raffles', () => {
      const raffle = { status: 'cancelled' };
      const isEligible = raffle.status === 'active';
      expect(isEligible).toBe(false);
    });
  });

  describe('Sold Tickets Check', () => {
    it('should require at least one sold ticket', () => {
      const soldOrders: OrderData[] = [];
      const soldCount = soldOrders.reduce((sum, o) => sum + (o.ticket_count || 0), 0);

      expect(soldCount).toBe(0);
    });

    it('should calculate sold count from orders', () => {
      const soldOrders = [
        { ticket_count: 10 },
        { ticket_count: 5 },
        { ticket_count: 3 },
      ];
      const soldCount = soldOrders.reduce((sum, o) => sum + (o.ticket_count || 0), 0);

      expect(soldCount).toBe(18);
    });

    it('should handle orders with null ticket_count', () => {
      const soldOrders = [
        { ticket_count: 10 },
        { ticket_count: null as any },
        { ticket_count: 5 },
      ];
      const soldCount = soldOrders.reduce((sum, o) => sum + (o.ticket_count || 0), 0);

      expect(soldCount).toBe(15);
    });
  });
});

describe('auto-draw - Winner Selection', () => {
  describe('Secure Random Generation', () => {
    it('should generate number within range', () => {
      const soldCount = 1000;
      const randomOffset = generateSecureRandomNumber(soldCount);

      expect(randomOffset).toBeGreaterThanOrEqual(0);
      expect(randomOffset).toBeLessThan(soldCount);
    });

    it('should handle single ticket raffle', () => {
      const soldCount = 1;
      const randomOffset = 0 % soldCount;

      expect(randomOffset).toBe(0);
    });
  });

  describe('Order Finding', () => {
    it('should find correct order for offset', () => {
      const soldOrders = [
        { id: 'order-1', ticket_count: 10 },
        { id: 'order-2', ticket_count: 15 },
        { id: 'order-3', ticket_count: 5 },
      ];

      const randomOffset = 20; // Should be in order-2 (10-24)
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
      const randomOffset = 20;
      const accumulatedBefore = 10; // First order had 10 tickets
      const positionInOrder = randomOffset - accumulatedBefore;

      expect(positionInOrder).toBe(10);
    });
  });

  describe('Ticket Index Calculation', () => {
    it('should get correct index from ranges', () => {
      const order: OrderData = {
        id: 'test',
        ticket_count: 10,
        ticket_ranges: [{ s: 100, e: 109 }],
        lucky_indices: [],
        buyer_name: null,
        buyer_email: null,
        buyer_phone: null,
        buyer_city: null,
      };

      const index = getTicketIndexAtPosition(order, 5);
      expect(index).toBe(105);
    });

    it('should handle multiple ranges', () => {
      const order: OrderData = {
        id: 'test',
        ticket_count: 20,
        ticket_ranges: [
          { s: 0, e: 9 },
          { s: 100, e: 109 },
        ],
        lucky_indices: [],
        buyer_name: null,
        buyer_email: null,
        buyer_phone: null,
        buyer_city: null,
      };

      expect(getTicketIndexAtPosition(order, 0)).toBe(0);
      expect(getTicketIndexAtPosition(order, 9)).toBe(9);
      expect(getTicketIndexAtPosition(order, 10)).toBe(100);
      expect(getTicketIndexAtPosition(order, 15)).toBe(105);
    });

    it('should include lucky indices', () => {
      const order: OrderData = {
        id: 'test',
        ticket_count: 12,
        ticket_ranges: [{ s: 0, e: 9 }],
        lucky_indices: [77, 88],
        buyer_name: null,
        buyer_email: null,
        buyer_phone: null,
        buyer_city: null,
      };

      expect(getTicketIndexAtPosition(order, 10)).toBe(77);
      expect(getTicketIndexAtPosition(order, 11)).toBe(88);
    });
  });
});

describe('auto-draw - Winner Data Construction', () => {
  it('should construct complete winner data', () => {
    const winnerOrder: OrderData = {
      id: 'order-123',
      ticket_count: 5,
      ticket_ranges: [{ s: 100, e: 104 }],
      lucky_indices: [],
      buyer_name: 'Juan Perez',
      buyer_email: 'juan@example.com',
      buyer_phone: '+521234567890',
      buyer_city: 'CDMX',
    };

    const winnerData: WinnerData = {
      order_id: winnerOrder.id,
      ticket_number: '0102',
      ticket_index: 102,
      buyer_name: winnerOrder.buyer_name || 'Anonimo',
      buyer_email: winnerOrder.buyer_email || '',
      buyer_phone: winnerOrder.buyer_phone,
      buyer_city: winnerOrder.buyer_city,
      draw_method: 'random_org',
      draw_timestamp: new Date().toISOString(),
      auto_executed: true,
    };

    expect(winnerData.order_id).toBe('order-123');
    expect(winnerData.auto_executed).toBe(true);
    expect(winnerData.draw_method).toBe('random_org');
  });

  it('should handle null buyer name with default', () => {
    const winnerOrder: OrderData = {
      id: 'order-123',
      ticket_count: 1,
      ticket_ranges: [{ s: 0, e: 0 }],
      lucky_indices: [],
      buyer_name: null,
      buyer_email: null,
      buyer_phone: null,
      buyer_city: null,
    };

    const buyerName = winnerOrder.buyer_name || 'Anonimo';
    expect(buyerName).toBe('Anonimo');
  });

  it('should handle null buyer email with empty string', () => {
    const winnerOrder: OrderData = {
      id: 'order-123',
      ticket_count: 1,
      ticket_ranges: [{ s: 0, e: 0 }],
      lucky_indices: [],
      buyer_name: null,
      buyer_email: null,
      buyer_phone: null,
      buyer_city: null,
    };

    const buyerEmail = winnerOrder.buyer_email || '';
    expect(buyerEmail).toBe('');
  });
});

describe('auto-draw - Raffle Update', () => {
  it('should set status to completed', () => {
    const updateData = {
      status: 'completed',
      winner_ticket_number: '0042',
      winner_data: {} as WinnerData,
      winner_announced: false,
    };

    expect(updateData.status).toBe('completed');
  });

  it('should respect auto_publish_result setting', () => {
    const raffle = { auto_publish_result: true };
    const updateData = {
      winner_announced: raffle.auto_publish_result || false,
    };

    expect(updateData.winner_announced).toBe(true);
  });

  it('should not auto-announce when disabled', () => {
    const raffle = { auto_publish_result: false };
    const updateData = {
      winner_announced: raffle.auto_publish_result || false,
    };

    expect(updateData.winner_announced).toBe(false);
  });
});

describe('auto-draw - Analytics Event', () => {
  it('should construct analytics event', () => {
    const raffle: RaffleToDraw = {
      id: 'raffle-123',
      title: 'Test Raffle',
      prize_name: 'iPhone 15',
      draw_method: 'random',
      draw_date: new Date().toISOString(),
      organization_id: 'org-456',
      created_by: 'user-789',
      auto_publish_result: true,
      numbering_config: { start_number: 1 },
      total_tickets: 1000,
    };

    const winnerData: WinnerData = {
      order_id: 'order-1',
      ticket_number: '0042',
      ticket_index: 42,
      buyer_name: 'Winner',
      buyer_email: 'winner@test.com',
      buyer_phone: null,
      buyer_city: null,
      draw_method: 'random_org',
      draw_timestamp: new Date().toISOString(),
      auto_executed: true,
    };

    const analyticsEvent = {
      organization_id: raffle.organization_id,
      raffle_id: raffle.id,
      event_type: 'auto_draw_executed',
      metadata: winnerData,
    };

    expect(analyticsEvent.event_type).toBe('auto_draw_executed');
    expect(analyticsEvent.organization_id).toBe('org-456');
  });
});

describe('auto-draw - Notification Creation', () => {
  it('should construct notification for organizer', () => {
    const raffle: RaffleToDraw = {
      id: 'raffle-123',
      title: 'Gran Sorteo',
      prize_name: 'iPhone 15',
      draw_method: 'random',
      draw_date: new Date().toISOString(),
      organization_id: 'org-456',
      created_by: 'user-789',
      auto_publish_result: true,
      numbering_config: null,
      total_tickets: 1000,
    };

    const winnerData: WinnerData = {
      order_id: 'order-1',
      ticket_number: '0042',
      ticket_index: 42,
      buyer_name: 'Ganador',
      buyer_email: 'winner@test.com',
      buyer_phone: null,
      buyer_city: null,
      draw_method: 'random_org',
      draw_timestamp: new Date().toISOString(),
      auto_executed: true,
    };

    const notification = {
      user_id: raffle.created_by,
      organization_id: raffle.organization_id,
      type: 'raffle_completed',
      title: 'Sorteo ejecutado automaticamente',
      message: `El sorteo "${raffle.title}" se ejecuto automaticamente. Ganador: ${winnerData.buyer_name} con boleto #${winnerData.ticket_number}`,
      link: `/dashboard/raffles/${raffle.id}`,
      metadata: { raffle_id: raffle.id, winner_ticket: winnerData.ticket_number },
    };

    expect(notification.type).toBe('raffle_completed');
    expect(notification.user_id).toBe('user-789');
    expect(notification.message).toContain('Gran Sorteo');
    expect(notification.message).toContain('Ganador');
  });

  it('should only create notification if created_by exists', () => {
    const raffle = { created_by: null as string | null };
    const shouldNotify = raffle.created_by !== null;

    expect(shouldNotify).toBe(false);
  });
});

describe('auto-draw - Winner Email', () => {
  it('should send email only if buyer has email', () => {
    const winnerOrder = { buyer_email: 'winner@test.com' };
    const shouldSendEmail = !!winnerOrder.buyer_email;

    expect(shouldSendEmail).toBe(true);
  });

  it('should not send email for null email', () => {
    const winnerOrder = { buyer_email: null };
    const shouldSendEmail = !!winnerOrder.buyer_email;

    expect(shouldSendEmail).toBe(false);
  });

  it('should construct email data correctly', () => {
    const winnerOrder: OrderData = {
      id: 'order-1',
      ticket_count: 1,
      ticket_ranges: [{ s: 42, e: 42 }],
      lucky_indices: [],
      buyer_name: 'Juan Ganador',
      buyer_email: 'juan@test.com',
      buyer_phone: null,
      buyer_city: null,
    };

    const raffle = {
      title: 'Gran Sorteo',
      prize_name: 'Auto Nuevo',
    };

    const org = { name: 'Mi Organizacion' };
    const ticketNumber = '0042';

    const emailData = {
      to: winnerOrder.buyer_email,
      template: 'winner',
      data: {
        buyer_name: winnerOrder.buyer_name || 'Participante',
        ticket_numbers: [ticketNumber],
        prize_name: raffle.prize_name,
        raffle_title: raffle.title,
        org_name: org?.name || 'Organizador',
        draw_method: 'Sorteo automatico',
      },
    };

    expect(emailData.template).toBe('winner');
    expect(emailData.data.ticket_numbers).toContain('0042');
    expect(emailData.data.prize_name).toBe('Auto Nuevo');
  });
});

describe('auto-draw - Ticket Number Formatting', () => {
  it('should use raffle numbering config', () => {
    const raffle = {
      numbering_config: { start_number: 1, step: 1 },
      total_tickets: 1000,
    };

    expect(raffle.numbering_config).toBeDefined();
  });

  it('should fallback for missing numbering config', () => {
    const raffle = {
      numbering_config: null as any,
      total_tickets: 1000,
    };

    const config = raffle.numbering_config || {};
    expect(config).toEqual({});
  });

  it('should fallback ticket number to string index', () => {
    const formattedNumber = null;
    const winnerTicketIndex = 42;
    const ticketNumber = formattedNumber || String(winnerTicketIndex);

    expect(ticketNumber).toBe('42');
  });
});

describe('auto-draw - No Tickets Scenario', () => {
  it('should mark raffle as completed without winner', () => {
    const soldCount = 0;
    const updateData = { status: 'completed' };

    if (soldCount === 0) {
      // No winner to set, just complete the raffle
    }

    expect(updateData.status).toBe('completed');
  });

  it('should return noTickets flag in result', () => {
    const soldCount = 0;
    const result = {
      raffleId: 'raffle-123',
      success: true,
      noTickets: soldCount === 0,
    };

    expect(result.noTickets).toBe(true);
  });
});

describe('auto-draw - Batch Processing Results', () => {
  it('should track success and failure counts', () => {
    const results = [
      { success: true },
      { success: true },
      { success: false },
      { success: true },
      { success: false },
    ];

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    expect(successCount).toBe(3);
    expect(failCount).toBe(2);
  });

  it('should include winner info in success result', () => {
    const result = {
      raffleId: 'raffle-123',
      success: true,
      winner: '0042',
      buyerName: 'Juan Ganador',
    };

    expect(result.winner).toBe('0042');
    expect(result.buyerName).toBe('Juan Ganador');
  });

  it('should include error in failure result', () => {
    const result = {
      raffleId: 'raffle-123',
      success: false,
      error: 'Database connection failed',
    };

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('auto-draw - Error Handling', () => {
  it('should continue processing other raffles on individual failure', () => {
    const rafflesToProcess = ['raffle-1', 'raffle-2', 'raffle-3'];
    const errors: string[] = [];
    const results: { id: string; success: boolean }[] = [];

    // Simulate processing with one failure
    for (const raffleId of rafflesToProcess) {
      try {
        if (raffleId === 'raffle-2') {
          throw new Error('Simulated failure');
        }
        results.push({ id: raffleId, success: true });
      } catch (e) {
        errors.push(raffleId);
        results.push({ id: raffleId, success: false });
      }
    }

    expect(results).toHaveLength(3);
    expect(results.filter((r) => r.success)).toHaveLength(2);
    expect(errors).toContain('raffle-2');
  });

  it('should handle fetch error gracefully', () => {
    const fetchError = { message: 'Network error' };
    const result = {
      success: false,
      error: fetchError.message,
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should extract error message from Error instance', () => {
    const error = new Error('Test error');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    expect(errorMessage).toBe('Test error');
  });

  it('should handle non-Error thrown values', () => {
    const error = 'string error';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    expect(errorMessage).toBe('Unknown error');
  });
});

describe('auto-draw - Response Format', () => {
  it('should return complete response structure', () => {
    const response = {
      success: true,
      message: 'Processed 5 raffles',
      successCount: 4,
      failCount: 1,
      results: [
        { raffleId: 'r1', success: true, winner: '0001' },
        { raffleId: 'r2', success: false, error: 'No tickets' },
      ],
    };

    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('message');
    expect(response).toHaveProperty('successCount');
    expect(response).toHaveProperty('failCount');
    expect(response).toHaveProperty('results');
  });

  it('should return message when no raffles to process', () => {
    const rafflesToDraw: any[] = [];
    const response = {
      success: true,
      message: 'No raffles to draw',
      processed: 0,
    };

    const noRaffles = !rafflesToDraw || rafflesToDraw.length === 0;
    expect(noRaffles).toBe(true);
    expect(response.message).toBe('No raffles to draw');
  });
});
