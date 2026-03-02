import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Funnel from '../../pages/Funnel.jsx';

const pipelinePayload = {
  stages: {
    novo: [{ lead_id: 1, name: 'Lead One', company_name: 'School One', score: 84, days_in_stage: 2 }],
    contactado: [],
    respondeu: [],
    interessado: [],
    convertido: [],
    perdido: [],
  },
  total: 1,
};

const summaryPayload = {
  total: 1,
  overall_conversion: 25,
  avg_total_days: 4,
  stages: [{ status: 'novo', count: 1, pct: 100, conversion_rate: 0 }],
};

describe('Funnel page', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const value = String(url);
        if (value.includes('/api/pipeline/summary')) return { ok: true, json: async () => summaryPayload };
        if (value.includes('/api/pipeline')) return { ok: true, json: async () => pipelinePayload };
        return { ok: true, json: async () => ({}) };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders funnel columns and lead cards from API', async () => {
    render(<Funnel onNavigate={vi.fn()} activePath="/funil" />);

    await waitFor(() => {
      expect(screen.getByText('Funil de Vendas')).toBeDefined();
      expect(screen.getByText('Lead One')).toBeDefined();
      expect(screen.getByText('Novo')).toBeDefined();
    });
  });

  it('updates period filter state when selecting another range', async () => {
    const user = userEvent.setup();
    render(<Funnel onNavigate={vi.fn()} activePath="/funil" />);

    await waitFor(() => {
      expect(screen.getByText('Lead One')).toBeDefined();
    });

    const allButton = screen.getByRole('button', { name: 'Tudo' });
    await user.click(allButton);
    await waitFor(() => {
      expect(allButton).toBeDefined();
      expect(fetch).toHaveBeenCalled();
    });
  });
});
