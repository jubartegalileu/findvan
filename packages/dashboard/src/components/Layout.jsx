import React from 'react';
import '../pages/dashboard.css';
import Icon from './Icon.jsx';

const navItems = [
  { label: 'Dashboard', to: '/', icon: 'dashboard' },
  { label: 'Scraper', to: '/scraper', icon: 'scraper' },
  { label: 'Leads', to: '/leads', icon: 'leads' },
  { label: 'WhatsApp', to: '/whatsapp', icon: 'whatsapp' },
  { label: 'Campanhas', to: '/campanhas', icon: 'campaigns' },
  { label: 'Configurações', to: '/configuracoes', icon: 'settings' },
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
              <span className="fv-icon-label">
                <Icon name={item.icon} />
                {item.label}
              </span>
            </button>
          ))}
        </nav>

      </aside>

      <main className="fv-main">{children}</main>
    </div>
  );
}
