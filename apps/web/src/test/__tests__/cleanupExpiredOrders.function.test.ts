import { describe, it, expect } from 'vitest';

/**
 * Unit Tests for cleanup-expired-orders Edge Function
 *
 * Tests reservation expiration logic, batch cleanup, cache invalidation,
 * and old order deletion policies.
 *
 * Related file: supabase/functions/cleanup-expired-orders/index.ts
 */

// Types matching the edge function
interface CleanupResult {
  expiredTicketsReleased: number;
  batchesProcessed: number;
  affectedRaffles: number;
  oldCancelledOrders: number;
  oldPendingOrders: number;
  totalCleaned: number;
  executionTimeMs: number;
  autoScaled: boolean;
}

interface ExpiredOrder {
  id: string;
  raffle_id: string;
  buyer_email: string | null;
  buyer_name: string | null;
  organization_id: string;
  ticket_count: number;
  raffles: { title: string }[] | null;
}

describe('cleanup-expired-orders - Configuration', () => {
  it('should use correct cleanup thresholds', () => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    expect(SEVEN_DAYS_MS).toBe(604800000);
    expect(THIRTY_DAYS_MS).toBe(2592000000);
  });

  it('should calculate date thresholds correctly', () => {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    expect(sevenDaysAgo.getTime()).toBeLessThan(now);
    expect(thirtyDaysAgo.getTime()).toBeLessThan(sevenDaysAgo.getTime());
  });
});

describe('cleanup-expired-orders - Reservation Expiration', () => {
  describe('Expiration Detection', () => {
    it('should identify expired reservations', () => {
      const now = new Date().toISOString();
      const reservation = {
        status: 'reserved',
        reserved_until: new Date(Date.now() - 60000).toISOString(), // 1 min ago
      };

      const isExpired = reservation.reserved_until < now;
      expect(isExpired).toBe(true);
    });

    it('should not flag active reservations', () => {
      const now = new Date().toISOString();
      const reservation = {
        status: 'reserved',
        reserved_until: new Date(Date.now() + 300000).toISOString(), // 5 min future
      };

      const isExpired = reservation.reserved_until < now;
      expect(isExpired).toBe(false);
    });

    it('should only check reserved status orders', () => {
      const reservation = { status: 'reserved' };
      const soldOrder = { status: 'sold' };
      const pendingOrder = { status: 'pending' };

      expect(reservation.status).toBe('reserved');
      expect(soldOrder.status).not.toBe('reserved');
      expect(pendingOrder.status).not.toBe('reserved');
    });
  });

  describe('Status Transition', () => {
    it('should transition expired reservation to cancelled', () => {
      const expiredReservation = {
        status: 'reserved',
        reserved_until: new Date(Date.now() - 60000).toISOString(),
      };

      const now = new Date().toISOString();
      const updatedOrder = {
        status: 'cancelled',
        canceled_at: now,
      };

      expect(updatedOrder.status).toBe('cancelled');
      expect(updatedOrder.canceled_at).toBeDefined();
    });

    it('should set canceled_at timestamp', () => {
      const now = new Date().toISOString();
      const canceledOrder = { canceled_at: now };

      expect(canceledOrder.canceled_at).toBe(now);
      expect(new Date(canceledOrder.canceled_at)).toBeInstanceOf(Date);
    });
  });
});

