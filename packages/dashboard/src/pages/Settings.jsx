import React from 'react';
import Layout from '../components/Layout.jsx';
import './dashboard.css';

export default function Settings({ onNavigate, activePath }) {
  return (
    <Layout onNavigate={onNavigate} activePath={activePath}>
      <header className="fv-header">
        <div>
          <h1>Configurações</h1>
          <p>Gerencie integrações, usuários e preferências do sistema.</p>
        </div>
        <div className="fv-actions">
          <button className="fv-ghost">Sincronizar agora</button>
          <button className="fv-primary">Salvar ajustes</button>
        </div>
      </header>

      <section className="fv-columns">
        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2>Integrações</h2>
          </div>
          <div className="fv-activity">
            <div className="fv-activity-item">
              <div className="fv-activity-title">Twilio WhatsApp</div>
              <div className="fv-row-sub">Conectado • Token válido</div>
            </div>
            <div className="fv-activity-item">
              <div className="fv-activity-title">PostgreSQL</div>
              <div className="fv-row-sub">findvan_db • 1.2M registros</div>
            </div>
            <div className="fv-activity-item">
              <div className="fv-activity-title">Scraper Google Maps</div>
              <div className="fv-row-sub">Proxy ativo • 2 cidades/semana</div>
            </div>
          </div>
        </div>

        <div className="fv-panel">
          <div className="fv-panel-header">
            <h2>Time</h2>
          </div>
          <div className="fv-table">
            <div className="fv-row">
              <div>
                <div className="fv-row-title">Flavio G.</div>
                <div className="fv-row-sub">Administrador</div>
              </div>
              <div className="fv-row-chip">Online</div>
            </div>
            <div className="fv-row">
              <div>
                <div className="fv-row-title">Dex SDR</div>
                <div className="fv-row-sub">Operador</div>
              </div>
              <div className="fv-row-chip">Ativo</div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
