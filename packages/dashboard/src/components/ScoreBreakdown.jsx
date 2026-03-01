import React from 'react';

const labelMap = {
  phone: 'Telefone',
  email: 'Email',
  address: 'Endereço',
  cnpj: 'CNPJ',
  name: 'Nome',
  url: 'URL',
  city: 'Cidade',
  state: 'Estado',
  source: 'Fonte',
};

export default function ScoreBreakdown({ breakdown, emptyText = 'Sem detalhamento de score.' }) {
  if (!breakdown || typeof breakdown !== 'object') {
    return <div className="fv-row-sub">{emptyText}</div>;
  }

  return (
    <div className="fv-score-grid">
      {Object.entries(breakdown).map(([key, ok]) => (
        <div key={key} className="fv-score-item">
          <span>{ok ? '✓' : '✕'}</span>
          <span>{labelMap[key] || key}</span>
        </div>
      ))}
    </div>
  );
}