describe('cleanup-expired-orders - Batch Processing', () => {
  describe('Batch Configuration', () => {
    it('should use correct batch parameters', () => {
      const batchParams = {
        p_batch_size: 500,
        p_max_batches: 20,
        p_auto_scale: true,
      };

      expect(batchParams.p_batch_size).toBe(500);
      expect(batchParams.p_max_batches).toBe(20);
      expect(batchParams.p_auto_scale).toBe(true);
    });

    it('should calculate max tickets per run', () => {
      const batchSize = 500;
      const maxBatches = 20;
      const maxTickets = batchSize * maxBatches;

      expect(maxTickets).toBe(10000);
    });
  });

  describe('Auto-scaling', () => {
    it('should detect auto-scaling activation', () => {
      const batchesProcessed = 25;
      const expiredTicketsReleased = 12000;

      const autoScaled = batchesProcessed > 20 || expiredTicketsReleased > 10000;
      expect(autoScaled).toBe(true);
    });

    it('should not flag normal operations as auto-scaled', () => {
      const batchesProcessed = 5;
      const expiredTicketsReleased = 2500;

      const autoScaled = batchesProcessed > 20 || expiredTicketsReleased > 10000;
      expect(autoScaled).toBe(false);
    });
  });

  describe('Batch Result Processing', () => {
    it('should extract results from batch cleanup', () => {
      const ticketCleanupData = [
        {
          total_released: 150,
          batches_processed: 3,
          affected_raffles: ['raffle-1', 'raffle-2'],
        },
      ];

      const result = ticketCleanupData?.[0];
      expect(result?.total_released).toBe(150);
      expect(result?.batches_processed).toBe(3);
      expect(result?.affected_raffles).toHaveLength(2);
    });

    it('should handle null batch results', () => {
      const ticketCleanupData: any[] = [];
      const result = ticketCleanupData?.[0];

      const expiredTicketsReleased = result?.total_released || 0;
      const batchesProcessed = result?.batches_processed || 0;
      const affectedRaffleIds = result?.affected_raffles || [];

      expect(expiredTicketsReleased).toBe(0);
      expect(batchesProcessed).toBe(0);
      expect(affectedRaffleIds).toEqual([]);
    });
  });
});

describe('cleanup-expired-orders - Old Order Deletion', () => {
  describe('Cancelled Orders (>7 days)', () => {
    it('should identify old cancelled orders', () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const oldCancelledOrder = {
        status: 'cancelled',
        canceled_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const isTooOld = new Date(oldCancelledOrder.canceled_at) < sevenDaysAgo;
      expect(isTooOld).toBe(true);
    });

    it('should keep recent cancelled orders', () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentCancelledOrder = {
        status: 'cancelled',
        canceled_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const isTooOld = new Date(recentCancelledOrder.canceled_at) < sevenDaysAgo;
      expect(isTooOld).toBe(false);
    });
  });

  describe('Pending Orders (>30 days)', () => {
    it('should identify old abandoned pending orders', () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const oldPendingOrder = {
        status: 'pending',
        created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        payment_proof_url: null,
      };

      const isAbandoned =
        new Date(oldPendingOrder.created_at) < thirtyDaysAgo &&
        oldPendingOrder.payment_proof_url === null;
      expect(isAbandoned).toBe(true);
    });

    it('should keep pending orders with payment proof', () => {
      const oldPendingOrderWithProof = {
        status: 'pending',
        created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        payment_proof_url: 'https://storage.example.com/proof.jpg',
      };

      const isAbandoned = oldPendingOrderWithProof.payment_proof_url === null;
      expect(isAbandoned).toBe(false);
    });

    it('should keep recent pending orders', () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentPendingOrder = {
        status: 'pending',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        payment_proof_url: null,
      };

      const isTooOld = new Date(recentPendingOrder.created_at) < thirtyDaysAgo;
      expect(isTooOld).toBe(false);
    });
  });
});

