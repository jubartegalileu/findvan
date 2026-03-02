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

  it('filters by estado/cidade/busca with GET /api/leads', async () => {
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
      expect(screen.getByRole('button', { name: /Alpha Escola/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Beta Colegio/i })).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Santos' } });
    expect(screen.getByRole('button', { name: /Alpha Escola/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Beta Colegio/i })).toBeNull();

    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'SP' } });
    expect(screen.getByRole('button', { name: /Alpha Escola/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Beta Colegio/i })).toBeDefined();

    fireEvent.change(screen.getByLabelText('Busca'), { target: { value: 'beta' } });
    expect(screen.queryByRole('button', { name: /Alpha Escola/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Beta Colegio/i })).toBeDefined();

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/leads/?limit='));
  });

  it('saves edited lead with PATCH payload without funnel/cadence fields', async () => {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options = {}) => {
        calls.push([String(url), options]);
        const value = String(url);
        if (value.includes('/api/leads/?limit=')) return ok({ leads: baseLeads });
        if (value.includes('/api/leads/1') && options.method === 'PATCH') {
          const body = JSON.parse(options.body);
          return ok({ lead: { ...baseLeads[0], ...body } });
        }
        return ok({});
      })
    );

    render(<Leads onNavigate={vi.fn()} activePath="/leads" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Alpha Escola/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Alpha Escola/i }));

    await waitFor(() => {
      expect(screen.getByText(/Detalhes do lead/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Alpha Editada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alteracoes' }));

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
    expect(patchBody).not.toHaveProperty('next_action_date');
    expect(patchBody).not.toHaveProperty('next_action_description');
  });

  it('refreshes all filters on Atualizar and reloads page 1', async () => {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        calls.push(String(url));
        if (String(url).includes('/api/leads/?limit=')) return ok({ leads: baseLeads });
        return ok({});
      })
    );

    render(<Leads onNavigate={vi.fn()} activePath="/leads" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Alpha Escola/i })).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'SP' } });
    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Santos' } });
    fireEvent.change(screen.getByLabelText('Busca'), { target: { value: 'alpha' } });

    fireEvent.click(screen.getByRole('button', { name: 'Proxima pagina' }));
    await waitFor(() => {
      expect(screen.getByText(/pagina 2/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar leads' }));

    await waitFor(() => {
      expect(screen.getByText(/pagina 1/i)).toBeDefined();
    });
    expect(screen.getByLabelText('Estado').value).toBe('');
    expect(screen.getByLabelText('Cidade').value).toBe('');
    expect(screen.getByLabelText('Busca').value).toBe('');
    expect(calls.filter((url) => url.includes('/api/leads/?limit=')).length).toBeGreaterThanOrEqual(3);
  });

  it('imports leads via /api/leads/import and reloads list', async () => {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options = {}) => {
        calls.push([String(url), options]);
        const value = String(url);
        if (value.includes('/api/leads/import')) {
          return ok({
            inserted: 2,
            duplicates: 1,
            deduplicated_in_file: 3,
          });
        }
        if (value.includes('/api/leads/?limit=')) return ok({ leads: baseLeads });
        return ok({});
      })
    );

    render(<Leads onNavigate={vi.fn()} activePath="/leads" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Alpha Escola/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Importar' }));
    const fileInput = screen.getByLabelText('Arquivo de leads');
    fireEvent.change(fileInput, {
      target: { files: [new File(['nome,cidade\nAlpha,Santos'], 'import.csv', { type: 'text/csv' })] },
    });

    await waitFor(() => {
      expect(screen.getByText(/Importacao concluida/i)).toBeDefined();
    });

    const importCall = calls.find(([url]) => url.includes('/api/leads/import'));
    expect(importCall).toBeDefined();
    expect(importCall[1].method).toBe('POST');
    expect(importCall[1].body).toBeInstanceOf(FormData);
    expect(calls.filter(([url]) => url.includes('/api/leads/?limit=')).length).toBeGreaterThanOrEqual(2);
  });
});
