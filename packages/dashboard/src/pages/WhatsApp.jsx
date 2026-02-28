import React from 'react';
import Layout from '../components/Layout.jsx';
import './dashboard.css';

const campaigns = [
  { name: 'Volta às aulas', status: 'Em execução', sent: 220, delivered: 206 },
  { name: 'Reativação 2025', status: 'Agendada', sent: 0, delivered: 0 },
];

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

export default function WhatsApp({ onNavigate, activePath }) {
  return (
    <Layout onNavigate={onNavigate} activePath={activePath}>
      <header className="fv-header">
        <div>
          <h1>WhatsApp</h1>
          <p>Gerencie campanhas, templates e entrega de mensagens.</p>
        </div>
        <div className="fv-actions">
          <button className="fv-ghost">Conectar API</button>
          <button className="fv-primary">Nova campanha</button>
        </div>
      </header>

      <section className="fv-columns">
        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2>Campanhas</h2>
            <button className="fv-ghost small">Ver todas</button>
          </div>
          <div className="fv-table">
            {campaigns.map((item) => (
              <div key={item.name} className="fv-row">
                <div>
                  <div className="fv-row-title">{item.name}</div>
                  <div className="fv-row-sub">{item.sent} enviadas • {item.delivered} entregues</div>
                </div>
                <div className={`fv-status ${statusClass[item.status] || ''}`}>
                  {item.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2>Templates</h2>
            <button className="fv-ghost small">Criar template</button>
          </div>
          <div className="fv-table">
            {templates.map((item) => (
              <div key={item.title} className="fv-row">
                <div>
                  <div className="fv-row-title">{item.title}</div>
                  <div className="fv-row-sub">Variáveis: {'{{nome}}'}, {'{{cidade}}'}</div>
                </div>
                <div className={`fv-row-chip ${statusClass[item.status] || ''}`}>
                  {item.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
