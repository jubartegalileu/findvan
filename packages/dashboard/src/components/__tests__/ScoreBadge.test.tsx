import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScoreBadge from '../ScoreBadge.jsx';

describe('ScoreBadge', () => {
  it('renderiza score excelente', () => {
    render(<ScoreBadge score={95} />);
    const badge = screen.getByText('Score 95 • Excelente');
    expect(badge.className).toContain('excellent');
  });

  it('renderiza score fraco para valor inválido', () => {
    render(<ScoreBadge score={null} />);
    const badge = screen.getByText('Score 0 • Fraco');
    expect(badge.className).toContain('weak');
  });
});
