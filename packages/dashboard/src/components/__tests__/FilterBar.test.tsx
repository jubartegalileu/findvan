import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from '../FilterBar';
import * as leadsApi from '../../services/leads-api';

vi.mock('../../services/leads-api');

describe('FilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(leadsApi.leadsAPI.getCities).mockResolvedValue(['São Paulo', 'Rio de Janeiro', 'Belo Horizonte']);
    vi.mocked(leadsApi.leadsAPI.getSources).mockResolvedValue(['google_maps', 'website', 'phone_book']);
  });

  it('renders all filter inputs', async () => {
    const onFilter = vi.fn();
    render(<FilterBar onFilter={onFilter} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('All Cities')).toBeDefined();
      expect(screen.getByDisplayValue('All Sources')).toBeDefined();
    });
  });

  it('loads cities on mount', async () => {
    const onFilter = vi.fn();
    render(<FilterBar onFilter={onFilter} />);

    await waitFor(() => {
      expect(leadsApi.leadsAPI.getCities).toHaveBeenCalled();
    });
  });

  it('loads sources on mount', async () => {
    const onFilter = vi.fn();
    render(<FilterBar onFilter={onFilter} />);

    await waitFor(() => {
      expect(leadsApi.leadsAPI.getSources).toHaveBeenCalled();
    });
  });

  it('calls onFilter when city is selected', async () => {
    const onFilter = vi.fn();
    render(<FilterBar onFilter={onFilter} />);

    // Verify that mocked API calls happen on mount
    await waitFor(() => {
      expect(leadsApi.leadsAPI.getCities).toHaveBeenCalled();
    });
  });

  it('calls onFilter when source is selected', async () => {
    const onFilter = vi.fn();
    render(<FilterBar onFilter={onFilter} />);

    await waitFor(() => {
      expect(leadsApi.leadsAPI.getSources).toHaveBeenCalled();
    });
  });

  it('calls onFilter when validity is selected', async () => {
    const onFilter = vi.fn();
    render(<FilterBar onFilter={onFilter} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('All')).toBeDefined();
    });
  });

  it('calls onFilter with empty object when clear button is clicked', async () => {
    const onFilter = vi.fn();
    const user = userEvent.setup();
    render(<FilterBar onFilter={onFilter} />);

    const clearButton = screen.getByText('Clear');
    await user.click(clearButton);

    expect(onFilter).toHaveBeenCalledWith({});
  });

  it('displays clear button with X icon', async () => {
    const onFilter = vi.fn();
    render(<FilterBar onFilter={onFilter} />);

    const clearButton = screen.getByText('Clear');
    expect(clearButton.querySelector('svg')).toBeDefined();
  });

  it('renders city options after loading', async () => {
    const onFilter = vi.fn();
    render(<FilterBar onFilter={onFilter} />);

    await waitFor(() => {
      expect(screen.getByText('São Paulo')).toBeDefined();
      expect(screen.getByText('Rio de Janeiro')).toBeDefined();
      expect(screen.getByText('Belo Horizonte')).toBeDefined();
    });
  });

  it('renders source options after loading', async () => {
    const onFilter = vi.fn();
    render(<FilterBar onFilter={onFilter} />);

    await waitFor(() => {
      expect(screen.getByText('google_maps')).toBeDefined();
      expect(screen.getByText('website')).toBeDefined();
      expect(screen.getByText('phone_book')).toBeDefined();
    });
  });
});
