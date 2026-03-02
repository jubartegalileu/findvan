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
    window.localStorage.clear();
    let nextTemplateId = 100;
    const templatesByOwner = { all: [], alice: [] };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options) => {
        const value = String(url);
        if (value.includes('/api/sdr/templates/permission')) {
          const parsedUrl = new URL(value, 'http://localhost');
          const owner = parsedUrl.searchParams.get('owner') || 'all';
          const actor = (parsedUrl.searchParams.get('actor') || '').trim();
          const allowed = owner === 'all' ? actor === 'admin' : actor === owner;
          const reason = allowed ? 'ok' : 'Acesso negado para mutação de templates';
          const remediation = allowed
            ? null
            : {
                title: 'Permissão global requer admin',
                description: 'Mutações em templates globais exigem ator admin.',
                next_action: 'Defina o ator como admin ou altere o owner para escopo específico.',
              };
          return { ok: true, json: async () => ({ allowed, owner, actor: actor || null, reason, remediation }) };
        }
        if (value.includes('/api/sdr/templates/audit')) {
          const parsedUrl = new URL(value, 'http://localhost');
          const action = parsedUrl.searchParams.get('action') || '';
          const templateId = Number(parsedUrl.searchParams.get('template_id') || 0);
          if (action === 'permission_denied') {
            return {
              ok: true,
              json: async () => ({
                events: [{ id: 99, template_id: 0, owner: parsedUrl.searchParams.get('owner') || 'all', action: 'permission_denied', actor: 'alice', payload: { reason: 'Acesso negado para mutação de templates' }, created_at: '2026-03-02T11:00:00Z' }],
                count: 1,
              }),
            };
          }
          return {
            ok: true,
            json: async () => ({
              events: templateId
                ? [{ id: 1, template_id: templateId, owner: parsedUrl.searchParams.get('owner') || 'all', action: 'patch', actor: 'system', created_at: '2026-03-02T12:00:00Z' }]
                : [],
              count: templateId ? 1 : 0,
            }),
          };
        }
        if (value.includes('/api/sdr/templates')) {
          const parsedUrl = new URL(value, 'http://localhost');
          if (!options || !options.method || options.method === 'GET') {
            const owner = parsedUrl.searchParams.get('owner') || 'all';
            const templates = templatesByOwner[owner] || [];
            return { ok: true, json: async () => ({ templates, count: templates.length }) };
          }
          if (options.method === 'POST') {
            const body = JSON.parse(String(options?.body || '{}'));
            const owner = String(body.owner || 'all');
            const name = String(body.name || '').trim();
            const existing = (templatesByOwner[owner] || []).find((item) => item.name === name);
            const template = existing || { id: nextTemplateId++ };
            template.owner = owner;
            template.name = name;
            template.next_action_description = body.next_action_description || null;
            template.cadence_days = Number(body.cadence_days || 1);
            template.note = body.note || null;
            template.is_favorite = Boolean(body.is_favorite || false);
            template.sort_order = Number(body.sort_order || ((templatesByOwner[owner] || []).length + 1));
            const ownerList = templatesByOwner[owner] || [];
            templatesByOwner[owner] = [...ownerList.filter((item) => item.name !== name), template];
            return { ok: true, json: async () => ({ status: 'ok', template }) };
          }
          if (options.method === 'PATCH') {
            const body = JSON.parse(String(options?.body || '{}'));
            const owner = String(body.owner || 'all');
            const templateId = Number(parsedUrl.pathname.split('/').pop());
            const ownerList = templatesByOwner[owner] || [];
            const current = ownerList.find((item) => Number(item.id) === templateId);
            if (!current) {
              return { ok: false, json: async () => ({ detail: 'Template não encontrado' }) };
            }
            if (typeof body.is_favorite === 'boolean') current.is_favorite = body.is_favorite;
            if (typeof body.sort_order === 'number') current.sort_order = body.sort_order;
            return { ok: true, json: async () => ({ status: 'ok', template: current }) };
          }
          if (options.method === 'DELETE') {
            const owner = parsedUrl.searchParams.get('owner') || 'all';
            const templateId = Number(parsedUrl.pathname.split('/').pop());
            const ownerList = templatesByOwner[owner] || [];
            templatesByOwner[owner] = ownerList.filter((item) => Number(item.id) !== templateId);
            return { ok: true, json: async () => ({ status: 'ok', template_id: templateId }) };
          }
        }
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

  it('shows remediation guidance when template permission is denied', async () => {
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Como resolver')).toBeDefined();
      expect(screen.getByText('Permissão global requer admin')).toBeDefined();
      expect(screen.getByText(/Próxima ação:/i)).toBeDefined();
    });
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

  it('applies quick template to batch fields', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
    });

    const templateSelect = screen.getByLabelText('Template rapido');
    await act(async () => {
      await user.selectOptions(templateSelect, 'proposta');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Preparar proposta com detalhes do servico')).toBeDefined();
      expect(screen.getByDisplayValue('Enviar proposta personalizada')).toBeDefined();
      expect(screen.getByDisplayValue('2')).toBeDefined();
      expect(screen.getByText('Template aplicado: Enviar proposta.')).toBeDefined();
    });
  });

  it('persists custom template by seller filter', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
    });

    await act(async () => {
      await user.type(screen.getByLabelText('Ator template'), 'admin');
      await user.type(screen.getByPlaceholderText('Ex.: confirmar interesse e horario'), 'Template custom nota');
      await user.type(screen.getByPlaceholderText('Ex.: ligar amanha'), 'Template custom acao');
      await user.clear(screen.getByLabelText('Cadencia (dias)'));
      await user.type(screen.getByLabelText('Cadencia (dias)'), '4');
      await user.type(screen.getByLabelText('Nome template'), 'Template Alice');
      await user.click(screen.getByRole('button', { name: 'Salvar template' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Template salvo no escopo: all.')).toBeDefined();
    });

    const sellerSelect = screen.getByLabelText('Vendedor');
    await act(async () => {
      await user.selectOptions(sellerSelect, 'alice');
    });

    await waitFor(() => {
      const options = Array.from(screen.getByLabelText('Template rapido').querySelectorAll('option')).map((option) => option.textContent);
      expect(options.includes('Template Alice')).toBe(false);
    });

    await act(async () => {
      await user.selectOptions(sellerSelect, 'all');
    });

    await waitFor(() => {
      const options = Array.from(screen.getByLabelText('Template rapido').querySelectorAll('option')).map((option) => option.textContent);
      expect(options.includes('Template Alice')).toBe(true);
    });
  });

  it('shows friendly feedback when template save is forbidden', async () => {
    const user = userEvent.setup();
    const baseImpl = fetch.getMockImplementation();
    fetch.mockImplementation(async (url, options) => {
      const value = String(url);
      if (value.includes('/api/sdr/templates') && options?.method === 'POST') {
        return { ok: false, status: 403, json: async () => ({ detail: 'forbidden' }) };
      }
      return baseImpl(url, options);
    });

    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
    });

    await act(async () => {
      await user.type(screen.getByLabelText('Ator template'), 'admin');
      await user.type(screen.getByPlaceholderText('Ex.: confirmar interesse e horario'), 'Template custom nota');
      await user.type(screen.getByLabelText('Nome template'), 'Template Negado');
      await user.click(screen.getByRole('button', { name: 'Salvar template' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Acesso negado para operar template neste escopo.')).toBeDefined();
    });
  });

  it('updates selected custom template favorite via API', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
    });

    await act(async () => {
      await user.type(screen.getByLabelText('Ator template'), 'admin');
      await user.type(screen.getByPlaceholderText('Ex.: confirmar interesse e horario'), 'Nota favorita');
      await user.type(screen.getByLabelText('Nome template'), 'Template Favorito');
      await user.click(screen.getByRole('button', { name: 'Salvar template' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Template salvo no escopo: all.')).toBeDefined();
    });

    await act(async () => {
      await user.selectOptions(screen.getByLabelText('Template rapido'), 'custom-100');
      await user.click(screen.getByRole('button', { name: 'Favoritar' }));
    });

    await waitFor(() => {
      const patchCalls = fetch.mock.calls.filter(
        ([url, options]) =>
          String(url).includes('/api/sdr/templates/100') &&
          options?.method === 'PATCH' &&
          String(options?.body || '').includes('"is_favorite":true')
      );
      expect(patchCalls.length).toBeGreaterThan(0);
      expect(screen.getByText('Template atualizado: Template Favorito.')).toBeDefined();
    });
  });

  it('uses team scope owner namespace for templates API', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
    });

    await act(async () => {
      await user.selectOptions(screen.getByLabelText('Escopo templates'), 'team');
      await user.clear(screen.getByLabelText('Nome equipe'));
      await user.type(screen.getByLabelText('Nome equipe'), 'Ops Squad!!');
    });

    await waitFor(() => {
      const teamQueryCalls = fetch.mock.calls.filter(([url]) => String(url).includes('/api/sdr/templates?owner=team%3Aops-squad'));
      expect(teamQueryCalls.length).toBeGreaterThan(0);
      expect(screen.getByText('Owner efetivo de templates: team:ops-squad')).toBeDefined();
    });

    await act(async () => {
      await user.type(screen.getByPlaceholderText('Ex.: confirmar interesse e horario'), 'Nota equipe');
      await user.type(screen.getByLabelText('Nome template'), 'Template Ops');
      await user.click(screen.getByRole('button', { name: 'Salvar template' }));
    });

    await waitFor(() => {
      const saveCalls = fetch.mock.calls.filter(
        ([url, options]) =>
          String(url).includes('/api/sdr/templates') &&
          options?.method === 'POST' &&
          String(options?.body || '').includes('"owner":"team:ops-squad"')
      );
      expect(saveCalls.length).toBeGreaterThan(0);
    });
  });

  it('shows template audit history for selected custom template', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
    });

    await act(async () => {
      await user.type(screen.getByLabelText('Ator template'), 'admin');
      await user.type(screen.getByPlaceholderText('Ex.: confirmar interesse e horario'), 'Nota auditoria');
      await user.type(screen.getByLabelText('Nome template'), 'Template Audit');
      await user.click(screen.getByRole('button', { name: 'Salvar template' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Template salvo no escopo: all.')).toBeDefined();
    });

    await act(async () => {
      await user.selectOptions(screen.getByLabelText('Template rapido'), 'custom-100');
    });

    await waitFor(() => {
      expect(screen.getByText('Auditoria do template: Template Audit')).toBeDefined();
      const auditCalls = fetch.mock.calls.filter(([url]) => String(url).includes('/api/sdr/templates/audit'));
      expect(auditCalls.length).toBeGreaterThan(0);
      expect(screen.getByText('patch')).toBeDefined();
    });
  });

  it('propagates explicit admin actor for global template mutations', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Lead Alpha')).toBeDefined();
      expect(screen.getByText('Escopo global requer ator `admin` para mutacoes de template.')).toBeDefined();
    });

    await act(async () => {
      await user.type(screen.getByLabelText('Ator template'), 'admin');
      await user.type(screen.getByPlaceholderText('Ex.: confirmar interesse e horario'), 'Nota admin');
      await user.type(screen.getByLabelText('Nome template'), 'Template Global Admin');
      await user.click(screen.getByRole('button', { name: 'Salvar template' }));
    });

    await waitFor(() => {
      const saveCalls = fetch.mock.calls.filter(
        ([url, options]) =>
          String(url).includes('/api/sdr/templates') &&
          options?.method === 'POST' &&
          String(options?.body || '').includes('"owner":"all"') &&
          String(options?.body || '').includes('"actor":"admin"')
      );
      expect(saveCalls.length).toBeGreaterThan(0);
      expect(screen.getByText('Ator efetivo de templates: admin')).toBeDefined();
    });
  });

  it('shows denial audit summary for current owner', async () => {
    await act(async () => {
      render(<SDR onNavigate={vi.fn()} activePath="/sdr" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Bloqueios recentes (owner): 1')).toBeDefined();
      expect(screen.getByText('Ultimo bloqueio: Acesso negado para mutação de templates')).toBeDefined();
    });
  });
});
