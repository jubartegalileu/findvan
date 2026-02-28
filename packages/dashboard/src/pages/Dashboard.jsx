import React from 'react';
import Layout from '../components/Layout.jsx';
import './dashboard.css';

const stats = [
  { label: 'Leads válidos', value: '1.248', delta: '+12% semana' },
  { label: 'Campanhas ativas', value: '4', delta: '2 agendadas' },
  { label: 'Mensagens enviadas', value: '3.910', delta: '98% entregues' },
];

const leads = [
  {
    name: 'Transporte Escolar Horizonte',
    city: 'Campinas',
    phone: '(19) 99877-2211',
    source: 'Google Maps',
    status: 'Novo',
  },
  {
    name: 'Van Kids Express',
    city: 'Santos',
    phone: '(13) 99711-4320',
    source: 'Google Maps',
    status: 'Qualificado',
  },
  {
    name: 'Rota Segura Transporte',
    city: 'Sorocaba',
    phone: '(15) 99640-9012',
    source: 'Indicação',
    status: 'Em contato',
  },
];

const statusClass = {
  Novo: 'novo',
  Qualificado: 'qualificado',
  'Em contato': 'em-contato',
};

const activity = [
  {
    title: 'Scraper Google Maps',
    description: 'Executado para São Paulo — 320 leads capturados.',
    time: 'Há 15 min',
  },
  {
    title: 'Campanha “Volta às aulas”',
    description: '120 mensagens enviadas com 94% de entrega.',
    time: 'Há 2 horas',
  },
  {
    title: 'Lead atualizado',
    description: 'Van Kids Express movido para “Qualificado”.',
    time: 'Hoje, 09:32',
  },
];

const scraperJobs = [
  { city: 'São Paulo', status: 'Concluído', leads: 320 },
  { city: 'Guarulhos', status: 'Em execução', leads: 180 },
  { city: 'São Bernardo', status: 'Agendado', leads: 0 },
];

export default function Dashboard({ onNavigate, activePath }) {
  return (
    <Layout onNavigate={onNavigate} activePath={activePath}>
        <header className="fv-header">
          <div>
            <h1>Visão Geral</h1>
            <p>Centralize a operação de prospecção e SDR em um só lugar.</p>
          </div>
          <div className="fv-actions">
            <button className="fv-ghost">Exportar leads</button>
            <button className="fv-primary">Criar campanha</button>
          </div>
        </header>

        <section className="fv-grid">
          {stats.map((item) => (
            <div key={item.label} className="fv-card">
              <div className="fv-card-label">{item.label}</div>
              <div className="fv-card-value">{item.value}</div>
              <div className="fv-card-meta">{item.delta}</div>
            </div>
          ))}
        </section>

        <section className="fv-columns">
          <div className="fv-panel">
            <div className="fv-panel-header">
              <h2>Leads recentes</h2>
              <button className="fv-ghost small">Ver todos</button>
            </div>
            <div className="fv-table">
              {leads.map((lead) => (
                <div key={lead.phone} className="fv-row">
                  <div>
                    <div className="fv-row-title">{lead.name}</div>
                    <div className="fv-row-sub">{lead.city} • {lead.phone}</div>
                  </div>
                  <div className="fv-row-chip">{lead.source}</div>
                  <div className={`fv-status ${statusClass[lead.status] || ''}`}>
                    {lead.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="fv-panel">
            <div className="fv-panel-header">
              <h2>Scraper</h2>
              <button className="fv-ghost small">Abrir módulo</button>
            </div>
            <div className="fv-scraper-list">
              {scraperJobs.map((job) => (
                <div key={job.city} className="fv-scraper-item">
                  <div>
                    <div className="fv-row-title">{job.city}</div>
                    <div className="fv-row-sub">{job.status}</div>
                  </div>
                  <div className="fv-row-chip">{job.leads} leads</div>
                </div>
              ))}
            </div>

            <div className="fv-divider" />

            <div className="fv-panel-header">
              <h2>Atividade</h2>
            </div>
            <div className="fv-activity">
              {activity.map((item) => (
                <div key={item.title} className="fv-activity-item">
                  <div className="fv-activity-title">{item.title}</div>
                  <div className="fv-row-sub">{item.description}</div>
                  <div className="fv-activity-time">{item.time}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
    </Layout>
  );
}
