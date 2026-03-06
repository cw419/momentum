import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n';
import { DailyCheckinDemo } from '../DailyCheckinDemo';

describe('DailyCheckinDemo accessibility', () => {
  it('provides explicit aria-label for refresh button', () => {
    localStorage.setItem('language', 'en');

    render(
      <I18nProvider>
        <DailyCheckinDemo />
      </I18nProvider>,
    );

    expect(screen.getByRole('button', { name: 'Refresh' })).toHaveAttribute(
      'aria-label',
      'Refresh',
    );
  });
});