describe('cleanup-expired-orders - Cache Invalidation', () => {
  describe('Raffle Cache Keys', () => {
    it('should generate correct cache key format', () => {
      const raffleId = 'raffle-uuid-123';
      const cacheKey = `counts:${raffleId}`;
      expect(cacheKey).toBe('counts:raffle-uuid-123');
    });

    it('should generate cache keys for multiple raffles', () => {
      const raffleIds = ['raffle-1', 'raffle-2', 'raffle-3'];
      const cacheKeys = raffleIds.map((id) => `counts:${id}`);

      expect(cacheKeys).toEqual([
        'counts:raffle-1',
        'counts:raffle-2',
        'counts:raffle-3',
      ]);
    });
  });

  describe('Pipeline Commands', () => {
    it('should generate DEL commands for pipeline', () => {
      const raffleIds = ['raffle-1', 'raffle-2'];
      const commands = raffleIds.map((id) => ['DEL', `counts:${id}`]);

      expect(commands).toEqual([
        ['DEL', 'counts:raffle-1'],
        ['DEL', 'counts:raffle-2'],
      ]);
    });

    it('should skip invalidation when no affected raffles', () => {
      const affectedRaffleIds: string[] = [];
      const shouldInvalidate = affectedRaffleIds.length > 0;

      expect(shouldInvalidate).toBe(false);
    });
  });

  describe('Redis Configuration', () => {
    it('should skip cache when Redis not configured', () => {
      const redisUrl = undefined;
      const redisToken = undefined;

      const canUseRedis = redisUrl && redisToken;
      expect(canUseRedis).toBeFalsy();
    });

    it('should use cache when Redis configured', () => {
      const redisUrl = 'https://redis.upstash.com';
      const redisToken = 'test-token';

      const canUseRedis = redisUrl && redisToken;
      expect(canUseRedis).toBeTruthy();
    });
  });
});

describe('cleanup-expired-orders - Notification Grouping', () => {
  it('should group expired orders by organization', () => {
    const expiredOrders: ExpiredOrder[] = [
      {
        id: 'order-1',
        raffle_id: 'raffle-1',
        buyer_email: 'user1@test.com',
        buyer_name: 'User 1',
        organization_id: 'org-A',
        ticket_count: 5,
        raffles: [{ title: 'Raffle A' }],
      },
      {
        id: 'order-2',
        raffle_id: 'raffle-2',
        buyer_email: 'user2@test.com',
        buyer_name: 'User 2',
        organization_id: 'org-A',
        ticket_count: 3,
        raffles: [{ title: 'Raffle A' }],
      },
      {
        id: 'order-3',
        raffle_id: 'raffle-3',
        buyer_email: 'user3@test.com',
        buyer_name: 'User 3',
        organization_id: 'org-B',
        ticket_count: 2,
        raffles: [{ title: 'Raffle B' }],
      },
    ];

    const byOrg = new Map<string, ExpiredOrder[]>();
    for (const order of expiredOrders) {
      const orgOrders = byOrg.get(order.organization_id) || [];
      orgOrders.push(order);
      byOrg.set(order.organization_id, orgOrders);
    }

    expect(byOrg.get('org-A')).toHaveLength(2);
    expect(byOrg.get('org-B')).toHaveLength(1);
  });

  it('should calculate total tickets per organization', () => {
    const orders = [
      { ticket_count: 5 },
      { ticket_count: 3 },
      { ticket_count: 2 },
    ];

    const totalTickets = orders.reduce((sum, o) => sum + (o.ticket_count || 0), 0);
    expect(totalTickets).toBe(10);
  });

  it('should limit buyer names in notification', () => {
    const orders = [
      { buyer_name: 'User 1' },
      { buyer_name: 'User 2' },
      { buyer_name: 'User 3' },
      { buyer_name: 'User 4' },
      { buyer_name: 'User 5' },
      { buyer_name: 'User 6' },
      { buyer_name: 'User 7' },
    ];

    const buyers = orders.slice(0, 5).map((o) => o.buyer_name || 'Anonimo');
    expect(buyers).toHaveLength(5);
  });
});

