import React from 'react';
import { ArrowRight } from 'lucide-react';

interface DashboardHeroProps {
  language: 'zh' | 'en';
  nextStepLabel: string;
  tr: (zh: string, en: string) => string;
}

const DashboardHeroComponent: React.FC<DashboardHeroProps> = ({
  language,
  nextStepLabel,
  tr,
}) => (
  <header
    data-testid="dashboard-hero"
    className="mb-10 max-w-4xl animate-fade-in border-b border-gray-200/80 pb-8 text-left dark:border-slate-700/80 md:mb-12 md:pb-10"
  >
    <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300">
      <span className="h-px w-8 bg-primary-500" aria-hidden="true" />
      <span>{tr('CTDP 协议', 'CTDP Protocol')}</span>
    </div>

    <h1 className="mb-4 font-chinese text-4xl font-bold tracking-tight text-gray-950 dark:text-slate-50 sm:text-5xl md:text-6xl">
      Momentum
    </h1>

    <p className="max-w-3xl font-chinese text-base leading-7 text-gray-600 dark:text-slate-300 sm:text-lg sm:leading-8">
      {language === 'zh' ? (
        <>
          基于链式时延协议理论，通过
          <span className="font-semibold text-primary-500">神圣座位原理</span>、
          <span className="font-semibold text-primary-500">下必为例原理</span>和
          <span className="font-semibold text-primary-500">线性时延原理</span>
          ，帮助你建立强大的习惯链条
        </>
      ) : (
        <>
          Built on the Chained Time-Delay Protocol (CTDP), using{' '}
          <span className="font-semibold text-primary-500">
            the Sacred Seat Principle
          </span>
          ,{' '}
          <span className="font-semibold text-primary-500">
            the Precedent Principle
          </span>
          , and{' '}
          <span className="font-semibold text-primary-500">
            the Linear Time-Delay Principle
          </span>{' '}
          to help you build powerful habit chains.
        </>
      )}
    </p>
    <div className="mt-5 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-slate-400">
      <ArrowRight size={16} aria-hidden="true" />
      <span>{nextStepLabel}</span>
    </div>
  </header>
);

export const DashboardHero = React.memo(DashboardHeroComponent);

DashboardHero.displayName = 'DashboardHero';
