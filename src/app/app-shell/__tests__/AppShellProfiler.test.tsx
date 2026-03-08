import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('AppShellProfiler', () => {
  it('tracks component renders in development mode', async () => {
    vi.resetModules();
    const trackComponentRender = vi.fn();

    vi.doMock('../../../utils/env', () => ({ isDev: true }));
    vi.doMock('../../../utils/reactPerformanceMonitor', () => ({
      reactPerformanceMonitor: {
        trackComponentRender,
      },
    }));

    const { AppShellProfiler } = await import('../AppShellProfiler');

    render(
      <AppShellProfiler id="dashboard-view">
        <div>profiled child</div>
      </AppShellProfiler>,
    );

    expect(screen.getByText('profiled child')).toBeInTheDocument();
    expect(trackComponentRender).toHaveBeenCalledWith(
      'dashboard-view',
      'mount',
      expect.any(Number),
    );
  });

  it('is a no-op outside development mode', async () => {
    vi.resetModules();
    const trackComponentRender = vi.fn();

    vi.doMock('../../../utils/env', () => ({ isDev: false }));
    vi.doMock('../../../utils/reactPerformanceMonitor', () => ({
      reactPerformanceMonitor: {
        trackComponentRender,
      },
    }));

    const { AppShellProfiler } = await import('../AppShellProfiler');

    render(
      <AppShellProfiler id="dashboard-view">
        <div>plain child</div>
      </AppShellProfiler>,
    );

    expect(screen.getByText('plain child')).toBeInTheDocument();
    expect(trackComponentRender).not.toHaveBeenCalled();
  });
});
