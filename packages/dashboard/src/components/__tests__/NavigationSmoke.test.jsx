import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import App from '../../App.jsx';
import Layout from '../Layout.jsx';

vi.mock('../../pages/Dashboard.jsx', () => ({
  default: ({ activePath }) => <div>SCREEN:Dashboard:{activePath}</div>,
}));
vi.mock('../../pages/Scraper.jsx', () => ({
  default: ({ activePath }) => <div>SCREEN:Scraper:{activePath}</div>,
}));
vi.mock('../../pages/Leads.jsx', () => ({
  default: ({ activePath }) => <div>SCREEN:Leads:{activePath}</div>,
}));
vi.mock('../../pages/SDR.jsx', () => ({
  default: ({ activePath }) => <div>SCREEN:SDR:{activePath}</div>,
}));
vi.mock('../../pages/Funnel.jsx', () => ({
  default: ({ activePath }) => <div>SCREEN:Funil:{activePath}</div>,
}));
vi.mock('../../pages/WhatsApp.jsx', () => ({
  default: ({ activePath }) => <div>SCREEN:WhatsApp:{activePath}</div>,
}));
vi.mock('../../pages/Campaigns.jsx', () => ({
  default: ({ activePath }) => <div>SCREEN:Campanhas:{activePath}</div>,
}));
vi.mock('../../pages/Settings.jsx', () => ({
  default: ({ activePath }) => <div>SCREEN:Configuracoes:{activePath}</div>,
}));

describe('Navigation smoke', () => {
  it('renders all 8 navigation tabs in layout', () => {
    render(
      <Layout onNavigate={vi.fn()} activePath="/">
        <div>content</div>
      </Layout>
    );

    expect(screen.getByRole('button', { name: /Dashboard/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Scraper/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Leads/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^SDR$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Funil/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /WhatsApp/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Campanhas/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Configurações/i })).toBeDefined();
  });

  it('resolves routes for all tabs and fallback route', () => {
    const routes = [
      ['/', 'SCREEN:Dashboard:/'],
      ['/scraper', 'SCREEN:Scraper:/scraper'],
      ['/leads', 'SCREEN:Leads:/leads'],
      ['/sdr', 'SCREEN:SDR:/sdr'],
      ['/funil', 'SCREEN:Funil:/funil'],
      ['/whatsapp', 'SCREEN:WhatsApp:/whatsapp'],
      ['/campanhas', 'SCREEN:Campanhas:/campanhas'],
      ['/configuracoes', 'SCREEN:Configuracoes:/configuracoes'],
      ['/rota-inexistente', 'SCREEN:Dashboard:/rota-inexistente'],
    ];

    for (const [path, marker] of routes) {
      window.history.pushState({}, '', path);
      render(<App />);
      expect(screen.getByText(marker)).toBeDefined();
      cleanup();
    }
  });
});
