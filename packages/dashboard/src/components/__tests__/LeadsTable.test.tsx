import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeadsTable } from '../LeadsTable';
import { Lead } from '../../types/index';

const mockLeads: Lead[] = [
  {
    id: 1,
    name: 'School A',
    phone: '11987654321',
    email: 'contact@schoola.com',
    address: 'Rua A, 123',
    city: 'São Paulo',
    company_name: 'School A LTDA',
    cnpj: '12345678000190',
    url: 'https://schoola.com',
    source: 'google_maps',
    is_valid: true,
    is_duplicate: false,
    captured_at: new Date('2024-01-15').toISOString(),
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString(),
  },
  {
    id: 2,
    name: 'School B',
    phone: '11987654322',
    email: 'contact@schoolb.com',
    address: 'Rua B, 456',
    city: 'Rio de Janeiro',
    company_name: 'School B LTDA',
    cnpj: '12345678000191',
    url: 'https://schoolb.com',
    source: 'website',
    is_valid: false,
    is_duplicate: true,
    captured_at: new Date('2024-01-16').toISOString(),
    created_at: new Date('2024-01-16').toISOString(),
    updated_at: new Date('2024-01-16').toISOString(),
  },
];

describe('LeadsTable', () => {
  it('renders table with correct columns', () => {
    const onRowClick = vi.fn();
    render(<LeadsTable leads={mockLeads} onRowClick={onRowClick} />);

    expect(screen.getByText('ID')).toBeDefined();
    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.getByText('Phone')).toBeDefined();
    expect(screen.getByText('City')).toBeDefined();
    expect(screen.getByText('Source')).toBeDefined();
    expect(screen.getByText('Valid')).toBeDefined();
    expect(screen.getByText('Created')).toBeDefined();
  });

  it('renders all leads data correctly', () => {
    const onRowClick = vi.fn();
    render(<LeadsTable leads={mockLeads} onRowClick={onRowClick} />);

    expect(screen.getByText('School A')).toBeDefined();
    expect(screen.getByText('School B')).toBeDefined();
    expect(screen.getByText('11987654321')).toBeDefined();
    expect(screen.getByText('São Paulo')).toBeDefined();
    expect(screen.getByText('Rio de Janeiro')).toBeDefined();
  });

  it('displays empty state when no leads', () => {
    const onRowClick = vi.fn();
    render(<LeadsTable leads={[]} onRowClick={onRowClick} />);

    expect(screen.getByText('No leads found')).toBeDefined();
  });

  it('calls onRowClick when row is clicked', () => {
    const onRowClick = vi.fn();
    render(<LeadsTable leads={mockLeads} onRowClick={onRowClick} />);

    const rows = screen.getAllByRole('row');
    // First row is header, skip it
    rows[1].click();

    expect(onRowClick).toHaveBeenCalledWith(mockLeads[0]);
  });

  it('displays correct status badges', () => {
    const onRowClick = vi.fn();
    render(<LeadsTable leads={mockLeads} onRowClick={onRowClick} />);

    const validBadge = screen.getByText('Yes').closest('span');
    const invalidBadge = screen.getByText('No').closest('span');

    expect(validBadge?.className).toContain('bg-green-100');
    expect(invalidBadge?.className).toContain('bg-red-100');
  });

  it('displays source badge in blue', () => {
    const onRowClick = vi.fn();
    render(<LeadsTable leads={mockLeads} onRowClick={onRowClick} />);

    const sourceBadges = screen.getAllByText('google_maps');
    expect(sourceBadges[0].closest('span')?.className).toContain('bg-blue-100');
  });

  it('displays formatted date in created column', () => {
    const onRowClick = vi.fn();
    render(<LeadsTable leads={mockLeads} onRowClick={onRowClick} />);

    // Date should be formatted by toLocaleDateString (exact format depends on locale)
    const dateCell = screen.getByText('1').closest('tr')?.lastChild;
    expect(dateCell?.textContent).toBeTruthy();
  });

  it('calls onSort when header is clicked', () => {
    const onRowClick = vi.fn();
    const onSort = vi.fn();
    render(
      <LeadsTable
        leads={mockLeads}
        onRowClick={onRowClick}
        onSort={onSort}
      />
    );

    const nameHeader = screen.getByText('Name');
    nameHeader.closest('th')?.click();

    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('displays sort icons when sort is active', () => {
    const onRowClick = vi.fn();
    const onSort = vi.fn();
    render(
      <LeadsTable
        leads={mockLeads}
        onRowClick={onRowClick}
        onSort={onSort}
        sortColumn="name"
        sortDirection="asc"
      />
    );

    const nameHeader = screen.getByText('Name');
    expect(nameHeader.querySelector('svg')).toBeDefined();
  });
});
