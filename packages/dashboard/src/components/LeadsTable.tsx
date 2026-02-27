import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Lead } from '../types/index';

interface LeadsTableProps {
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
  onSort?: (column: string) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export function LeadsTable({
  leads,
  onRowClick,
  onSort,
  sortColumn,
  sortDirection,
}: LeadsTableProps) {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'source', label: 'Source' },
    { key: 'is_valid', label: 'Valid' },
    { key: 'created_at', label: 'Created' },
  ];

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline" />
    ) : (
      <ChevronDown className="w-4 h-4 inline" />
    );
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => onSort?.(col.key)}
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
              >
                {col.label} <SortIcon column={col.key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                No leads found
              </td>
            </tr>
          ) : (
            leads.map(lead => (
              <tr
                key={lead.id}
                onClick={() => onRowClick(lead)}
                className="border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition"
              >
                <td className="px-4 py-3 text-sm text-gray-900">{lead.id}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{lead.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                  {lead.phone}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{lead.city}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {lead.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      lead.is_valid
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {lead.is_valid ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
