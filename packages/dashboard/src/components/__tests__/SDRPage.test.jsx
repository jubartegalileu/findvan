import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SDR from '../../pages/SDR.jsx';

const queuePayload = {
  queue: [
    {
      lead_id: 1,
      name: 'Lead Alpha',
      company_name: 'Alpha School',
      phone: '11999990001',
      city: 'Santos',
      score: 88,
      cadence_bucket: 'overdue',
      next_action_description: 'Ligar',
      last_contact_at: null,
      next_action_date: null,
    },
    {
      lead_id: 2,
      name: 'Lead Beta',
      company_name: 'Beta School',
      phone: '11999990002',
      city: 'Sao Paulo',
      score: 75,
      cadence_bucket: 'planned',
      next_action_description: 'Enviar proposta',
      last_contact_at: null,
      next_action_date: null,
    },
  ],
  count: 2,
};

const statsPayload = { total: 2, done_today: 1, pending: 1, overdue: 1 };

describe('SDR page', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const value = String(url);
        if (value.includes('/api/sdr/queue')) return { ok: true, json: async () => queuePayload };
        if (value.includes('/api/sdr/stats')) return { ok: true, json: async () => statsPayload };
        return { ok: true, json: async () => ({}) };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders queue and stats from API', async () => {
    render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
      expect(screen.getByText('Lead Beta')).toBeDefined();
    });

    expect(screen.getByText('1 / 1')).toBeDefined();
  });

  it('filters queue by cadence checkbox', async () => {
    const user = userEvent.setup();
    render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
      expect(screen.getByText('Lead Beta')).toBeDefined();
    });

    const plannedCheckbox = screen.getByLabelText('Planejada');
    await user.click(plannedCheckbox);
    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
      expect(screen.queryByText('Lead Beta')).toBeNull();
    });
  });
});
