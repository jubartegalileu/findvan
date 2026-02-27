import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { leadsAPI } from '../services/leads-api';

interface FilterBarProps {
  onFilter: (filters: {
    city?: string;
    source?: string;
    isValid?: boolean | null;
  }) => void;
}

export function FilterBar({ onFilter }: FilterBarProps) {
  const [cities, setCities] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedValid, setSelectedValid] = useState<string>('');

  useEffect(() => {
    async function loadOptions() {
      const [citiesData, sourcesData] = await Promise.all([
        leadsAPI.getCities(),
        leadsAPI.getSources(),
      ]);
      setCities(citiesData);
      setSources(sourcesData);
    }
    loadOptions();
  }, []);

  const handleFilterChange = () => {
    const filters = {
      city: selectedCity || undefined,
      source: selectedSource || undefined,
      isValid:
        selectedValid === ''
          ? undefined
          : selectedValid === 'true'
            ? true
            : false,
    };
    onFilter(filters);
  };

  const handleClear = () => {
    setSelectedCity('');
    setSelectedSource('');
    setSelectedValid('');
    onFilter({});
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          value={selectedCity}
          onChange={e => {
            setSelectedCity(e.target.value);
            handleFilterChange();
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Cities</option>
          {cities.map(city => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        <select
          value={selectedSource}
          onChange={e => {
            setSelectedSource(e.target.value);
            handleFilterChange();
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Sources</option>
          {sources.map(source => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>

        <select
          value={selectedValid}
          onChange={e => {
            setSelectedValid(e.target.value);
            handleFilterChange();
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All</option>
          <option value="true">Valid</option>
          <option value="false">Invalid</option>
        </select>

        <button
          onClick={handleClear}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      </div>
    </div>
  );
}
