import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import './dashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const ESTADOS_URL =
  'https://raw.githubusercontent.com/leogermani/estados-e-municipios-ibge/master/estados.json';
const MUNICIPIOS_URL =
  'https://raw.githubusercontent.com/leogermani/estados-e-municipios-ibge/master/municipios.json';

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
  const [message, setMessage] = useState('');
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
        setMessage('Falha ao carregar lista de cidades.');
        setLoading(false);
      }
    };

    loadLocations();
    return () => {
      isActive = false;
    };
  }, []);

  const cityOptions = useMemo(() => {
    if (!stateCode) return [];
    return citiesByUf[stateCode] || [];
  }, [citiesByUf, stateCode]);

  const findCityMatch = (value) =>
    cityOptions.find((option) => normalize(option) === normalize(value));

  const refreshScraperData = async () => {
    try {
      const fetchWithFallback = async (primaryUrl, fallbackUrl) => {
        const primary = await fetch(primaryUrl);
        if (primary.status !== 404) return primary;
        if (!fallbackUrl) return primary;
        return fetch(fallbackUrl);
      };
      const [statsRes, runsRes] = await Promise.all([
        fetchWithFallback(`${API_BASE}/api/scraper/stats`, `${API_BASE}/api/scraper/stats/`),
        fetchWithFallback(
          `${API_BASE}/api/scraper/runs?limit=20`,
          `${API_BASE}/api/scraper/runs/?limit=20`
        ),
      ]);
      const statsPayload = await statsRes.json();
      const runsPayload = await runsRes.json();

      if (statsRes.ok && statsPayload?.stats) {
        setStatsData(statsPayload.stats);
      }

      if (runsRes.ok && Array.isArray(runsPayload?.runs)) {
        const mappedRuns = runsPayload.runs.map((run) => ({
          city: run.city,
          state: run.state || '',
          status: run.status === 'completed' ? 'Concluído' : 'Falhou',
          captured: run.total_count ?? 0,
          inserted: run.inserted_count ?? 0,
          duplicates: run.db_duplicate_count ?? 0,
          target: run.target_count ?? 0,
          lastRun: new Date(run.created_at).toLocaleTimeString('pt-BR'),
        }));
        setJobs(mappedRuns);
      }
    } catch (error) {
      // keep previous UI values on fetch failure
    }
  };

  useEffect(() => {
    refreshScraperData();
  }, []);

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
    const resolvedCity = trimmed ? match : null;

    if (trimmed && !resolvedCity) {
      setMessage('Selecione uma cidade válida na lista para iniciar a coleta.');
      return;
    }

    setLoadingRun(true);
    setProgress(0);
    setMessage('Iniciando coleta real via backend...');

    try {
      const response = await fetch(`${API_BASE}/api/scraper/google-maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: resolvedCity || selectedState?.nome,
          state: stateCode,
          max_results: count || 50,
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
          `Coleta concluída: ${result.unique ?? 0} capturados, 0 novos em ${searchLabel}. ${dbDuplicates} já existiam no banco.`
        );
      } else {
        setMessage(
          `Coleta concluída: ${result.unique ?? 0} capturados, ${inserted} novos inseridos (${searchLabel}).`
        );
      }
      await refreshScraperData();
      setProgress(100);
      localStorage.setItem('findvan.leads.lastRefresh', String(Date.now()));
      window.dispatchEvent(new CustomEvent('findvan:leads-updated'));
    } catch (error) {
      setMessage(error?.message || 'Erro ao executar scraper.');
      setProgress(0);
    } finally {
      setLoadingRun(false);
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
            disabled={!stateCode || loading}
          />
          <datalist id="fv-city-list">
            {cityOptions.map((option, index) => (
              <option key={`${stateCode}-${option}-${index}`} value={option} />
            ))}
          </datalist>
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
        {message && <div className="fv-message">{message}</div>}
        <div className="fv-progress-row" aria-label="Progresso da coleta">
          <div className="fv-progress-track">
            <div className="fv-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="fv-progress-value">{progress}%</div>
        </div>
      </section>

      <section className="fv-panel">
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
                {job.inserted} novos
              </div>
              <div className="fv-row-chip fv-row-chip-light">
                {job.duplicates} duplicados
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
      </section>
    </Layout>
  );
}
