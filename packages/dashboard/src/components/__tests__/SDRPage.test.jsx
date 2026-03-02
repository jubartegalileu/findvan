import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
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
      assigned_to: 'alice',
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
      assigned_to: 'bob',
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
      vi.fn(async (url, options) => {
        const value = String(url);
        if (value.includes('/api/sdr/notes/batch')) {
          const body = JSON.parse(String(options?.body || '{}'));
          const leadIds = Array.isArray(body.lead_ids) ? body.lead_ids : [];
          return { ok: true, json: async () => ({ status: 'ok', updated_count: leadIds.length, lead_ids: leadIds }) };
        }
        if (value.includes('/api/sdr/action/batch')) {
          const body = JSON.parse(String(options?.body || '{}'));
          const leadIds = Array.isArray(body.lead_ids) ? body.lead_ids : [];
          return { ok: true, json: async () => ({ status: 'ok', updated_count: leadIds.length, lead_ids: leadIds, action_type: 'done' }) };
        }
        if (value.includes('/api/sdr/assign/batch')) {
          const body = JSON.parse(String(options?.body || '{}'));
          const leadIds = Array.isArray(body.lead_ids) ? body.lead_ids : [];
          return { ok: true, json: async () => ({ status: 'ok', updated_count: leadIds.length, lead_ids: leadIds, assigned_to: 'danilo' }) };
        }
        if (value.includes('/api/sdr/') && value.includes('/assign')) return { ok: true, json: async () => ({ status: 'ok' }) };
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
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
      expect(screen.getByText('Lead Beta')).toBeDefined();
    });

    expect(screen.getByText('1 / 1')).toBeDefined();
  });

  it('filters queue by cadence checkbox', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
      expect(screen.getByText('Lead Beta')).toBeDefined();
      expect(screen.getByText('1 / 1')).toBeDefined();
      expect(screen.queryByText('Carregando fila SDR...')).toBeNull();
    });

    const plannedCheckbox = screen.getByLabelText('Planejada');
    await act(async () => {
      await user.click(plannedCheckbox);
    });
    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
      expect(screen.queryByText('Lead Beta')).toBeNull();
      expect(screen.getByText('1 / 1')).toBeDefined();
      expect(screen.queryByText('Carregando fila SDR...')).toBeNull();
    });
  });

  it('forwards assigned_to when seller filter changes', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
      expect(screen.getByText('Lead Beta')).toBeDefined();
    });

    const sellerSelect = screen.getByLabelText('Vendedor');
    await act(async () => {
      await user.selectOptions(sellerSelect, 'alice');
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      const calledUrls = fetch.mock.calls.map(([url]) => String(url));
      expect(calledUrls.some((url) => url.includes('/api/sdr/queue') && url.includes('assigned_to=alice'))).toBe(true);
      expect(calledUrls.some((url) => url.includes('/api/sdr/stats') && url.includes('assigned_to=alice'))).toBe(true);
    });
  });

  it('sends assign request for a lead', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
    });

    const inputs = screen.getAllByPlaceholderText('Atribuir vendedor');
    await act(async () => {
      await user.clear(inputs[0]);
      await user.type(inputs[0], 'carol');
    });

    const assignButtons = screen.getAllByRole('button', { name: 'Atribuir' });
    await act(async () => {
      await user.click(assignButtons[0]);
    });

    await waitFor(() => {
      const patchCalls = fetch.mock.calls.filter(
        ([url, options]) =>
          String(url).includes('/api/sdr/1/assign') &&
          options?.method === 'PATCH' &&
          String(options?.body || '').includes('"assigned_to":"carol"')
      );
      expect(patchCalls.length).toBeGreaterThan(0);
    });
  });

  it('sends batch assign request for selected leads', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
      expect(screen.getByText('Lead Beta')).toBeDefined();
    });

    await act(async () => {
      await user.click(screen.getByLabelText('Selecionar lead 1'));
      await user.click(screen.getByLabelText('Selecionar lead 2'));
    });

    const batchInput = screen.getByPlaceholderText('Vendedor lote');
    await act(async () => {
      await user.type(batchInput, 'danilo');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Atribuir em lote' }));
    });

    await waitFor(() => {
      const patchCalls = fetch.mock.calls.filter(
        ([url, options]) =>
          String(url).includes('/api/sdr/assign/batch') &&
          options?.method === 'PATCH' &&
          String(options?.body || '').includes('"lead_ids":[1,2]') &&
          String(options?.body || '').includes('"assigned_to":"danilo"')
      );
      expect(patchCalls.length).toBeGreaterThan(0);
    });

    expect(screen.getByText('2 lead(s) atribuido(s) com sucesso.')).toBeDefined();
  });

  it('shows backend error when batch assign fails', async () => {
    const user = userEvent.setup();
    fetch.mockImplementationOnce(async (url) => {
      const value = String(url);
      if (value.includes('/api/sdr/queue')) return { ok: true, json: async () => queuePayload };
      return { ok: true, json: async () => statsPayload };
    });
    fetch.mockImplementationOnce(async (url) => {
      const value = String(url);
      if (value.includes('/api/sdr/stats')) return { ok: true, json: async () => statsPayload };
      return { ok: true, json: async () => queuePayload };
    });
    fetch.mockImplementation(async (url) => {
      const value = String(url);
      if (value.includes('/api/sdr/assign/batch')) {
        return { ok: false, json: async () => ({ detail: 'Nenhum lead encontrado para atribuição' }) };
      }
      if (value.includes('/api/sdr/queue')) return { ok: true, json: async () => queuePayload };
      if (value.includes('/api/sdr/stats')) return { ok: true, json: async () => statsPayload };
      return { ok: true, json: async () => ({}) };
    });

    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
    });

    await act(async () => {
      await user.click(screen.getByLabelText('Selecionar lead 1'));
      await user.type(screen.getByPlaceholderText('Vendedor lote'), 'danilo');
      await user.click(screen.getByRole('button', { name: 'Atribuir em lote' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Operacao em lote falhou: Nenhum lead encontrado para atribuição')).toBeDefined();
    });
  });

  it('sends batch done action request for selected leads', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
    });

    await act(async () => {
      await user.click(screen.getByLabelText('Selecionar lead 1'));
      await user.click(screen.getByRole('button', { name: 'Marcar lote como feito' }));
    });

    await waitFor(() => {
      const patchCalls = fetch.mock.calls.filter(
        ([url, options]) =>
          String(url).includes('/api/sdr/action/batch') &&
          options?.method === 'PATCH' &&
          String(options?.body || '').includes('"lead_ids":[1]') &&
          String(options?.body || '').includes('"action_type":"done"')
      );
      expect(patchCalls.length).toBeGreaterThan(0);
    });

    expect(screen.getByText('1 lead(s) marcado(s) como feito.')).toBeDefined();
  });

  it('keeps non-updated leads selected on partial batch assign response', async () => {
    const user = userEvent.setup();
    fetch.mockImplementation(async (url, options) => {
      const value = String(url);
      if (value.includes('/api/sdr/assign/batch')) {
        return { ok: true, json: async () => ({ status: 'ok', updated_count: 1, lead_ids: [1], assigned_to: 'danilo' }) };
      }
      if (value.includes('/api/sdr/action/batch')) {
        const body = JSON.parse(String(options?.body || '{}'));
        const leadIds = Array.isArray(body.lead_ids) ? body.lead_ids : [];
        return { ok: true, json: async () => ({ status: 'ok', updated_count: leadIds.length, lead_ids: leadIds, action_type: 'done' }) };
      }
      if (value.includes('/api/sdr/') && value.includes('/assign')) return { ok: true, json: async () => ({ status: 'ok' }) };
      if (value.includes('/api/sdr/queue')) return { ok: true, json: async () => queuePayload };
      if (value.includes('/api/sdr/stats')) return { ok: true, json: async () => statsPayload };
      return { ok: true, json: async () => ({}) };
    });

    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
      expect(screen.getByText('Lead Beta')).toBeDefined();
    });

    await act(async () => {
      await user.click(screen.getByLabelText('Selecionar lead 1'));
      await user.click(screen.getByLabelText('Selecionar lead 2'));
      await user.type(screen.getByPlaceholderText('Vendedor lote'), 'danilo');
      await user.click(screen.getByRole('button', { name: 'Atribuir em lote' }));
    });

    await waitFor(() => {
      expect(screen.getByText('1 de 2 lead(s) atribuido(s) com sucesso. 1 permanece(m) selecionado(s).')).toBeDefined();
      expect(screen.getByText('1 selecionados')).toBeDefined();
    });
  });

  it('sends batch schedule action request with next action fields', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
      expect(screen.getByText('Lead Beta')).toBeDefined();
    });

    await act(async () => {
      await user.click(screen.getByLabelText('Selecionar lead 1'));
      await user.type(screen.getByPlaceholderText('Ex.: ligar amanha'), 'Enviar proposta personalizada');
      await user.type(screen.getByLabelText('Data/hora'), '2026-03-03T10:30');
      await user.clear(screen.getByLabelText('Cadencia (dias)'));
      await user.type(screen.getByLabelText('Cadencia (dias)'), '3');
      await user.click(screen.getByRole('button', { name: 'Agendar proxima acao em lote' }));
    });

    await waitFor(() => {
      const patchCalls = fetch.mock.calls.filter(
        ([url, options]) =>
          String(url).includes('/api/sdr/action/batch') &&
          options?.method === 'PATCH' &&
          String(options?.body || '').includes('"lead_ids":[1]') &&
          String(options?.body || '').includes('"action_type":"scheduled"') &&
          String(options?.body || '').includes('"next_action_description":"Enviar proposta personalizada"') &&
          String(options?.body || '').includes('"next_action_date":"2026-03-03T10:30"') &&
          String(options?.body || '').includes('"cadence_days":3')
      );
      expect(patchCalls.length).toBeGreaterThan(0);
    });

    expect(screen.getByText('1 lead(s) com proxima acao agendada.')).toBeDefined();
  });

  it('sends batch note request and shows success feedback', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
      expect(screen.getByText('Lead Beta')).toBeDefined();
    });

    await act(async () => {
      await user.click(screen.getByLabelText('Selecionar lead 1'));
      await user.type(screen.getByPlaceholderText('Ex.: confirmar interesse e horario'), 'Retornar no periodo da tarde');
      await user.click(screen.getByRole('button', { name: 'Adicionar nota em lote' }));
    });

    await waitFor(() => {
      const patchCalls = fetch.mock.calls.filter(
        ([url, options]) =>
          String(url).includes('/api/sdr/notes/batch') &&
          options?.method === 'PATCH' &&
          String(options?.body || '').includes('"lead_ids":[1]') &&
          String(options?.body || '').includes('"note":"Retornar no periodo da tarde"')
      );
      expect(patchCalls.length).toBeGreaterThan(0);
    });

    expect(screen.getByText('1 lead(s) com nota registrada em lote.')).toBeDefined();
  });
});
