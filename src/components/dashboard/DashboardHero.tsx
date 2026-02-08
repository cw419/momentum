import React from 'react';
import { Rocket } from 'lucide-react';

interface DashboardHeroProps {
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
}

const DashboardHeroComponent: React.FC<DashboardHeroProps> = ({
  language,
  tr,
}) => (
  <header
    data-testid="dashboard-hero"
    className="mb-16 animate-fade-in text-center"
  >
    <div className="mb-6 flex items-center justify-center space-x-4">
      <div className="gradient-primary flex h-16 w-16 items-center justify-center rounded-3xl shadow-xl">
        <Rocket className="text-white" size={24} />
      </div>
      <div>
        <h1 className="mb-2 font-chinese text-5xl font-bold text-gray-900 dark:text-slate-100 md:text-6xl">
          Momentum
        </h1>
        <p className="font-mono text-sm uppercase tracking-wider text-gray-600 dark:text-slate-400">
          {tr('CTDP 协议', 'CTDP Protocol')}
        </p>
      </div>
    </div>

    <p className="mx-auto max-w-3xl font-chinese text-lg leading-relaxed text-gray-700 dark:text-slate-300">
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
  </header>
);

export const DashboardHero = React.memo(DashboardHeroComponent);

DashboardHero.displayName = 'DashboardHero';
