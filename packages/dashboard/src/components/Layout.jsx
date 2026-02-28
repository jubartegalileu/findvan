import React from 'react';
import '../pages/dashboard.css';

const navItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Scraper', to: '/scraper' },
  { label: 'Leads', to: '/leads' },
  { label: 'WhatsApp', to: '/whatsapp' },
  { label: 'Campanhas', to: '/campanhas' },
  { label: 'Configurações', to: '/configuracoes' },
];

export default function Layout({ children, onNavigate, activePath }) {
  const handleNavigate = (path) => {
    if (path === activePath) return;
    window.history.pushState({}, '', path);
    onNavigate(path);
  };

  return (
    <div className="fv-app">
      <aside className="fv-sidebar">
        <div className="fv-brand">
          <span className="fv-logo">FV</span>
          <div>
            <div className="fv-brand-title">FindVan</div>
            <div className="fv-brand-subtitle">SDR Platform</div>
          </div>
        </div>

        <nav className="fv-nav">
          {navItems.map((item) => (
            <button
              key={item.to}
              type="button"
              className={`fv-nav-item${activePath === item.to ? ' active' : ''}`}
              onClick={() => handleNavigate(item.to)}
            >
              {item.label}
            </button>
          ))}
        </nav>

      </aside>

      <main className="fv-main">{children}</main>
    </div>
  );
}
