import { Suspense, lazy } from 'react';
import { ToastViewport } from './components/ToastViewport';
import { AuthWrapper } from './components/AuthWrapper';
import { useStorage } from './storage/StorageContext';

const AppShell = lazy(() => import('./AppShell'));

export default function App() {
  const storage = useStorage();

  const appShell = (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-xl">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">正在加载应用...</h2>
            <p className="text-gray-600 dark:text-slate-400 font-mono text-sm">LOADING APPLICATION</p>
          </div>
        </div>
      }
    >
      <AppShell />
    </Suspense>
  );

  return (
    <>
      {storage.kind === 'supabase' ? <AuthWrapper>{appShell}</AuthWrapper> : appShell}
      <ToastViewport />
    </>
  );
}
