import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PaymentMethodCard } from '../PaymentMethodCard';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xnwqrgumstikdmsxtame.supabase.co';

// Mock window.open for portal tests
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', { value: mockWindowOpen, writable: true });

describe('PaymentMethodCard', () => {
  beforeEach(() => {
    mockWindowOpen.mockClear();
  });

  it('should show loading skeleton initially', () => {
    render(<PaymentMethodCard />);

    expect(screen.getByText('Método de Pago')).toBeInTheDocument();
  });

  it('should display payment method when loaded', async () => {
    render(<PaymentMethodCard />);

    await waitFor(() => {
      expect(screen.getByText(/Visa/)).toBeInTheDocument();
    });

    // Should show masked card number
    expect(screen.getByText(/•••• •••• •••• 4242/)).toBeInTheDocument();

    // Should show expiration date
    expect(screen.getByText(/Expira: 12\/2025/)).toBeInTheDocument();
  });

  it('should show "no payment method" when none exists', async () => {
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/get-payment-method`, () => {
        return HttpResponse.json({ payment_method: null });
      })
    );

    render(<PaymentMethodCard />);

    await waitFor(() => {
      expect(screen.getByText('No tienes un método de pago registrado')).toBeInTheDocument();
    });

    // Should show "Add Card" button
    expect(screen.getByText('Agregar Tarjeta')).toBeInTheDocument();
  });

  it('should open customer portal when clicking update button', async () => {
    render(<PaymentMethodCard />);

    await waitFor(() => {
      expect(screen.getByText('Actualizar Tarjeta')).toBeInTheDocument();
    });

    const updateButton = screen.getByText('Actualizar Tarjeta');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://billing.stripe.com/session/test_portal_session',
        '_blank'
      );
    });
  });

  it('should show expiration warning for cards expiring soon', async () => {
    const nextMonth = new Date();
    nextMonth.setDate(1);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/get-payment-method`, () => {
        return HttpResponse.json({
          payment_method: {
            id: 'pm_expiring',
            brand: 'visa',
            last4: '1234',
            exp_month: nextMonth.getMonth() + 1, // 1-indexed
            exp_year: nextMonth.getFullYear(),
          },
        });
      })
    );

    render(<PaymentMethodCard />);

    await waitFor(() => {
      expect(screen.getByText(/Tu tarjeta expira pronto/)).toBeInTheDocument();
    });
  });

  it('should show expired warning for expired cards', async () => {
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/get-payment-method`, () => {
        return HttpResponse.json({
          payment_method: {
            id: 'pm_expired',
            brand: 'mastercard',
            last4: '5678',
            exp_month: 1,
            exp_year: 2020,
          },
        });
      })
    );

    render(<PaymentMethodCard />);

    await waitFor(() => {
      expect(screen.getByText(/Tu tarjeta ha expirado/)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/get-payment-method`, () => {
        return HttpResponse.json(
          { error: 'Service unavailable' },
          { status: 500 }
        );
      })
    );

    render(<PaymentMethodCard />);

    // Component should still render without crashing
    await waitFor(() => {
      expect(screen.getByText('Método de Pago')).toBeInTheDocument();
    });
  });

  it('should display different card brands correctly', async () => {
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/get-payment-method`, () => {
        return HttpResponse.json({
          payment_method: {
            id: 'pm_amex',
            brand: 'amex',
            last4: '0005',
            exp_month: 6,
            exp_year: 2026,
          },
        });
      })
    );

    render(<PaymentMethodCard />);

    await waitFor(() => {
      expect(screen.getByText(/Amex/)).toBeInTheDocument();
    });
  });
});
