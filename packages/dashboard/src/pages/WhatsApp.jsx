import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { API_BASE } from '../lib/apiBase.js';
import {
  addMessagingActivity,
  clearMessagingActivity,
  readMessagingActivity,
} from '../lib/messagingActivity.js';
import { buildCampaignMonitoring, fetchCampaignMonitoringData } from '../lib/campaignMonitoring.js';
import './dashboard.css';

const templates = [
  { title: 'Primeiro contato', status: 'Ativo' },
  { title: 'Follow-up 3 dias', status: 'Ativo' },
  { title: 'Reativação fria', status: 'Rascunho' },
];

const statusClass = {
  'Em execução': 'em-execucao',
  Agendada: 'agendada',
  Ativo: 'ativo',
  Rascunho: 'rascunho',
};

const defaultMessage =
  'Olá, tudo bem? Somos da FindVan e podemos ajudar com captação de novos alunos para transporte escolar.';

const getInitialLeadId = () => {
  try {
    return new URLSearchParams(window.location.search).get('leadId') || '';
  } catch {
    return '';
  }
};

export default function WhatsApp({ onNavigate, activePath }) {
  const [contracts, setContracts] = useState(null);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [contractsError, setContractsError] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendResult, setSendResult] = useState(null);
  const [activity, setActivity] = useState([]);
  const [monitoring, setMonitoring] = useState({
    items: [],
    totals: { campaigns: 0, leads: 0, sent: 0, delivered: 0, replied: 0, failed: 0 },
  });
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [monitoringError, setMonitoringError] = useState('');
  const [monitoringUpdatedAt, setMonitoringUpdatedAt] = useState('');

  const [form, setForm] = useState({
    lead_id: getInitialLeadId(),
    to: '',
    content: defaultMessage,
    provider: '',
    dry_run: true,
  });

  const providers = useMemo(() => {
    const list = contracts?.readiness?.available_messaging_providers;
    if (!Array.isArray(list) || list.length === 0) return ['noop', 'twilio'];
    return list;
  }, [contracts]);

  const loadContracts = async () => {
    setContractsLoading(true);
    setContractsError('');

    try {
      const response = await fetch(`${API_BASE}/api/integrations/contracts`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao carregar status da integração.');
      }

      setContracts(payload);
      setForm((prev) => ({
        ...prev,
        provider: prev.provider || payload?.readiness?.requested_messaging_provider || 'noop',
      }));
    } catch (error) {
      setContractsError(error.message || 'Falha de conexão com backend.');
    } finally {
      setContractsLoading(false);
    }
  };

  const loadMonitoring = async () => {
    setMonitoringLoading(true);
    setMonitoringError('');
    try {
      const { leads, receipts } = await fetchCampaignMonitoringData();
      const result = buildCampaignMonitoring({
        leads,
        receipts,
        activity: readMessagingActivity(),
      });
      setMonitoring(result);
      setMonitoringUpdatedAt(new Date().toLocaleTimeString('pt-BR'));
    } catch (error) {
      setMonitoringError(error?.message || 'Falha ao carregar monitoramento de campanhas.');
    } finally {
      setMonitoringLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
    setActivity(readMessagingActivity());
    loadMonitoring();

    const onActivityUpdated = () => {
      setActivity(readMessagingActivity());
      loadMonitoring();
    };
    const onStorage = (event) => {
      if (event.key === 'findvan.messaging.activity.lastUpdate') {
        onActivityUpdated();
      }
    };

    window.addEventListener('findvan:messaging-activity-updated', onActivityUpdated);
    window.addEventListener('storage', onStorage);
    const timer = window.setInterval(() => {
      loadMonitoring();
    }, 30000);
    return () => {
      window.removeEventListener('findvan:messaging-activity-updated', onActivityUpdated);
      window.removeEventListener('storage', onStorage);
      window.clearInterval(timer);
    };
  }, []);

  const onChangeField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const sendMessage = async () => {
    if (!form.lead_id.trim() || !form.to.trim() || !form.content.trim()) {
      setSendError('Preencha lead, número e mensagem antes de enviar.');
      return;
    }

    setSendError('');
    setSendResult(null);
    setSending(true);

    try {
      const payload = {
        lead_id: form.lead_id.trim(),
        to: form.to.trim(),
        content: form.content.trim(),
        dry_run: Boolean(form.dry_run),
        provider: form.provider || undefined,
      };

      const response = await fetch(`${API_BASE}/api/integrations/messaging/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.detail || 'Falha ao enviar mensagem.');
      }

      setSendResult(body);
      addMessagingActivity({
        lead_id: payload.lead_id,
        to: payload.to,
        provider: body?.provider,
        mode: body?.mode,
        status: body?.receipt?.status,
        message: payload.content,
      });
    } catch (error) {
      const message = error.message || 'Falha de conexão com backend.';
      setSendError(message);
      addMessagingActivity({
        lead_id: form.lead_id.trim(),
        to: form.to.trim(),
        provider: form.provider || 'noop',
        mode: form.dry_run ? 'dry_run' : 'live',
        status: 'failed',
        message: form.content.trim(),
        error: message,
      });
    } finally {
      setSending(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString('pt-BR');
  };

  const providerLabel = contracts?.readiness?.messaging_provider || 'noop';
  const requestedProviderLabel = contracts?.readiness?.requested_messaging_provider || 'noop';
  const fallbackActive = Boolean(contracts?.readiness?.messaging_fallback_active);

  return (
    <Layout onNavigate={onNavigate} activePath={activePath}>
      <header className="fv-header">
        <div>
          <h1>WhatsApp</h1>
          <p>Gerencie campanhas, templates e entrega de mensagens.</p>
        </div>
        <div className="fv-actions">
          <button className="fv-ghost" type="button" onClick={loadContracts} disabled={contractsLoading}>
            {contractsLoading ? 'Carregando...' : 'Atualizar status API'}
          </button>
          <button className="fv-primary" type="button" onClick={sendMessage} disabled={sending}>
            {sending ? 'Enviando...' : 'Enviar mensagem'}
          </button>
        </div>
      </header>

      <section className="fv-columns">
        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2>Envio rápido</h2>
            <div className={`fv-status ${form.dry_run ? 'agendada' : 'em-execucao'}`}>
              {form.dry_run ? 'Modo dry run' : 'Modo live'}
            </div>
          </div>

          <div className="fv-table">
            <label className="fv-field">
              <span>Lead ID</span>
              <input
                className="fv-input"
                value={form.lead_id}
                onChange={(event) => onChangeField('lead_id', event.target.value)}
                placeholder="Ex.: 123"
              />
            </label>

            <label className="fv-field">
              <span>Número destino (WhatsApp)</span>
              <input
                className="fv-input"
                value={form.to}
                onChange={(event) => onChangeField('to', event.target.value)}
                placeholder="Ex.: +5511999999999"
              />
            </label>

            <label className="fv-field">
              <span>Mensagem</span>
              <textarea
                className="fv-input fv-textarea"
                value={form.content}
                onChange={(event) => onChangeField('content', event.target.value)}
              />
            </label>

            <div className="fv-funnel-row">
              <label className="fv-field">
                <span>Provider</span>
                <select
                  className="fv-input fv-select"
                  value={form.provider}
                  onChange={(event) => onChangeField('provider', event.target.value)}
                >
                  {providers.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fv-field">
                <span>Modo</span>
                <select
                  className="fv-input fv-select"
                  value={form.dry_run ? 'dry_run' : 'live'}
                  onChange={(event) => onChangeField('dry_run', event.target.value === 'dry_run')}
                >
                  <option value="dry_run">dry_run (seguro)</option>
                  <option value="live">live (envio real)</option>
                </select>
              </label>

              <label className="fv-field">
                <span>Ação</span>
                <button className="fv-primary" type="button" onClick={sendMessage} disabled={sending}>
                  {sending ? 'Enviando...' : 'Enviar agora'}
                </button>
              </label>
            </div>
          </div>

          {sendError && <div className="fv-message">{sendError}</div>}

          {sendResult && (
            <div className="fv-feedback-banner">
              <div className="fv-feedback-title">Envio processado</div>
              <div className="fv-row-sub">
                Provider: <strong>{sendResult.provider}</strong> • Modo: <strong>{sendResult.mode}</strong>
              </div>
              <div className="fv-row-sub">
                Status: <strong>{sendResult.receipt?.status || 'n/d'}</strong> • ID: {sendResult.receipt?.external_id || 'n/d'}
              </div>
            </div>
          )}
        </div>

        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2>Conexão & compatibilidade</h2>
            <button className="fv-ghost small" type="button" onClick={loadContracts} disabled={contractsLoading}>
              Revalidar
            </button>
          </div>

          {contractsError && <div className="fv-message">{contractsError}</div>}

          {!contractsError && (
            <div className="fv-table">
              <div className="fv-row">
                <div>
                  <div className="fv-row-title">Provider solicitado</div>
                  <div className="fv-row-sub">{requestedProviderLabel}</div>
                </div>
                <div className={`fv-status ${fallbackActive ? 'agendada' : 'ativo'}`}>
                  {fallbackActive ? 'Fallback ativo' : 'Direto'}
                </div>
              </div>

              <div className="fv-row">
                <div>
                  <div className="fv-row-title">Provider efetivo</div>
                  <div className="fv-row-sub">{providerLabel}</div>
                </div>
                <div className={`fv-status ${providerLabel === 'twilio' ? 'ativo' : 'agendada'}`}>
                  {providerLabel === 'twilio' ? 'Twilio ativo' : 'noop ativo'}
                </div>
              </div>

              <div className="fv-row">
                <div>
                  <div className="fv-row-title">Versão de contrato</div>
                  <div className="fv-row-sub">
                    default {contracts?.default_version || '1.0.0'} • latest {contracts?.latest_version || '1.1.0'}
                  </div>
                </div>
                <div className="fv-row-chip">Compatível</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="fv-columns fv-scraper-section">
        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2>Monitoramento de campanhas</h2>
            <button className="fv-ghost small" type="button" onClick={loadMonitoring} disabled={monitoringLoading}>
              {monitoringLoading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
          <div className="fv-monitoring-totals">
            <div className="fv-row-sub">Campanhas: {monitoring.totals.campaigns}</div>
            <div className="fv-row-sub">Enviadas: {monitoring.totals.sent}</div>
            <div className="fv-row-sub">Entregues: {monitoring.totals.delivered}</div>
            <div className="fv-row-sub">Respostas: {monitoring.totals.replied}</div>
            <div className="fv-row-sub">Falhas: {monitoring.totals.failed}</div>
            <div className="fv-row-sub">Atualizado às {monitoringUpdatedAt || '--:--:--'}</div>
          </div>
          {monitoringError && <div className="fv-message">{monitoringError}</div>}
          <div className="fv-table">
            {monitoring.items.length === 0 && <div className="fv-row-sub">Sem dados de campanha ainda.</div>}
            {monitoring.items.slice(0, 8).map((item) => (
              <div key={item.name} className="fv-row fv-monitoring-row">
                <div>
                  <div className="fv-row-title">{item.name}</div>
                  <div className="fv-row-sub">
                    Leads: {item.leads} • Enviadas: {item.sent} • Entregues: {item.delivered}
                  </div>
                  <div className="fv-row-sub">
                    Respostas: {item.replied} • Falhas: {item.failed} • Entrega: {item.deliveryRate}%
                  </div>
                </div>
                <div className={`fv-row-chip fv-risk-chip ${item.risk.key}`}>{item.risk.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2>Templates</h2>
            <button className="fv-ghost small" type="button">
              Criar template
            </button>
          </div>
          <div className="fv-table">
            {templates.map((item) => (
              <div key={item.title} className="fv-row">
                <div>
                  <div className="fv-row-title">{item.title}</div>
                  <div className="fv-row-sub">Variáveis: {'{{nome}}'}, {'{{cidade}}'}</div>
                </div>
                <div className={`fv-row-chip ${statusClass[item.status] || ''}`}>{item.status}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fv-panel fv-scraper-section">
        <div className="fv-panel-header">
          <h2>Atividade de mensageria</h2>
          <div className="fv-actions">
            <button
              className="fv-ghost small"
              type="button"
              onClick={() => setActivity(readMessagingActivity())}
            >
              Atualizar
            </button>
            <button className="fv-ghost small" type="button" onClick={clearMessagingActivity}>
              Limpar
            </button>
          </div>
        </div>
        <div className="fv-activity fv-activity-scroll">
          {activity.length === 0 && <div className="fv-row-sub">Nenhum envio registrado ainda.</div>}
          {activity.map((item) => (
            <div key={item.id} className={`fv-activity-item ${item.status === 'failed' ? 'status-change' : 'msg-sent'}`}>
              <div className="fv-activity-head">
                <div className="fv-activity-title">
                  Lead {item.lead_id || '--'} • {item.mode} • {item.provider}
                </div>
                <div className="fv-activity-time">{formatDateTime(item.at)}</div>
              </div>
              <div className="fv-row-sub">
                Status: <strong>{item.status || 'n/d'}</strong> • Destino: {item.to || '--'}
              </div>
              {item.error ? (
                <div className="fv-row-sub">Erro: {item.error}</div>
              ) : (
                <div className="fv-row-sub">{item.message || ''}</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
