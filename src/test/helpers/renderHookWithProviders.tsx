import React from 'react';
import { renderHook } from '@testing-library/react';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { I18nProvider } from '../../i18n';
import { StorageProvider } from '../../storage/StorageContext';
import { createLocalStorageMock } from '../factories/storageMock';

interface RenderHookWithProvidersOptions {
  storage?: MomentumStorage;
  language?: 'en' | 'zh';
}

export function renderHookWithProviders<Result, Props>(
  hook: (props: Props) => Result,
  options: RenderHookWithProvidersOptions = {}
) {
  const { storage = createLocalStorageMock(), language = 'en' } = options;
  localStorage.setItem('language', language);

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>
      <StorageProvider storage={storage}>{children}</StorageProvider>
    </I18nProvider>
  );

  return renderHook(hook, { wrapper });
}
