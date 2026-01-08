import { describe, it, expect } from 'vitest';

/**
 * Tests for revenue calculation logic
 * 
 * With the orders architecture, revenue calculation is simplified:
 * - Each order has an order_total field with the actual amount paid
 * - Revenue = sum of all order_total values
 * - No deduplication needed since each order is unique
 */

// Helper function that mirrors the current revenue calculation logic
function calculateTotalRevenue(
  orders: Array<{ order_total: number | null }>,
  ticketPrice: number,
  totalTicketCount: number
): number {
  // Sum order_total from all orders
  const revenueFromOrders = orders
    .filter(o => o.order_total !== null)
    .reduce((sum, o) => sum + (o.order_total || 0), 0);
  
  // Count orders with order_total
  const ordersWithTotal = orders.filter(o => o.order_total !== null).length;
  
  // If some orders don't have order_total (legacy data), fallback to ticket_price
  const ordersWithoutTotal = totalTicketCount - ordersWithTotal;
  const fallbackRevenue = ordersWithoutTotal > 0 ? ordersWithoutTotal * ticketPrice : 0;
  
  return revenueFromOrders + fallbackRevenue;
}

describe('Revenue Calculation', () => {
  describe('calculateTotalRevenue', () => {
    it('should calculate correct revenue from orders', () => {
      const orders = [
        { order_total: 1750 }, // 10-ticket package
        { order_total: 1000 }, // 5-ticket package
        { order_total: 250 },  // Single ticket
      ];
      
      const revenue = calculateTotalRevenue(orders, 250, 3);
      
      // Sum of all order_total values
      expect(revenue).toBe(3000);
    });

    it('should handle single order', () => {
      const orders = [{ order_total: 500 }];
      
      const revenue = calculateTotalRevenue(orders, 100, 1);
      
      expect(revenue).toBe(500);
    });

    it('should fallback to ticket_price for orders without order_total', () => {
      const orders = [
        { order_total: null },
        { order_total: null },
      ];
      
      const ticketPrice = 250;
      const revenue = calculateTotalRevenue(orders, ticketPrice, 2);
      
      // 2 orders without order_total = 2 * 250
      expect(revenue).toBe(500);
    });

    it('should handle mixed orders with and without order_total', () => {
      const orders = [
        { order_total: 1750 }, // Has order_total
        { order_total: null }, // No order_total
      ];
      
      const ticketPrice = 250;
      const totalTicketCount = 2;
      
      const revenue = calculateTotalRevenue(orders, ticketPrice, totalTicketCount);
      
      // 1750 + (1 * 250) = 2000
      expect(revenue).toBe(2000);
    });

    it('should handle empty orders array', () => {
      const orders: Array<{ order_total: number | null }> = [];
      
      const revenue = calculateTotalRevenue(orders, 250, 0);
      
      expect(revenue).toBe(0);
    });

    it('should handle large order volumes', () => {
      // 100 orders with varying amounts
      const orders = Array.from({ length: 100 }, (_, i) => ({
        order_total: 100 + (i * 10), // 100, 110, 120, ...
      }));
      
      const expectedSum = orders.reduce((sum, o) => sum + (o.order_total || 0), 0);
      const revenue = calculateTotalRevenue(orders, 100, 100);
      
      expect(revenue).toBe(expectedSum);
    });

    it('should handle orders with discounts correctly', () => {
      // Orders at different price points (discounted packages)
      const orders = [
        { order_total: 270 },  // 3 tickets, 10% discount
        { order_total: 400 },  // 5 tickets, 20% discount
        { order_total: 700 },  // 10 tickets, 30% discount
      ];
      
      const revenue = calculateTotalRevenue(orders, 100, 3);
      
      // Sum of actual amounts paid
      expect(revenue).toBe(1370);
    });

    it('should handle zero order_total', () => {
      // Free tickets or fully discounted orders
      const orders = [
        { order_total: 0 },
        { order_total: 500 },
      ];
      
      const revenue = calculateTotalRevenue(orders, 100, 2);
      
      expect(revenue).toBe(500);
    });
  });
});