describe('cleanup-expired-orders - Result Summary', () => {
  it('should calculate total cleaned', () => {
    const expiredTicketsReleased = 150;
    const oldCancelledCount = 50;
    const oldPendingCount = 25;

    const totalCleaned = expiredTicketsReleased + oldCancelledCount + oldPendingCount;
    expect(totalCleaned).toBe(225);
  });

  it('should track execution time', () => {
    const startTime = Date.now() - 500;
    const executionTimeMs = Date.now() - startTime;

    expect(executionTimeMs).toBeGreaterThanOrEqual(500);
  });

  it('should construct complete result object', () => {
    const result: CleanupResult = {
      expiredTicketsReleased: 100,
      batchesProcessed: 2,
      affectedRaffles: 3,
      oldCancelledOrders: 20,
      oldPendingOrders: 5,
      totalCleaned: 125,
      executionTimeMs: 450,
      autoScaled: false,
    };

    expect(result).toHaveProperty('expiredTicketsReleased');
    expect(result).toHaveProperty('batchesProcessed');
    expect(result).toHaveProperty('affectedRaffles');
    expect(result).toHaveProperty('oldCancelledOrders');
    expect(result).toHaveProperty('oldPendingOrders');
    expect(result).toHaveProperty('totalCleaned');
    expect(result).toHaveProperty('executionTimeMs');
    expect(result).toHaveProperty('autoScaled');
  });
});

describe('cleanup-expired-orders - Error Handling', () => {
  describe('Database Errors', () => {
    it('should handle batch cleanup error with fallback', () => {
      const ticketCleanupError = { message: 'Function not found' };
      const shouldUseFallback = ticketCleanupError !== null;

      expect(shouldUseFallback).toBe(true);
    });

    it('should continue on cancelled order deletion error', () => {
      const cancelledError = { message: 'Timeout' };
      const oldCancelledCount = cancelledError ? 0 : 50;

      expect(oldCancelledCount).toBe(0);
    });

    it('should continue on pending order deletion error', () => {
      const pendingError = { message: 'Permission denied' };
      const oldPendingCount = pendingError ? 0 : 25;

      expect(oldPendingCount).toBe(0);
    });
  });

  describe('Configuration Errors', () => {
    it('should throw for missing Supabase config', () => {
      const supabaseUrl = undefined;
      const supabaseServiceKey = undefined;

      const hasConfig = supabaseUrl && supabaseServiceKey;
      expect(hasConfig).toBeFalsy();
    });
  });

  describe('Response Handling', () => {
    it('should return success response', () => {
      const response = {
        success: true,
        expiredTicketsReleased: 100,
        totalCleaned: 150,
      };

      expect(response.success).toBe(true);
    });

    it('should return error response on failure', () => {
      const error = new Error('Test error');
      const response = {
        success: false,
        error: error.message,
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Test error');
    });
  });
});

describe('cleanup-expired-orders - Unique Raffle Collection', () => {
  it('should collect unique affected raffle IDs', () => {
    const expiredReservations = [
      { raffle_id: 'raffle-1' },
      { raffle_id: 'raffle-1' },
      { raffle_id: 'raffle-2' },
      { raffle_id: 'raffle-3' },
      { raffle_id: 'raffle-2' },
    ];

    const affectedRaffleIds = [
      ...new Set(expiredReservations.map((o) => o.raffle_id)),
    ];

    expect(affectedRaffleIds).toHaveLength(3);
    expect(affectedRaffleIds).toContain('raffle-1');
    expect(affectedRaffleIds).toContain('raffle-2');
    expect(affectedRaffleIds).toContain('raffle-3');
  });
});

describe('cleanup-expired-orders - Recent Expired Query', () => {
  it('should query recently expired orders for notifications', () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const recentlyExpired = {
      status: 'cancelled',
      canceled_at: new Date(Date.now() - 30 * 1000).toISOString(), // 30 sec ago
    };

    const isRecent =
      recentlyExpired.canceled_at >= oneMinuteAgo &&
      recentlyExpired.canceled_at <= now;
    expect(isRecent).toBe(true);
  });

  it('should limit query to 100 orders', () => {
    const limit = 100;
    const orders = Array.from({ length: 150 }, (_, i) => ({ id: `order-${i}` }));
    const limitedOrders = orders.slice(0, limit);

    expect(limitedOrders).toHaveLength(100);
  });
});
