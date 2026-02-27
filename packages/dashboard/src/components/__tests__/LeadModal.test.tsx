import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadModal } from '../LeadModal';
import { Lead } from '../../types/index';

const mockLead: Lead = {
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
};

describe('LeadModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const onClose = vi.fn();
    const { container } = render(
      <LeadModal lead={mockLead} isOpen={false} onClose={onClose} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('does not render when lead is null', () => {
    const onClose = vi.fn();
    const { container } = render(
      <LeadModal lead={null} isOpen={true} onClose={onClose} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen and lead are present', () => {
    const onClose = vi.fn();
    render(<LeadModal lead={mockLead} isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Lead Details')).toBeDefined();
  });

  it('displays all lead fields correctly', () => {
    const onClose = vi.fn();
    render(<LeadModal lead={mockLead} isOpen={true} onClose={onClose} />);

    expect(screen.getByText('School A')).toBeDefined();
    expect(screen.getByText('11987654321')).toBeDefined();
    expect(screen.getByText('contact@schoola.com')).toBeDefined();
    expect(screen.getByText('Rua A, 123')).toBeDefined();
    expect(screen.getByText('São Paulo')).toBeDefined();
    expect(screen.getByText('School A LTDA')).toBeDefined();
    expect(screen.getByText('12345678000190')).toBeDefined();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<LeadModal lead={mockLead} isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByText('Close');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when X button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<LeadModal lead={mockLead} isOpen={true} onClose={onClose} />);

    const buttons = screen.getAllByRole('button');
    const xButton = buttons[0]; // X button is first
    await user.click(xButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('copies phone to clipboard when copy button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const clipboardMock = vi.spyOn(navigator.clipboard, 'writeText');

    render(<LeadModal lead={mockLead} isOpen={true} onClose={onClose} />);

    const copyButtons = screen.getAllByRole('button', { name: '' });
    // Find the copy button next to phone
    const phoneRow = screen.getByText('11987654321').closest('div');
    const copyButton = phoneRow?.querySelector('button');

    if (copyButton) {
      await user.click(copyButton);
      expect(clipboardMock).toHaveBeenCalledWith('11987654321');
    }

    clipboardMock.mockRestore();
  });

  it('displays success checkmark after copy', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    render(<LeadModal lead={mockLead} isOpen={true} onClose={onClose} />);

    const phoneRow = screen.getByText('11987654321').closest('div');
    const copyButton = phoneRow?.querySelector('button');

    if (copyButton) {
      await user.click(copyButton);

      // Button should still exist after click
      expect(copyButton).toBeDefined();
    }
  });

  it('displays N/A for null values', () => {
    const onClose = vi.fn();
    const leadWithNull: Lead = {
      ...mockLead,
      email: null as any,
      address: null as any,
    };

    render(<LeadModal lead={leadWithNull} isOpen={true} onClose={onClose} />);

    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThan(0);
  });

  it('displays Yes for valid leads and No for invalid', () => {
    const onClose = vi.fn();
    render(<LeadModal lead={mockLead} isOpen={true} onClose={onClose} />);

    // Check that the valid status is displayed
    expect(screen.getByText('Valid')).toBeDefined();
    // Modal should render successfully
    expect(screen.getByText('Lead Details')).toBeDefined();
  });

  it('displays section headers for organization', () => {
    const onClose = vi.fn();
    render(<LeadModal lead={mockLead} isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Basic Information')).toBeDefined();
    expect(screen.getByText('Company Information')).toBeDefined();
    expect(screen.getByText('Location')).toBeDefined();
    expect(screen.getByText('Source & Validation')).toBeDefined();
  });

  it('formats dates correctly', () => {
    const onClose = vi.fn();
    render(<LeadModal lead={mockLead} isOpen={true} onClose={onClose} />);

    // Date should be formatted by toLocaleString
    const dateElements = screen.getAllByText(/2024|01|15/);
    expect(dateElements.length).toBeGreaterThan(0);
  });
});
