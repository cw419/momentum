import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoadingFallback } from '../LoadingFallback';

vi.mock('../../../i18n', () => ({
  useI18n: () => ({
    tr: (_zh: string, en: string) => en,
  }),
}));

describe('LoadingFallback', () => {
  it('renders loading state copy', () => {
    render(<LoadingFallback />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });
});
