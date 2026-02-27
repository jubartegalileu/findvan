import { useState, useEffect } from 'react';
import { FilterState } from '../types/index';

interface UseFiltersReturn {
  filters: FilterState;
  setCityFilter: (city: string) => void;
  setSourceFilter: (source: string) => void;
  setValidFilter: (isValid: boolean | null) => void;
  setPage: (page: number) => void;
  setSortBy: (column: string, direction: 'asc' | 'desc') => void;
  clearFilters: () => void;
}

const initialState: FilterState = {
  city: '',
  source: '',
  isValid: null,
  page: 1,
  sortBy: 'created_at',
  sortDirection: 'desc',
};

export function useFilters(): UseFiltersReturn {
  const [filters, setFilters] = useState<FilterState>(initialState);

  const setCityFilter = (city: string) => {
    setFilters(prev => ({ ...prev, city, page: 1 }));
  };

  const setSourceFilter = (source: string) => {
    setFilters(prev => ({ ...prev, source, page: 1 }));
  };

  const setValidFilter = (isValid: boolean | null) => {
    setFilters(prev => ({ ...prev, isValid, page: 1 }));
  };

  const setPage = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const setSortBy = (column: string, direction: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sortBy: column, sortDirection: direction }));
  };

  const clearFilters = () => {
    setFilters(initialState);
  };

  return {
    filters,
    setCityFilter,
    setSourceFilter,
    setValidFilter,
    setPage,
    setSortBy,
    clearFilters,
  };
}
