import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { supabase } from '@/integrations/supabase/client';
import { useReserveTickets } from '../usePublicRaffle';

describe('useReserveTickets - Race Conditions & Atomic Rollback', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  const mockBuyerData = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '1234567890',
    city: 'Test City',
  };

  it('should reserve all tickets atomically in a single operation', async () => {
    const mockReservedTickets = [
      { id: '1', ticket_number: '0001', status: 'reserved' },
      { id: '2', ticket_number: '0002', status: 'reserved' },
      { id: '3', ticket_number: '0003', status: 'reserved' },
    ];

    // Mock the chained Supabase calls
    const selectMock = vi.fn().mockResolvedValue({
      data: mockReservedTickets,
      error: null,
    });

    const inMock = vi.fn().mockReturnValue({ select: selectMock });
    const eqStatusMock = vi.fn().mockReturnValue({ in: inMock });
    const eqRaffleMock = vi.fn().mockReturnValue({ eq: eqStatusMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqRaffleMock });
    
    (supabase.from as any).mockReturnValue({ update: updateMock });

    const { result } = renderHook(() => useReserveTickets(), { wrapper });

    await result.current.mutateAsync({
      raffleId: 'test-raffle-id',
      ticketNumbers: ['0001', '0002', '0003'],
      buyerData: mockBuyerData,
      reservationMinutes: 15,
    });

    // Verify atomic operation: single update call with .in() for all tickets
    expect(supabase.from).toHaveBeenCalledWith('tickets');
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(inMock).toHaveBeenCalledWith('ticket_number', ['0001', '0002', '0003']);
  });

  it('should rollback if not all tickets are reserved', async () => {
    // Simulate only 2 of 3 tickets being reserved (race condition)
    const partialReservedTickets = [
      { id: '1', ticket_number: '0001', status: 'reserved' },
      { id: '2', ticket_number: '0002', status: 'reserved' },
      // '0003' was taken by another user
    ];

    const selectMock = vi.fn().mockResolvedValue({
      data: partialReservedTickets,
      error: null,
    });

    // First call - partial reserve
    const inMock = vi.fn().mockReturnValue({ select: selectMock });
    const eqStatusMock = vi.fn().mockReturnValue({ in: inMock });
    const eqRaffleMock = vi.fn().mockReturnValue({ eq: eqStatusMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqRaffleMock });

    // Rollback call mock
    const rollbackSelectMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const rollbackEqRefMock = vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null }));
    const rollbackEqRaffleMock = vi.fn().mockReturnValue({ eq: rollbackEqRefMock });
    const rollbackUpdateMock = vi.fn().mockReturnValue({ eq: rollbackEqRaffleMock });

    let callCount = 0;
    (supabase.from as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return { update: updateMock };
      }
      // Rollback call
      return { update: rollbackUpdateMock };
    });

    const { result } = renderHook(() => useReserveTickets(), { wrapper });

    await expect(
      result.current.mutateAsync({
        raffleId: 'test-raffle-id',
        ticketNumbers: ['0001', '0002', '0003'],
        buyerData: mockBuyerData,
        reservationMinutes: 15,
      })
    ).rejects.toThrow('boleto(s) ya no estaban disponibles');

    // Verify rollback was attempted
    expect(rollbackUpdateMock).toHaveBeenCalled();
  });

  it('should include all buyer data in the reservation', async () => {
    const mockReservedTickets = [
      { id: '1', ticket_number: '0001', status: 'reserved' },
    ];

    const selectMock = vi.fn().mockResolvedValue({
      data: mockReservedTickets,
      error: null,
    });

    const inMock = vi.fn().mockReturnValue({ select: selectMock });
    const eqStatusMock = vi.fn().mockReturnValue({ in: inMock });
    const eqRaffleMock = vi.fn().mockReturnValue({ eq: eqStatusMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqRaffleMock });

    (supabase.from as any).mockReturnValue({ update: updateMock });

    const { result } = renderHook(() => useReserveTickets(), { wrapper });

    await result.current.mutateAsync({
      raffleId: 'test-raffle-id',
      ticketNumbers: ['0001'],
      buyerData: mockBuyerData,
      reservationMinutes: 15,
    });

    // Verify buyer data is included
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        buyer_name: 'Test User',
        buyer_email: 'test@example.com',
        buyer_phone: '1234567890',
        buyer_city: 'Test City',
        status: 'reserved',
      })
    );
  });

  it('should generate a unique reference code for the reservation', async () => {
    const mockReservedTickets = [
      { id: '1', ticket_number: '0001', status: 'reserved' },
    ];

    const selectMock = vi.fn().mockResolvedValue({
      data: mockReservedTickets,
      error: null,
    });

    const inMock = vi.fn().mockReturnValue({ select: selectMock });
    const eqStatusMock = vi.fn().mockReturnValue({ in: inMock });
    const eqRaffleMock = vi.fn().mockReturnValue({ eq: eqStatusMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqRaffleMock });

    (supabase.from as any).mockReturnValue({ update: updateMock });

    const { result } = renderHook(() => useReserveTickets(), { wrapper });

    const response = await result.current.mutateAsync({
      raffleId: 'test-raffle-id',
      ticketNumbers: ['0001'],
      buyerData: mockBuyerData,
      reservationMinutes: 15,
    });

    // Verify reference code is generated
    expect(response.referenceCode).toBeDefined();
    expect(response.referenceCode).toHaveLength(8);
    expect(response.referenceCode).toMatch(/^[A-Z0-9]+$/);
  });
});
