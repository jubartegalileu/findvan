import React from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Lead } from '../types/index';

interface LeadModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LeadModal({ lead, isOpen, onClose }: LeadModalProps) {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  if (!isOpen || !lead) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const FieldRow = ({ label, value, copyable = false }: { label: string; value: string | number | boolean | null; copyable?: boolean }) => {
    const displayValue = value === null ? 'N/A' : value === true ? 'Yes' : value === false ? 'No' : String(value);

    return (
      <div className="flex justify-between items-center py-3 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-900">{displayValue}</span>
          {copyable && value && (
            <button
              onClick={() => copyToClipboard(String(value), label)}
              className="p-1 hover:bg-gray-100 rounded transition"
            >
              {copiedField === label ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex justify-between items-center p-6 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Lead Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-2">
          {/* ID and Status */}
          <FieldRow label="ID" value={lead.id} />
          <FieldRow label="Created" value={new Date(lead.created_at).toLocaleString()} />
          <FieldRow label="Updated" value={new Date(lead.updated_at).toLocaleString()} />

          {/* Basic Info */}
          <div className="mt-6 mb-2 text-sm font-semibold text-gray-700">Basic Information</div>
          <FieldRow label="Name" value={lead.name} />
          <FieldRow label="Phone" value={lead.phone} copyable />
          <FieldRow label="Email" value={lead.email || 'N/A'} copyable={Boolean(lead.email)} />

          {/* Company Info */}
          <div className="mt-6 mb-2 text-sm font-semibold text-gray-700">Company Information</div>
          <FieldRow label="Company Name" value={lead.company_name || 'N/A'} />
          <FieldRow label="CNPJ" value={lead.cnpj || 'N/A'} copyable={Boolean(lead.cnpj)} />
          <FieldRow label="URL" value={lead.url || 'N/A'} />

          {/* Location */}
          <div className="mt-6 mb-2 text-sm font-semibold text-gray-700">Location</div>
          <FieldRow label="City" value={lead.city} />
          <FieldRow label="Address" value={lead.address || 'N/A'} copyable={Boolean(lead.address)} />

          {/* Source & Status */}
          <div className="mt-6 mb-2 text-sm font-semibold text-gray-700">Source & Validation</div>
          <FieldRow label="Source" value={lead.source} />
          <FieldRow
            label="Valid"
            value={
              <span className={`px-2 py-1 rounded text-xs font-medium ${lead.is_valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {lead.is_valid ? 'Yes' : 'No'}
              </span>
            }
          />
          <FieldRow label="Duplicate" value={lead.is_duplicate ? 'Yes' : 'No'} />
          <FieldRow label="Captured" value={new Date(lead.captured_at).toLocaleString()} />
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-2 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
