import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../i18n';
import type { ViewState } from '../../../types/app-state';
import { MobileBottomNav } from '../MobileBottomNav';

function renderNav(
  overrides: Partial<Parameters<typeof MobileBottomNav>[0]> = {},
) {
  const defaultProps = {
    currentView: 'dashboard' as ViewState,
    hasActiveSession: false,
    onNavigate: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  };

  return {
    ...render(
      <I18nProvider>
        <MobileBottomNav {...defaultProps} />
      </I18nProvider>,
    ),
    props: defaultProps,
  };
}

describe('MobileBottomNav', () => {
  beforeEach(() => {
    localStorage.setItem('language', 'en');
    vi.clearAllMocks();
  });

  it('should render four tab buttons on dashboard view', () => {
    renderNav({ currentView: 'dashboard' });

    expect(screen.getByRole('button', { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Focus/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RSIP/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Settings/i }),
    ).toBeInTheDocument();
  });

  it('should return null for hidden views', () => {
    const hiddenViews: ViewState[] = [
      'editor',
      'detail',
      'group',
      'taskgroup-editor',
      'focus',
    ];

    for (const view of hiddenViews) {
      const { container } = render(
        <I18nProvider>
          <MobileBottomNav
            currentView={view}
            hasActiveSession={false}
            onNavigate={vi.fn()}
            onOpenSettings={vi.fn()}
          />
        </I18nProvider>,
      );
      expect(container).toBeEmptyDOMElement();
    }
  });

  it('should mark Home as active on dashboard view', () => {
    renderNav({ currentView: 'dashboard' });

    const homeBtn = screen.getByRole('button', { name: /Home/i });
    expect(homeBtn).toHaveAttribute('aria-current', 'page');
  });

  it('should mark RSIP as active on rsip view', () => {
    renderNav({ currentView: 'rsip' });

    const rsipBtn = screen.getByRole('button', { name: /RSIP/i });
    expect(rsipBtn).toHaveAttribute('aria-current', 'page');
  });

  it('should disable Focus tab when no active session', () => {
    renderNav({ hasActiveSession: false });

    const focusBtn = screen.getByRole('button', { name: /Focus/i });
    expect(focusBtn).toBeDisabled();
  });

  it('should enable Focus tab when there is an active session', () => {
    renderNav({ hasActiveSession: true });

    const focusBtn = screen.getByRole('button', { name: /Focus/i });
    expect(focusBtn).not.toBeDisabled();
  });

  it('should call onNavigate with dashboard when Home is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderNav({ currentView: 'rsip' });

    await user.click(screen.getByRole('button', { name: /Home/i }));

    expect(props.onNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('should call onNavigate with rsip when RSIP is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderNav({ currentView: 'dashboard' });

    await user.click(screen.getByRole('button', { name: /RSIP/i }));

    expect(props.onNavigate).toHaveBeenCalledWith('rsip');
  });

  it('should call onOpenSettings when Settings is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderNav({ currentView: 'dashboard' });

    await user.click(screen.getByRole('button', { name: /Settings/i }));

    expect(props.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('should have accessible navigation landmark', () => {
    renderNav();

    expect(
      screen.getByRole('navigation', { name: /Bottom navigation/i }),
    ).toBeInTheDocument();
  });

  it('should have minimum 44px touch targets', () => {
    renderNav();

    const buttons = screen.getAllByRole('button');
    for (const btn of buttons) {
      expect(btn.className).toContain('min-h-[44px]');
      expect(btn.className).toContain('min-w-[44px]');
    }
  });
});
