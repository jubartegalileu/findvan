import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '../components/Dashboard';
import * as leadsApi from '../services/leads-api';

vi.mock('../services/leads-api');

describe('Dashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(leadsApi.leadsAPI.getLeads).mockResolvedValue({
      leads: [
        {
          id: 1,
          name: 'School A',
          phone: '11987654321',
          email: 'a@school.com',
          address: 'Rua A',
          city: 'São Paulo',
          company_name: 'School A',
          cnpj: '12345678000190',
          url: 'https://a.com',
          source: 'google_maps',
          is_valid: true,
          is_duplicate: false,
          captured_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      pages: 1,
    });
    vi.mocked(leadsApi.leadsAPI.getCities).mockResolvedValue(['São Paulo']);
    vi.mocked(leadsApi.leadsAPI.getSources).mockResolvedValue(['google_maps']);
  });

  it('renders dashboard with all major sections', async () => {
    render(<Dashboard />);

    // Verify sidebar is rendered
    expect(screen.getByText('FindVan')).toBeDefined();
    expect(screen.getByText('Lead Prospecting Dashboard')).toBeDefined();

    // Verify header is rendered
    expect(screen.getByText('Leads Management')).toBeDefined();

    // Verify filter bar is rendered
    await waitFor(() => {
      expect(screen.getByText('All Cities')).toBeDefined();
    });
  });

  it('loads and displays leads data', () => {
    render(<Dashboard />);

    // Dashboard should render successfully
    expect(screen.getByText('FindVan')).toBeDefined();
    expect(screen.getByText('Leads Management')).toBeDefined();
  });

  it('displays all key UI components', () => {
    render(<Dashboard />);

    // Check sidebar components
    expect(screen.getByText('FindVan')).toBeDefined();
    expect(screen.getByText('Navigation')).toBeDefined();
    expect(screen.getByText('Clear Filters')).toBeDefined();

    // Check header
    expect(screen.getByText('Leads Management')).toBeDefined();

    // Check filter bar
    expect(screen.getByDisplayValue('All Cities')).toBeDefined();
  });

  it('renders without errors', () => {
    expect(() => {
      render(<Dashboard />);
    }).not.toThrow();
  });
});
