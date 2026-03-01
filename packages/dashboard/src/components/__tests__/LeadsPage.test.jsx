import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Leads from '../../pages/Leads.jsx';

const ok = (payload) => ({ ok: true, status: 200, json: async () => payload });

const baseLeads = [
  {
    id: 1,
    name: 'Alpha Escola',
    company_name: 'Alpha Escola',
    city: 'Santos',
    state: 'SP',
    phone: '1111-1111',
    email: 'a@alpha.com',
    source: 'google_maps',
    tags: ['frio'],
    score: 85,
    is_valid: true,
    is_duplicate: false,
  },
  {
    id: 2,
    name: 'Beta Colegio',
    company_name: 'Beta Colegio',
    city: 'Campinas',
    state: 'SP',
    phone: '2222-2222',
    email: 'b@beta.com',
    source: 'manual',
    tags: ['quente'],
    score: 60,
    is_valid: false,
    is_duplicate: false,
  },
];

describe('Leads page', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('filters by city/source/validity/search with GET /api/leads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const value = String(url);
        if (value.includes('/api/leads/?limit=')) return ok({ leads: baseLeads });
        return ok({});
      })
    );

    render(<Leads onNavigate={vi.fn()} activePath="/leads" />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Escola')).toBeDefined();
      expect(screen.getByText('Beta Colegio')).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Santos' } });
    expect(screen.getByText('Alpha Escola')).toBeDefined();
    expect(screen.queryByText('Beta Colegio')).toBeNull();

    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Fonte'), { target: { value: 'manual' } });
    expect(screen.queryByText('Alpha Escola')).toBeNull();
    expect(screen.getByText('Beta Colegio')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Fonte'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Validade'), { target: { value: 'valid' } });
    expect(screen.getByText('Alpha Escola')).toBeDefined();
    expect(screen.queryByText('Beta Colegio')).toBeNull();

    fireEvent.change(screen.getByLabelText('Validade'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Busca'), { target: { value: 'beta' } });
    expect(screen.queryByText('Alpha Escola')).toBeNull();
    expect(screen.getByText('Beta Colegio')).toBeDefined();

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/leads/?limit='));
  });

  it('saves edited lead with PATCH payload without funnel/cadence/prospect fields', async () => {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options = {}) => {
        calls.push([String(url), options]);
        const value = String(url);
        if (value.includes('/api/leads/?limit=')) return ok({ leads: baseLeads });
        if (value.includes('/api/leads/1/score')) return ok({ score: 85, breakdown: { name: true } });
        if (value.includes('/api/leads/1') && options.method === 'PATCH') {
          const body = JSON.parse(options.body);
          return ok({ lead: { ...baseLeads[0], ...body } });
        }
        return ok({});
      })
    );

    render(<Leads onNavigate={vi.fn()} activePath="/leads" />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Escola')).toBeDefined();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);

    await waitFor(() => {
      expect(screen.getByText('Editar Lead #1')).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Alpha Editada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(screen.getAllByText('Lead atualizado com sucesso.').length).toBeGreaterThan(0);
    });

    const patchCall = calls.find(([url, options]) => url.includes('/api/leads/1') && options.method === 'PATCH');
    expect(patchCall).toBeDefined();
    const patchBody = JSON.parse(patchCall[1].body);

    expect(patchBody.name).toBe('Alpha Editada');
    expect(patchBody).not.toHaveProperty('funnel_status');
    expect(patchBody).not.toHaveProperty('loss_reason');
    expect(patchBody).not.toHaveProperty('prospect_status');
    expect(patchBody).not.toHaveProperty('prospect_notes');
    expect(patchBody).not.toHaveProperty('next_action_date');
    expect(patchBody).not.toHaveProperty('next_action_description');
  });
});
