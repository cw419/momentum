import { Profiler } from 'react';
import type { ReactNode, ProfilerOnRenderCallback } from 'react';
import { isDev } from '../../utils/env';
import { reactPerformanceMonitor } from '../../utils/reactPerformanceMonitor';

interface AppShellProfilerProps {
  id: string;
  children: ReactNode;
}

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  reactPerformanceMonitor.trackComponentRender(id, phase, actualDuration);
};

export function AppShellProfiler({ id, children }: AppShellProfilerProps) {
  if (!isDev) {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
