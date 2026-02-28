import React from 'react';
import Layout from '../components/Layout.jsx';
import './dashboard.css';

const campaigns = [
  { name: 'Volta às aulas', audience: 'Campinas + Sorocaba', status: 'Ativa' },
  { name: 'Reativação 2025', audience: 'Leads inativos', status: 'Agendada' },
  { name: 'Vans premium', audience: 'Score > 80', status: 'Rascunho' },
];

export default function Campaigns({ onNavigate, activePath }) {
  return (
    <Layout onNavigate={onNavigate} activePath={activePath}>
      <header className="fv-header">
        <div>
          <h1>Campanhas</h1>
          <p>Planeje fluxos, horários e metas de performance.</p>
        </div>
        <div className="fv-actions">
          <button className="fv-ghost">Importar audiência</button>
          <button className="fv-primary">Criar campanha</button>
        </div>
      </header>

      <section className="fv-panel">
        <div className="fv-panel-header">
          <h2>Pipeline de campanhas</h2>
          <button className="fv-ghost small">Duplicar modelo</button>
        </div>
        <div className="fv-table">
          {campaigns.map((item) => (
            <div key={item.name} className="fv-row">
              <div>
                <div className="fv-row-title">{item.name}</div>
                <div className="fv-row-sub">{item.audience}</div>
              </div>
              <div className="fv-row-chip">{item.status}</div>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
