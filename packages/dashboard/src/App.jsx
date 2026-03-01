import React, { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Scraper from './pages/Scraper.jsx';
import Leads from './pages/Leads.jsx';
import SDR from './pages/SDR.jsx';
import Funnel from './pages/Funnel.jsx';
import WhatsApp from './pages/WhatsApp.jsx';
import Campaigns from './pages/Campaigns.jsx';
import Settings from './pages/Settings.jsx';

const routes = {
  '/': Dashboard,
  '/scraper': Scraper,
  '/leads': Leads,
  '/sdr': SDR,
  '/funil': Funnel,
  '/whatsapp': WhatsApp,
  '/campanhas': Campaigns,
  '/configuracoes': Settings,
};

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const Screen = routes[path] || Dashboard;
  return <Screen onNavigate={setPath} activePath={path} />;
}
