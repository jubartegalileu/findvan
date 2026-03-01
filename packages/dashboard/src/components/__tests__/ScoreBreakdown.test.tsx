import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScoreBreakdown from '../ScoreBreakdown.jsx';

describe('ScoreBreakdown', () => {
  it('renderiza itens de breakdown com labels amigáveis', () => {
    render(<ScoreBreakdown breakdown={{ phone: true, email: false }} />);
    expect(screen.getByText('Telefone')).toBeDefined();
    expect(screen.getByText('Email')).toBeDefined();
  });

  it('renderiza fallback sem breakdown', () => {
    render(<ScoreBreakdown breakdown={null} />);
    expect(screen.getByText('Sem detalhamento de score.')).toBeDefined();
  });
});
