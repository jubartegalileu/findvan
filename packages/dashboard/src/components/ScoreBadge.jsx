import React from 'react';

export const getScoreMeta = (score) => {
  const value = Number.isFinite(Number(score)) ? Number(score) : 0;
  if (value >= 90) return { label: 'Excelente', className: 'excellent' };
  if (value >= 70) return { label: 'Bom', className: 'good' };
  if (value >= 50) return { label: 'Regular', className: 'regular' };
  return { label: 'Fraco', className: 'weak' };
};

export default function ScoreBadge({ score }) {
  const value = Number.isFinite(Number(score)) ? Number(score) : 0;
  const meta = getScoreMeta(value);
  return <div className={`fv-row-chip ${meta.className}`}>Score {value} • {meta.label}</div>;
}
