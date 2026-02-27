export interface Lead {
  id: number;
  source: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  company_name: string;
  cnpj: string | null;
  url: string | null;
  captured_at: string;
  is_valid: boolean;
  is_duplicate: boolean;
  created_at: string;
  updated_at: string;
}

export interface FetchLeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  pages: number;
}

export interface FilterState {
  city: string;
  source: string;
  isValid: boolean | null;
  page: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}
