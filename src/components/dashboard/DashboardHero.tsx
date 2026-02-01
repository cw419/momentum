import React from 'react';
import { Rocket } from 'lucide-react';

interface DashboardHeroProps {
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
}

const DashboardHeroComponent: React.FC<DashboardHeroProps> = ({ language, tr }) => (
  <header data-testid="dashboard-hero" className="text-center mb-16 animate-fade-in">
    <div className="flex items-center justify-center space-x-4 mb-6">
      <div className="w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center shadow-xl">
        <Rocket className="text-white" size={24} />
      </div>
      <div>
        <h1 className="text-5xl md:text-6xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-2">
          Momentum
        </h1>
        <p className="text-sm font-mono text-gray-600 dark:text-slate-400 tracking-wider uppercase">
          {tr('CTDP 协议', 'CTDP Protocol')}
        </p>
      </div>
    </div>

    <p className="text-gray-700 dark:text-slate-300 max-w-3xl mx-auto text-lg leading-relaxed font-chinese">
      {language === 'zh' ? (
        <>
          基于链式时延协议理论，通过<span className="font-semibold text-primary-500">神圣座位原理</span>、
          <span className="font-semibold text-primary-500">下必为例原理</span>和
          <span className="font-semibold text-primary-500">线性时延原理</span>，帮助你建立强大的习惯链条
        </>
      ) : (
        <>
          Built on the Chained Time-Delay Protocol (CTDP), using{' '}
          <span className="font-semibold text-primary-500">the Sacred Seat Principle</span>,{' '}
          <span className="font-semibold text-primary-500">the Precedent Principle</span>, and{' '}
          <span className="font-semibold text-primary-500">the Linear Time-Delay Principle</span> to help you build
          powerful habit chains.
        </>
      )}
    </p>
  </header>
);

export const DashboardHero = React.memo(DashboardHeroComponent);

DashboardHero.displayName = 'DashboardHero';

