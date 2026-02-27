import { useState, useEffect } from 'react';
import axios from 'axios';
import { Lead, FetchLeadsResponse } from '../types/index';

interface UseLeadsParams {
  page: number;
  limit: number;
  city?: string;
  source?: string;
  isValid?: boolean | null;
}

export function useLeads(params: UseLeadsParams) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          page: params.page.toString(),
          limit: params.limit.toString(),
        });

        if (params.city) queryParams.append('city', params.city);
        if (params.source) queryParams.append('source', params.source);
        if (params.isValid !== null && params.isValid !== undefined) {
          queryParams.append('isValid', params.isValid.toString());
        }

        const response = await axios.get<FetchLeadsResponse>(
          `/api/leads?${queryParams}`,
          { timeout: 5000 }
        );

        setLeads(response.data.leads);
        setTotal(response.data.total);
        setPages(response.data.pages);
      } catch (err) {
        const message = axios.isAxiosError(err)
          ? err.response?.data?.message || err.message
          : 'Failed to fetch leads';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [params.page, params.limit, params.city, params.source, params.isValid]);

  return { leads, total, pages, isLoading, error };
}
