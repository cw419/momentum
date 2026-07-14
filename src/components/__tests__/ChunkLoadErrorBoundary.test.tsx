import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChunkLoadErrorBoundary } from '../ChunkLoadErrorBoundary';

const loggerError = vi.hoisted(() => vi.fn());

vi.mock('../../utils/logger', () => ({
  logger: { error: loggerError },
}));

function BrokenView({ error }: { error: Error }): never {
  throw error;
}

function suppressExpectedRenderError(event: ErrorEvent): void {
  event.preventDefault();
}

describe('ChunkLoadErrorBoundary', () => {
  beforeEach(() => {
    localStorage.setItem('language', 'en');
    loggerError.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.addEventListener('error', suppressExpectedRenderError);
  });

  afterEach(() => {
    window.removeEventListener('error', suppressExpectedRenderError);
    vi.restoreAllMocks();
  });

  it('renders children while the render tree is healthy', () => {
    render(
      <ChunkLoadErrorBoundary>
        <p>Loaded application</p>
      </ChunkLoadErrorBoundary>,
    );

    expect(screen.getByText('Loaded application')).toBeInTheDocument();
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('shows chunk-specific recovery guidance for a failed dynamic import', () => {
    const error = new Error('Loading chunk 17 failed');

    render(
      <ChunkLoadErrorBoundary>
        <BrokenView error={error} />
      </ChunkLoadErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', {
        name: 'The app was updated. Please reload.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'A version mismatch was detected. This usually happens after a deployment.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload app' })).toBeEnabled();
    expect(loggerError).toHaveBeenCalledWith(
      'UI',
      'Unhandled render error reached chunk boundary',
      { recovered: false, chunkError: true },
      error,
    );
  });

  it('shows generic recovery guidance for an unrelated render error', () => {
    const error = new Error('render failed');

    render(
      <ChunkLoadErrorBoundary>
        <BrokenView error={error} />
      </ChunkLoadErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', {
        name: 'The app hit an error. Please reload.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The current view cannot continue rendering. Reload usually recovers.',
      ),
    ).toBeInTheDocument();
    expect(loggerError).toHaveBeenCalledWith(
      'UI',
      'Unhandled render error reached chunk boundary',
      { recovered: false, chunkError: false },
      error,
    );
  });
});
