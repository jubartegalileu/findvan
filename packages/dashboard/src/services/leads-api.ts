import axios from 'axios';
import { Lead, FetchLeadsResponse } from '../types/index';

const API_BASE = '/api';

// Direct database access (Module 2)
export const leadsAPI = {
  async getLeads(
    page: number,
    limit: number,
    filters?: { city?: string; source?: string; isValid?: boolean | null }
  ): Promise<FetchLeadsResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters?.city) params.append('city', filters.city);
      if (filters?.source) params.append('source', filters.source);
      if (filters?.isValid !== null && filters?.isValid !== undefined) {
        params.append('isValid', filters.isValid.toString());
      }

      const response = await axios.get<FetchLeadsResponse>(
        `${API_BASE}/leads?${params}`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      throw error;
    }
  },

  async getLeadById(id: number): Promise<Lead> {
    try {
      const response = await axios.get<Lead>(`${API_BASE}/leads/${id}`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch lead ${id}:`, error);
      throw error;
    }
  },

  async getCities(): Promise<string[]> {
    try {
      const response = await axios.get<{ cities: string[] }>(
        `${API_BASE}/leads/cities`,
        { timeout: 5000 }
      );
      return response.data.cities;
    } catch (error) {
      console.error('Failed to fetch cities:', error);
      return [];
    }
  },

  async getSources(): Promise<string[]> {
    try {
      const response = await axios.get<{ sources: string[] }>(
        `${API_BASE}/leads/sources`,
        { timeout: 5000 }
      );
      return response.data.sources;
    } catch (error) {
      console.error('Failed to fetch sources:', error);
      return [];
    }
  },
};
