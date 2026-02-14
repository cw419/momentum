import React from 'react';
import { normalizeUnknownError } from '../utils/errors/normalizeError';
import {
  attemptChunkLoadRecovery,
  isChunkLoadError,
} from '../utils/chunkLoadRecovery';
import { logger } from '../utils/logger';
import { tr } from '../utils/runtimeI18n';

interface ChunkLoadErrorBoundaryProps {
  children: React.ReactNode;
}

interface ChunkLoadErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

export class ChunkLoadErrorBoundary extends React.Component<
  ChunkLoadErrorBoundaryProps,
  ChunkLoadErrorBoundaryState
> {
  state: ChunkLoadErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: unknown): ChunkLoadErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: unknown): void {
    const recovered = attemptChunkLoadRecovery(error);
    logger.error(
      'UI',
      'Unhandled render error reached chunk boundary',
      {
        recovered,
        chunkError: isChunkLoadError(error),
      },
      normalizeUnknownError(error),
    );
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const chunkError = isChunkLoadError(this.state.error);
    const title = chunkError
      ? tr(
          '应用资源已更新，请重新加载。',
          'The app was updated. Please reload.',
        )
      : tr(
          '页面出现异常，请重新加载。',
          'The app hit an error. Please reload.',
        );

    const description = chunkError
      ? tr(
          '检测到资源版本不一致，这通常发生在新版本发布后。',
          'A version mismatch was detected. This usually happens after a deployment.',
        )
      : tr(
          '当前页面无法继续渲染，刷新后通常可以恢复。',
          'The current view cannot continue rendering. Reload usually recovers.',
        );

    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <h1 className="mb-2 font-chinese text-xl font-bold text-gray-900 dark:text-slate-100">
            {title}
          </h1>
          <p className="mb-6 text-sm text-gray-600 dark:text-slate-300">
            {description}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="btn-primary btn-disabled w-full px-4 py-3"
          >
            {tr('重新加载应用', 'Reload app')}
          </button>
        </div>
      </div>
    );
  }
}
