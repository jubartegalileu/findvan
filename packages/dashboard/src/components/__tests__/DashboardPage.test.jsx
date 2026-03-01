import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../../pages/Dashboard.jsx';

const ok = (payload) => ({
  ok: true,
  status: 200,
  json: async () => payload,
});

const fail = (status = 500, payload = {}) => ({
  ok: false,
  status,
  json: async () => payload,
});

describe('Dashboard page', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('consumes /api/sdr/stats and /api/pipeline/summary endpoints', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const value = String(url);
        if (value.includes('/api/leads/')) return ok({ leads: [{ id: 1, city: 'Santos', is_valid: true }] });
        if (value.includes('/api/sdr/stats')) return ok({ total: 10, done_today: 3, pending: 7, overdue: 1 });
        if (value.includes('/api/pipeline/summary')) {
          return ok({
            total: 10,
            overall_conversion: 20,
            stages: [{ status: 'novo', count: 10, pct: 100, conversion_rate: 0 }],
          });
        }
        if (value.includes('/api/dashboard/urgent-actions')) return ok({ urgent_actions: { alerts: [], all_clear: true } });
        if (value.includes('/api/dashboard/weekly-performance')) return ok({ performance: { has_data: false, labels: [], series: [] } });
        if (value.includes('/api/scraper/runs')) return ok({ runs: [] });
        if (value.includes('/api/activity')) return ok({ events: [] });
        if (value.includes('/api/integrations/messaging/receipts')) return ok({ events: [] });
        return fail(404, {});
      })
    );

    render(<Dashboard onNavigate={vi.fn()} activePath="/dashboard" />);

    await waitFor(() => {
      expect(screen.getByText('Visão Geral')).toBeDefined();
      expect(screen.getByText(/Taxa de conversão geral/)).toBeDefined();
    });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/sdr/stats'));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/pipeline/summary'));
  });

  it('shows graceful fallback when SDR/Pipeline APIs fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const value = String(url);
        if (value.includes('/api/leads/')) return ok({ leads: [{ id: 1, city: 'Santos', is_valid: true }] });
        if (value.includes('/api/sdr/stats')) return fail(500, { detail: 'unavailable' });
        if (value.includes('/api/pipeline/summary')) return fail(500, { detail: 'unavailable' });
        if (value.includes('/api/scraper/runs')) return ok({ runs: [] });
        if (value.includes('/api/dashboard/urgent-actions')) return ok({ urgent_actions: { alerts: [], all_clear: true } });
        if (value.includes('/api/dashboard/weekly-performance')) return ok({ performance: { has_data: false, labels: [], series: [] } });
        if (value.includes('/api/activity')) return ok({ events: [] });
        if (value.includes('/api/integrations/messaging/receipts')) return ok({ events: [] });
        return fail(404, {});
      })
    );

    render(<Dashboard onNavigate={vi.fn()} activePath="/dashboard" />);

    await waitFor(() => {
      expect(screen.getByText('Dados indisponíveis (pipeline).')).toBeDefined();
    });

    expect(screen.getAllByText('Dados indisponíveis').length).toBeGreaterThan(0);
  });
});
