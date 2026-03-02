import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import './dashboard.css';
import { API_BASE } from '../lib/apiBase.js';
const ESTADOS_URL =
  'https://raw.githubusercontent.com/leogermani/estados-e-municipios-ibge/master/estados.json';
const MUNICIPIOS_URL =
  'https://raw.githubusercontent.com/leogermani/estados-e-municipios-ibge/master/municipios.json';
const FALLBACK_STATES = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapa' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceara' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espirito Santo' },
  { sigla: 'GO', nome: 'Goias' },
  { sigla: 'MA', nome: 'Maranhao' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Para' },
  { sigla: 'PB', nome: 'Paraiba' },
  { sigla: 'PR', nome: 'Parana' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piaui' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondonia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'Sao Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

const statusClass = {
  Concluído: 'concluido',
  'Em execução': 'em-execucao',
  Agendado: 'agendado',
  Falhou: 'agendado',
  completed: 'concluido',
  failed: 'agendado',
};

export default function Scraper({ onNavigate, activePath }) {
  const [jobs, setJobs] = useState([]);
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [count, setCount] = useState(50);
  const [keywordsInput, setKeywordsInput] = useState('transporte escolar');
  const [keywordsHint, setKeywordsHint] = useState('Keywords padrão');
  const [message, setMessage] = useState('');
  const [intelligentFeedback, setIntelligentFeedback] = useState(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState({
    ignore_existing: true,
    validate_phone: true,
    auto_cnpj: false,
    source: 'google_maps',
  });
  const [loadingRun, setLoadingRun] = useState(false);
  const [progress, setProgress] = useState(0);
  const [states, setStates] = useState([]);
  const [citiesByUf, setCitiesByUf] = useState({});
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    jobs_today: 0,
    completed_today: 0,
    leads_24h: 0,
    validation_rate: null,
    latest_total: null,
    latest_unique: null,
  });
  const [schedules, setSchedules] = useState([]);
  const [scheduleState, setScheduleState] = useState('');
  const [scheduleCity, setScheduleCity] = useState('');
  const [scheduleKeywords, setScheduleKeywords] = useState('transporte escolar');
  const [scheduleQuantity, setScheduleQuantity] = useState(50);
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(1);
  const [scheduleExecutionTime, setScheduleExecutionTime] = useState('09:00');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState('');
  const [coverageData, setCoverageData] = useState({
    states: [],
    active_cities_total: 0,
    avg_leads_per_city: 0,
    next_city_suggestion: null,
  });
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editScheduleState, setEditScheduleState] = useState('');
  const [editScheduleCity, setEditScheduleCity] = useState('');
  const [editScheduleKeywords, setEditScheduleKeywords] = useState('transporte escolar');
  const [editScheduleQuantity, setEditScheduleQuantity] = useState(50);
  const [editScheduleFrequency, setEditScheduleFrequency] = useState('daily');
  const [editScheduleDayOfWeek, setEditScheduleDayOfWeek] = useState(1);
  const [editScheduleExecutionTime, setEditScheduleExecutionTime] = useState('09:00');
  const [editScheduleActive, setEditScheduleActive] = useState(true);
  const [editScheduleLoading, setEditScheduleLoading] = useState(false);

  const normalize = (value) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  useEffect(() => {
    let isActive = true;
    const loadLocations = async () => {
      try {
        const [statesRes, citiesRes] = await Promise.all([
          fetch(ESTADOS_URL),
          fetch(MUNICIPIOS_URL),
        ]);
        const [statesJson, citiesJson] = await Promise.all([
          statesRes.json(),
          citiesRes.json(),
        ]);

        if (!isActive) return;

        const statesArray = Object.values(statesJson).sort((a, b) =>
          a.nome.localeCompare(b.nome, 'pt-BR')
        );

        const siglaByCode = Object.fromEntries(
          Object.entries(statesJson).map(([code, data]) => [code, data.sigla])
        );

        const citiesMap = {};
        Object.entries(citiesJson).forEach(([code, name]) => {
          const ufCode = code.slice(0, 2);
          const sigla = siglaByCode[ufCode];
          if (!sigla) return;
          if (!citiesMap[sigla]) {
            citiesMap[sigla] = [];
          }
          citiesMap[sigla].push(name);
        });

        Object.keys(citiesMap).forEach((sigla) => {
          citiesMap[sigla].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        });

        setStates(statesArray);
        setCitiesByUf(citiesMap);
        setLoading(false);
      } catch (error) {
        if (!isActive) return;
        setStates(FALLBACK_STATES);
        setCitiesByUf({});
        setMessage('Falha ao carregar lista completa de cidades. Use estado e/ou cidade manual.');
        setLoading(false);
      }
    };

    loadLocations();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('findvan.scraper.advancedOptions');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setAdvancedOptions((prev) => ({
        ...prev,
        ...parsed,
        source: parsed?.source || 'google_maps',
      }));
    } catch (error) {
      // ignore local parse failures
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('findvan.scraper.advancedOptions', JSON.stringify(advancedOptions));
  }, [advancedOptions]);

  const cityOptions = useMemo(() => {
    if (!stateCode) return [];
    return citiesByUf[stateCode] || [];
  }, [citiesByUf, stateCode]);

  const scheduleCityOptions = useMemo(() => {
    if (!scheduleState) return [];
    return citiesByUf[scheduleState] || [];
  }, [citiesByUf, scheduleState]);

  const editScheduleCityOptions = useMemo(() => {
    if (!editScheduleState) return [];
    return citiesByUf[editScheduleState] || [];
  }, [citiesByUf, editScheduleState]);

  const findCityMatch = (value) =>
    cityOptions.find((option) => normalize(option) === normalize(value));

  const parseKeywords = () => {
    const values = keywordsInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return values.length > 0 ? values : ['transporte escolar'];
  };

  const refreshScraperData = async () => {
    try {
      const fetchWithFallback = async (primaryUrl, fallbackUrl) => {
        const primary = await fetch(primaryUrl);
        if (primary.status !== 404) return primary;
        if (!fallbackUrl) return primary;
        return fetch(fallbackUrl);
      };
      const [statsRes, runsRes, schedulesRes] = await Promise.all([
        fetchWithFallback(`${API_BASE}/api/scraper/stats`, `${API_BASE}/api/scraper/stats/`),
        fetchWithFallback(
          `${API_BASE}/api/scraper/runs?limit=20`,
          `${API_BASE}/api/scraper/runs/?limit=20`
        ),
        fetchWithFallback(
          `${API_BASE}/api/scraper/schedules`,
          `${API_BASE}/api/scraper/schedules/`
        ),
      ]);
      const coverageRes = await fetchWithFallback(
        `${API_BASE}/api/scraper/coverage`,
        `${API_BASE}/api/scraper/coverage/`
      );
      const statsPayload = await statsRes.json();
      const runsPayload = await runsRes.json();
      const schedulesPayload = await schedulesRes.json();
      const coveragePayload = await coverageRes.json();

      if (statsRes.ok && statsPayload?.stats) {
        setStatsData(statsPayload.stats);
      }

      if (runsRes.ok && Array.isArray(runsPayload?.runs)) {
        const mapRunStatus = (status) => {
          const normalized = String(status || '').toLowerCase();
          if (normalized === 'completed') return 'Concluído';
          if (normalized === 'failed') return 'Falhou';
          if (normalized === 'scheduled') return 'Agendado';
          if (normalized === 'running') return 'Em execução';
          return status || 'Agendado';
        };
        const mappedRuns = runsPayload.runs.map((run) => ({
          city: run.city,
          state: run.state || '',
          status: mapRunStatus(run.status),
          captured: run.total_count ?? 0,
          valid: (run.unique_count ?? 0) + (run.duplicate_count ?? 0),
          inserted: run.inserted_count ?? 0,
          duplicates: (run.db_duplicate_count ?? 0) + (run.duplicate_count ?? 0),
          target: run.target_count ?? 0,
          lastRun: new Date(run.created_at).toLocaleTimeString('pt-BR'),
        }));
        setJobs(mappedRuns);
      }

      if (schedulesRes.ok && Array.isArray(schedulesPayload?.schedules)) {
        setSchedules(schedulesPayload.schedules);
      }
      if (coverageRes.ok && coveragePayload?.coverage) {
        setCoverageData(coveragePayload.coverage);
      }
    } catch (error) {
      // keep previous UI values on fetch failure
    }
  };

  useEffect(() => {
    refreshScraperData();
  }, []);

  useEffect(() => {
    const selectedState = states.find((item) => item.sigla === stateCode);
    const trimmedCity = city.trim();
    const cityForProfile = trimmedCity || selectedState?.nome || '';
    if (!stateCode || !cityForProfile) {
      setKeywordsHint('Keywords padrão');
      return;
    }
    let cancelled = false;
    const loadKeywords = async () => {
      try {
        const params = new URLSearchParams({ state: stateCode, city: cityForProfile });
        const response = await fetch(`${API_BASE}/api/scraper/keywords?${params.toString()}`);
        const payload = await response.json();
        if (!cancelled && response.ok && payload?.profile?.keywords?.length) {
          setKeywordsInput(payload.profile.keywords.join(', '));
          setKeywordsHint(payload.profile.source === 'saved' ? 'Keywords salvas para esta cidade' : 'Keywords padrão');
        }
      } catch (error) {
        // no-op
      }
    };
    loadKeywords();
    return () => {
      cancelled = true;
    };
  }, [city, stateCode, states]);

  useEffect(() => {
    if (!loadingRun) return undefined;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        const step = prev < 40 ? 6 : prev < 75 ? 4 : 2;
        return Math.min(92, prev + step);
      });
    }, 600);
    return () => clearInterval(timer);
  }, [loadingRun]);

  const handleStart = async () => {
    const trimmed = city.trim();
    const match = findCityMatch(trimmed);

    if (!stateCode) {
      setMessage('Selecione o estado primeiro.');
      return;
    }

    const selectedState = states.find((item) => item.sigla === stateCode);
    const resolvedCity = trimmed ? (match || trimmed) : null;

    setLoadingRun(true);
    setProgress(0);
    setIntelligentFeedback(null);
    setMessage('Iniciando coleta real via backend...');

    try {
      const selectedKeywords = parseKeywords();
      const response = await fetch(`${API_BASE}/api/scraper/google-maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: resolvedCity || selectedState?.nome || null,
          state: stateCode,
          max_results: count || 50,
          keywords: selectedKeywords,
          ignore_existing: advancedOptions.ignore_existing,
          validate_phone: advancedOptions.validate_phone,
          auto_cnpj: advancedOptions.auto_cnpj,
          source: advancedOptions.source,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao iniciar scraper.');
      }

      const result = payload.result || {};
      setCity('');
      setStateCode('');
      const stateName = selectedState?.nome;
      const searchLabel = resolvedCity || stateName || stateCode;
      const inserted = Number(result.inserted || 0);
      const dbDuplicates = Number(result.db_duplicates || 0);
      if (inserted === 0 && dbDuplicates > 0) {
        setMessage(
          `Coleta concluída: ${result.total ?? 0} encontrados, 0 novos em ${searchLabel}. ${dbDuplicates} já existiam no banco.`
        );
      } else {
        setMessage(
          `Coleta concluída: ${result.total ?? 0} encontrados, ${inserted} novos inseridos (${searchLabel}).`
        );
      }
      if (result.feedback?.show) {
        setIntelligentFeedback(result.feedback);
      }
      await refreshScraperData();
      setProgress(100);
      localStorage.setItem('findvan.leads.lastRefresh', String(Date.now()));
      window.dispatchEvent(new CustomEvent('findvan:leads-updated'));
    } catch (error) {
      const message = String(error?.message || '');
      if (message.toLowerCase().includes('failed to fetch')) {
        setMessage(`Não foi possível conectar ao backend (${API_BASE}). Verifique se a API está rodando na porta 8000.`);
      } else {
        setMessage(error?.message || 'Erro ao executar scraper.');
      }
      setProgress(0);
    } finally {
      setLoadingRun(false);
    }
  };

  const parseScheduleKeywords = () => {
    const values = scheduleKeywords
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return values.length > 0 ? values : ['transporte escolar'];
  };

  const parseEditScheduleKeywords = () => {
    const values = editScheduleKeywords
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return values.length > 0 ? values : ['transporte escolar'];
  };

  const resetScheduleForm = () => {
    setScheduleState('');
    setScheduleCity('');
    setScheduleKeywords('transporte escolar');
    setScheduleQuantity(50);
    setScheduleFrequency('daily');
    setScheduleDayOfWeek(1);
    setScheduleExecutionTime('09:00');
  };

  const handleCreateSchedule = async () => {
    if (!scheduleState) {
      setScheduleMessage('Selecione o estado para criar o agendamento.');
      return;
    }
    const resolvedScheduleCity = scheduleCity.trim() || null;
    setScheduleLoading(true);
    setScheduleMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/scraper/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: scheduleState,
          city: resolvedScheduleCity,
          keywords: parseScheduleKeywords(),
          quantity: Number(scheduleQuantity || 50),
          frequency: scheduleFrequency,
          day_of_week: scheduleFrequency === 'weekly' ? Number(scheduleDayOfWeek) : null,
          execution_time: scheduleExecutionTime,
          is_active: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Erro ao criar agendamento.');
      }
      setScheduleMessage('Agendamento criado com sucesso.');
      resetScheduleForm();
      await refreshScraperData();
    } catch (error) {
      setScheduleMessage(String(error?.message || 'Erro ao criar agendamento.'));
    } finally {
      setScheduleLoading(false);
    }
  };

  const toggleScheduleActive = async (schedule) => {
    try {
      const response = await fetch(`${API_BASE}/api/scraper/schedules/${schedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !schedule.is_active }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao atualizar agendamento.');
      }
      await refreshScraperData();
    } catch (error) {
      setScheduleMessage(String(error?.message || 'Falha ao atualizar agendamento.'));
    }
  };

  const removeSchedule = async (schedule) => {
    if (!window.confirm(`Remover agendamento de ${schedule.city}/${schedule.state}?`)) return;
    try {
      const response = await fetch(`${API_BASE}/api/scraper/schedules/${schedule.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao remover agendamento.');
      }
      setScheduleMessage('Agendamento removido.');
      await refreshScraperData();
    } catch (error) {
      setScheduleMessage(String(error?.message || 'Falha ao remover agendamento.'));
    }
  };

  const openEditScheduleModal = (schedule) => {
    setEditingSchedule(schedule);
    setEditScheduleState(schedule.state || '');
    setEditScheduleCity(schedule.city || '');
    setEditScheduleKeywords(Array.isArray(schedule.keywords) ? schedule.keywords.join(', ') : 'transporte escolar');
    setEditScheduleQuantity(Number(schedule.quantity || 50));
    setEditScheduleFrequency(schedule.frequency || 'daily');
    setEditScheduleDayOfWeek(Number.isFinite(Number(schedule.day_of_week)) ? Number(schedule.day_of_week) : 1);
    setEditScheduleExecutionTime(String(schedule.execution_time || '09:00').slice(0, 5));
    setEditScheduleActive(!!schedule.is_active);
  };

  const closeEditScheduleModal = () => {
    setEditingSchedule(null);
    setEditScheduleLoading(false);
  };

  const handleSaveEditedSchedule = async () => {
    if (!editingSchedule?.id) return;
    if (!editScheduleState) {
      setScheduleMessage('Selecione o estado para editar o agendamento.');
      return;
    }

    const resolvedCity = editScheduleCity.trim() || null;

    try {
      setEditScheduleLoading(true);
      const response = await fetch(`${API_BASE}/api/scraper/schedules/${editingSchedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: editScheduleState,
          city: resolvedCity,
          keywords: parseEditScheduleKeywords(),
          quantity: Number(editScheduleQuantity || 50),
          frequency: editScheduleFrequency,
          day_of_week: editScheduleFrequency === 'weekly' ? Number(editScheduleDayOfWeek) : null,
          execution_time: editScheduleExecutionTime,
          is_active: editScheduleActive,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || 'Falha ao editar agendamento.');
      }
      setScheduleMessage('Agendamento atualizado com sucesso.');
      closeEditScheduleModal();
      await refreshScraperData();
    } catch (error) {
      setScheduleMessage(String(error?.message || 'Falha ao editar agendamento.'));
      setEditScheduleLoading(false);
    }
  };

  return (
    <Layout onNavigate={onNavigate} activePath={activePath}>
      <header className="fv-header">
        <div>
          <h1>Scraper</h1>
          <p>Controle e agendamento das coletas Google Maps e fontes OSINT.</p>
        </div>
        <div className="fv-actions" />
      </header>

      <section className="fv-grid">
        <div className="fv-card">
          <div className="fv-card-label">Jobs hoje</div>
          <div className="fv-card-value">{statsData.jobs_today}</div>
          <div className="fv-card-meta">{statsData.completed_today} finalizados</div>
        </div>
        <div className="fv-card">
          <div className="fv-card-label">Leads capturados</div>
          <div className="fv-card-value">{statsData.leads_24h}</div>
          <div className="fv-card-meta">Últimas 24h</div>
        </div>
        <div className="fv-card">
          <div className="fv-card-label">Taxa de validação</div>
          <div className="fv-card-value">
            {statsData.validation_rate !== null ? `${statsData.validation_rate}%` : 'N/D'}
          </div>
          <div className="fv-card-meta">
            {statsData.latest_total
              ? `${statsData.latest_unique}/${statsData.latest_total} na última coleta`
              : 'Aguardando coleta real'}
          </div>
        </div>
      </section>

      <section className="fv-panel fv-panel-compact">
        <div className="fv-panel-header">
          <h2>Iniciar coleta</h2>
        </div>
        <div className="fv-inline-form">
          <select
            className="fv-input fv-input-state fv-select"
            value={stateCode}
            onChange={(event) => {
              setStateCode(event.target.value);
              setCity('');
            }}
          >
            <option value="">Estado</option>
            {states.map((state) => (
              <option key={state.sigla} value={state.sigla}>
                {state.nome}
              </option>
            ))}
          </select>
          <input
            className="fv-input"
            placeholder={loading ? 'Carregando cidades...' : 'Cidade (opcional)'}
              value={city}
              onChange={(event) => setCity(event.target.value)}
              list="fv-city-list"
              disabled={loading}
            />
          <datalist id="fv-city-list">
            {cityOptions.map((option, index) => (
              <option key={`${stateCode}-${option}-${index}`} value={option} />
            ))}
          </datalist>
          <input
            className="fv-input"
            placeholder="Keywords (separadas por vírgula)"
            value={keywordsInput}
            onChange={(event) => setKeywordsInput(event.target.value)}
          />
          <div className="fv-row-sub">{keywordsHint}</div>
          <input
            className="fv-input fv-input-number"
            type="number"
            min={1}
            max={999}
            step={1}
            value={count}
            onChange={(event) => setCount(Number(event.target.value || 50))}
          />
          <button
            className="fv-primary"
            type="button"
            onClick={handleStart}
            disabled={loadingRun}
          >
            Iniciar nova coleta
          </button>
        </div>
        <div className="fv-link" role="button" tabIndex={0} onClick={() => setAdvancedOpen((prev) => !prev)} onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') setAdvancedOpen((prev) => !prev);
        }}>
          {advancedOpen ? 'Ocultar avançado' : 'Mostrar avançado'}
        </div>
        {advancedOpen && (
          <div className="fv-inline-form">
            <label className="fv-funnel-check">
              <input
                type="checkbox"
                checked={advancedOptions.ignore_existing}
                onChange={(event) =>
                  setAdvancedOptions((prev) => ({ ...prev, ignore_existing: event.target.checked }))
                }
              />
              Ignorar leads existentes
            </label>
            <label className="fv-funnel-check">
              <input
                type="checkbox"
                checked={advancedOptions.validate_phone}
                onChange={(event) =>
                  setAdvancedOptions((prev) => ({ ...prev, validate_phone: event.target.checked }))
                }
              />
              Validar telefone
            </label>
            <label className="fv-funnel-check">
              <input
                type="checkbox"
                checked={advancedOptions.auto_cnpj}
                onChange={(event) =>
                  setAdvancedOptions((prev) => ({ ...prev, auto_cnpj: event.target.checked }))
                }
              />
              Buscar CNPJ (mais lento)
            </label>
            <select
              className="fv-input fv-select"
              value={advancedOptions.source}
              onChange={(event) => setAdvancedOptions((prev) => ({ ...prev, source: event.target.value }))}
            >
              <option value="google_maps">Google Maps</option>
              <option value="instagram" disabled>
                Instagram (Em breve)
              </option>
              <option value="manual" disabled>
                Lista manual (Em breve)
              </option>
            </select>
          </div>
        )}
        {message && <div className="fv-message">{message}</div>}
        {intelligentFeedback?.show && (
          <div className="fv-feedback-banner">
            <div className="fv-feedback-title">{intelligentFeedback.message}</div>
            {intelligentFeedback.insights?.map((item, index) => (
              <div key={`${item}-${index}`} className="fv-row-sub">
                {item}
              </div>
            ))}
            <div className="fv-row-sub">
              Execuções consecutivas sem novos: {intelligentFeedback.streak_zero_results || 0}
            </div>
            {Array.isArray(intelligentFeedback.suggestions) && intelligentFeedback.suggestions.length > 0 && (
              <div className="fv-feedback-suggestions">
                {intelligentFeedback.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="fv-ghost small"
                    onClick={() => setKeywordsInput(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="fv-progress-row" aria-label="Progresso da coleta">
          <div className="fv-progress-track">
            <div className="fv-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="fv-progress-value">{progress}%</div>
        </div>
      </section>

      <section className="fv-panel fv-scraper-section">
        <div className="fv-panel-header">
          <h2>Agendamentos</h2>
          <span className="fv-row-sub">{schedules.filter((item) => item.is_active).length}/5 ativos</span>
        </div>
        <div className="fv-inline-form fv-schedule-form">
          <select
            className="fv-input fv-input-state fv-select fv-schedule-state"
            value={scheduleState}
            onChange={(event) => {
              setScheduleState(event.target.value);
              setScheduleCity('');
            }}
          >
            <option value="">Estado</option>
            {states.map((state) => (
              <option key={`schedule-${state.sigla}`} value={state.sigla}>
                {state.nome}
              </option>
            ))}
          </select>
          <input
            className="fv-input fv-schedule-city"
            placeholder="Cidade (opcional)"
            value={scheduleCity}
            onChange={(event) => setScheduleCity(event.target.value)}
            list="fv-schedule-city-list"
          />
          <datalist id="fv-schedule-city-list">
            {scheduleCityOptions.map((option, index) => (
              <option key={`schedule-city-${scheduleState}-${option}-${index}`} value={option} />
            ))}
          </datalist>
          <input
            className="fv-input fv-schedule-keywords"
            placeholder="Keywords (vírgula)"
            value={scheduleKeywords}
            onChange={(event) => setScheduleKeywords(event.target.value)}
          />
          <input
            className="fv-input fv-input-number fv-schedule-quantity"
            type="number"
            min={1}
            max={999}
            value={scheduleQuantity}
            onChange={(event) => setScheduleQuantity(Number(event.target.value || 50))}
          />
          <select
            className="fv-input fv-select fv-schedule-frequency"
            value={scheduleFrequency}
            onChange={(event) => setScheduleFrequency(event.target.value)}
          >
            <option value="daily">Diária</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
          {scheduleFrequency === 'weekly' && (
            <select
              className="fv-input fv-select fv-schedule-weekday"
              value={scheduleDayOfWeek}
              onChange={(event) => setScheduleDayOfWeek(Number(event.target.value))}
            >
              <option value={0}>Domingo</option>
              <option value={1}>Segunda</option>
              <option value={2}>Terça</option>
              <option value={3}>Quarta</option>
              <option value={4}>Quinta</option>
              <option value={5}>Sexta</option>
              <option value={6}>Sábado</option>
            </select>
          )}
          <input
            className="fv-input fv-schedule-time"
            type="time"
            value={scheduleExecutionTime}
            onChange={(event) => setScheduleExecutionTime(event.target.value)}
          />
          <button
            className="fv-primary fv-schedule-submit"
            type="button"
            onClick={handleCreateSchedule}
            disabled={scheduleLoading}
          >
            Criar agendamento
          </button>
        </div>
        {scheduleMessage && <div className="fv-message">{scheduleMessage}</div>}
        <div className="fv-table">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="fv-row">
              <div>
                <div className="fv-row-title">
                  {schedule.city} • {schedule.state}
                </div>
                <div className="fv-row-sub">
                  {schedule.frequency} • {String(schedule.execution_time || '').slice(0, 5)} • {schedule.quantity} leads
                </div>
              </div>
              <div className="fv-row-chip">{(schedule.keywords || []).join(', ')}</div>
              <button className="fv-ghost small" type="button" onClick={() => toggleScheduleActive(schedule)}>
                {schedule.is_active ? 'Desativar' : 'Ativar'}
              </button>
              <button className="fv-ghost small" type="button" onClick={() => openEditScheduleModal(schedule)}>
                Editar
              </button>
              <button className="fv-ghost small" type="button" onClick={() => removeSchedule(schedule)}>
                Remover
              </button>
            </div>
          ))}
          {schedules.length === 0 && <div className="fv-row-sub">Sem agendamentos cadastrados.</div>}
        </div>
      </section>

      <section className="fv-columns fv-columns-scraper">
        <div className="fv-panel fv-scraper-section">
        <div className="fv-panel-header">
          <h2>Execuções em andamento</h2>
          <button className="fv-ghost small">Ver histórico</button>
        </div>
        <div className="fv-table">
          {jobs.map((job, index) => (
            <div key={`${job.city}-${job.state || ''}-${job.lastRun}-${index}`} className="fv-row">
              <div>
                <div className="fv-row-title">
                  {job.city}
                  {job.state ? ` • ${job.state}` : ''}
                </div>
                <div className="fv-row-sub">Última execução: {job.lastRun}</div>
              </div>
              <div className="fv-row-chip">
                {job.captured}/{job.target ?? 320} capturados
              </div>
              <div className="fv-row-chip">
                {job.valid} válidos
              </div>
              <div className="fv-row-chip">
                {job.inserted} novos
              </div>
              <div className="fv-row-chip fv-row-chip-light">
                {job.duplicates} duplicados
              </div>
              <div className="fv-scraper-pipeline" title={`Encontrados ${job.captured} > Válidos ${job.valid} > Duplicados ${job.duplicates} > Novos ${job.inserted}`}>
                <span className="found" style={{ width: `${Math.min(100, Math.round((job.captured / Math.max(1, job.target || 1)) * 100))}%` }} />
                <span className="valid" style={{ width: `${Math.min(100, Math.round((job.valid / Math.max(1, job.captured || 1)) * 100))}%` }} />
                <span className="duplicates" style={{ width: `${Math.min(100, Math.round((job.duplicates / Math.max(1, job.captured || 1)) * 100))}%` }} />
                <span className="new" style={{ width: `${Math.min(100, Math.round((job.inserted / Math.max(1, job.captured || 1)) * 100))}%` }} />
              </div>
              <div className={`fv-status ${statusClass[job.status] || ''}`}>
                {job.status}
              </div>
            </div>
          ))}
          {jobs.length === 0 && (
            <div className="fv-row-sub">Sem execuções registradas ainda.</div>
          )}
        </div>
        </div>

        <aside className="fv-panel fv-scraper-section fv-scraper-coverage">
          <div className="fv-panel-header">
            <h2>Mapa de cobertura</h2>
          </div>
          <div className="fv-activity">
            <div className="fv-activity-item">
              <div className="fv-activity-title">Cidades ativas</div>
              <div className="fv-row-sub">{coverageData.active_cities_total || 0}</div>
            </div>
            <div className="fv-activity-item">
              <div className="fv-activity-title">Média leads/cidade</div>
              <div className="fv-row-sub">{Number(coverageData.avg_leads_per_city || 0).toLocaleString('pt-BR')}</div>
            </div>
            <div className="fv-activity-item">
              <div className="fv-activity-title">Próxima cidade sugerida</div>
              {coverageData.next_city_suggestion ? (
                <div className="fv-row-sub">
                  {coverageData.next_city_suggestion.city} • {coverageData.next_city_suggestion.state}
                </div>
              ) : (
                <div className="fv-row-sub">Sem sugestão no momento.</div>
              )}
            </div>
          </div>
          <div className="fv-divider" />
          <div className="fv-table">
            {(coverageData.states || []).map((item) => {
              const maxCities = Math.max(
                1,
                ...(coverageData.states || []).map((stateItem) => Number(stateItem.cities_collected || 0))
              );
              const width = Math.max(8, Math.round((Number(item.cities_collected || 0) / maxCities) * 100));
              return (
                <div key={`coverage-${item.state}`} className="fv-activity-item">
                  <div className="fv-activity-head">
                    <div className="fv-activity-title">{item.state}</div>
                    <span className="fv-row-sub">{item.cities_collected} cidades</span>
                  </div>
                  <div className="fv-funnel-track">
                    <div className="fv-funnel-fill" style={{ width: `${width}%` }} />
                  </div>
                  <div className="fv-row-sub">{item.total_leads} leads inseridos</div>
                </div>
              );
            })}
            {(coverageData.states || []).length === 0 && (
              <div className="fv-row-sub">Sem cobertura registrada ainda.</div>
            )}
          </div>
        </aside>
      </section>

      {editingSchedule && (
        <div className="fv-modal-backdrop" onClick={closeEditScheduleModal}>
          <div className="fv-modal" onClick={(event) => event.stopPropagation()}>
            <div className="fv-panel-header">
              <h2>Editar agendamento</h2>
              <button className="fv-ghost small" type="button" onClick={closeEditScheduleModal}>
                ✕ Fechar
              </button>
            </div>

            <div className="fv-inline-form">
              <select
                className="fv-input fv-input-state fv-select"
                value={editScheduleState}
                onChange={(event) => {
                  setEditScheduleState(event.target.value);
                  setEditScheduleCity('');
                }}
              >
                <option value="">Estado</option>
                {states.map((state) => (
                  <option key={`edit-schedule-${state.sigla}`} value={state.sigla}>
                    {state.nome}
                  </option>
                ))}
              </select>

              <input
                className="fv-input"
                placeholder="Cidade (opcional)"
                value={editScheduleCity}
                onChange={(event) => setEditScheduleCity(event.target.value)}
                list="fv-edit-schedule-city-list"
                disabled={!editScheduleState}
              />
              <datalist id="fv-edit-schedule-city-list">
                {editScheduleCityOptions.map((option, index) => (
                  <option key={`edit-city-${editScheduleState}-${option}-${index}`} value={option} />
                ))}
              </datalist>

              <input
                className="fv-input"
                placeholder="Keywords (vírgula)"
                value={editScheduleKeywords}
                onChange={(event) => setEditScheduleKeywords(event.target.value)}
              />

              <input
                className="fv-input fv-input-number"
                type="number"
                min={1}
                max={999}
                value={editScheduleQuantity}
                onChange={(event) => setEditScheduleQuantity(Number(event.target.value || 50))}
              />

              <select
                className="fv-input fv-select"
                value={editScheduleFrequency}
                onChange={(event) => setEditScheduleFrequency(event.target.value)}
              >
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>

              {editScheduleFrequency === 'weekly' && (
                <select
                  className="fv-input fv-select"
                  value={editScheduleDayOfWeek}
                  onChange={(event) => setEditScheduleDayOfWeek(Number(event.target.value))}
                >
                  <option value={0}>Domingo</option>
                  <option value={1}>Segunda</option>
                  <option value={2}>Terça</option>
                  <option value={3}>Quarta</option>
                  <option value={4}>Quinta</option>
                  <option value={5}>Sexta</option>
                  <option value={6}>Sábado</option>
                </select>
              )}

              <input
                className="fv-input"
                type="time"
                value={editScheduleExecutionTime}
                onChange={(event) => setEditScheduleExecutionTime(event.target.value)}
              />

              <label className="fv-funnel-check">
                <input
                  type="checkbox"
                  checked={editScheduleActive}
                  onChange={(event) => setEditScheduleActive(event.target.checked)}
                />
                Ativo
              </label>
            </div>

            <div className="fv-actions fv-modal-actions">
              <button className="fv-ghost" type="button" onClick={closeEditScheduleModal}>
                Cancelar
              </button>
              <button
                className="fv-primary"
                type="button"
                onClick={handleSaveEditedSchedule}
                disabled={editScheduleLoading}
              >
                {editScheduleLoading ? 'Salvando...' : 'Salvar agendamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
