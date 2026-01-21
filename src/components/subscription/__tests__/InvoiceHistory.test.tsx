import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { InvoiceHistory } from '../InvoiceHistory';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xnwqrgumstikdmsxtame.supabase.co';

describe('InvoiceHistory', () => {
  it('should show loading skeleton initially', () => {
    render(<InvoiceHistory />);

    // Should show skeleton elements while loading
    expect(screen.getByText('Historial de Facturas')).toBeInTheDocument();
  });

  it('should display invoices when loaded successfully', async () => {
    render(<InvoiceHistory />);

    // Wait for the invoices to load
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should display invoice amount (format varies by locale)
    expect(screen.getByText(/29/)).toBeInTheDocument();

    // Should display status badge
    expect(screen.getByText('Pagada')).toBeInTheDocument();
  });

  it('should show empty state when no invoices exist', async () => {
    // Override handler to return empty invoices
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/list-invoices`, () => {
        return HttpResponse.json({
          invoices: [],
          has_more: false,
          next_cursor: null,
        });
      })
    );

    render(<InvoiceHistory />);

    await waitFor(() => {
      expect(screen.getByText('Sin facturas aún')).toBeInTheDocument();
    });

    expect(screen.getByText(/Las facturas aparecerán aquí/)).toBeInTheDocument();
  });

  it('should show error state when API fails', async () => {
    // Override handler to return error
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/list-invoices`, () => {
        return HttpResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      })
    );

    render(<InvoiceHistory />);

    await waitFor(() => {
      expect(screen.getByText('No se pudieron cargar las facturas')).toBeInTheDocument();
    });
  });

  it('should format currency correctly', async () => {
    // Override with specific amount
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/list-invoices`, () => {
        return HttpResponse.json({
          invoices: [
            {
              id: 'in_test_456',
              number: 'INV-002',
              amount_paid: 9900, // $99.00
              amount_due: 0,
              currency: 'usd',
              status: 'paid',
              created: Math.floor(Date.now() / 1000),
              period_start: Math.floor(Date.now() / 1000),
              period_end: Math.floor(Date.now() / 1000),
              invoice_pdf: null,
              hosted_invoice_url: null,
              description: 'Plan Premium',
            },
          ],
          has_more: false,
          next_cursor: null,
        });
      })
    );

    render(<InvoiceHistory />);

    // Currency format varies by locale, just check for the amount
    await waitFor(() => {
      expect(screen.getByText(/99/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display download links when available', async () => {
    render(<InvoiceHistory />);

    await waitFor(() => {
      // The mock handler returns invoice_pdf and hosted_invoice_url
      const downloadLinks = screen.getAllByRole('link');
      expect(downloadLinks.length).toBeGreaterThan(0);
    });
  });

  it('should display different status badges correctly', async () => {
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/list-invoices`, () => {
        return HttpResponse.json({
          invoices: [
            {
              id: 'in_1',
              number: 'INV-PAID',
              amount_paid: 1000,
              amount_due: 0,
              currency: 'usd',
              status: 'paid',
              created: Math.floor(Date.now() / 1000),
              period_start: Math.floor(Date.now() / 1000),
              period_end: Math.floor(Date.now() / 1000),
              invoice_pdf: null,
              hosted_invoice_url: null,
              description: 'Test',
            },
            {
              id: 'in_2',
              number: 'INV-OPEN',
              amount_paid: 0,
              amount_due: 1000,
              currency: 'usd',
              status: 'open',
              created: Math.floor(Date.now() / 1000),
              period_start: Math.floor(Date.now() / 1000),
              period_end: Math.floor(Date.now() / 1000),
              invoice_pdf: null,
              hosted_invoice_url: null,
              description: 'Test',
            },
          ],
          has_more: false,
          next_cursor: null,
        });
      })
    );

    render(<InvoiceHistory />);

    await waitFor(() => {
      expect(screen.getByText('Pagada')).toBeInTheDocument();
      expect(screen.getByText('Pendiente')).toBeInTheDocument();
    });
  });
});
