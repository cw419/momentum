import React from 'react';
import { Brain, Smartphone, Target } from 'lucide-react';
import { introTranslations as translations, type IntroLang } from './introTranslations';

interface IntroTheorySectionProps {
  lang: IntroLang;
}

export const IntroTheorySection: React.FC<IntroTheorySectionProps> = ({ lang }) => {
  return (
    <section id="theory-section" className="py-32 px-6 relative z-10">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
        <div className="space-y-12 sticky top-32">
          <div className="space-y-4">
            <h2 className="text-[10px] font-bold tracking-widest text-violet-600 dark:text-violet-400 uppercase pl-1">
              {translations.theory.titleEn}
            </h2>
            <h3 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              {lang === 'zh' ? '用数学重构自制力' : 'Re-engineering Willpower'}
            </h3>
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-md">
              {translations.theory.insightDesc[lang]}
            </p>
          </div>

          <div className="grid gap-6">
            <div className="glass-panel p-6 rounded-[28px] flex items-center gap-6 group hover:translate-x-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-red-100/50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-[#FF3B30] dark:text-[#FF453A]" strokeWidth={2} />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white">
                  {translations.theory.cards.social.title[lang]}
                </h4>
                <p className="text-xs font-semibold text-[#FF3B30] dark:text-[#FF453A] mt-1 tracking-wide">
                  {translations.theory.cards.social.desc[lang]}
                </p>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-[28px] flex items-center gap-6 group hover:translate-x-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-green-100/50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center shrink-0">
                <Target className="w-6 h-6 text-[#34C759] dark:text-[#32D74B]" strokeWidth={2} />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white">
                  {translations.theory.cards.work.title[lang]}
                </h4>
                <p className="text-xs font-semibold text-[#34C759] dark:text-[#32D74B] mt-1 tracking-wide">
                  {translations.theory.cards.work.desc[lang]}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Brain size={200} className="text-black dark:text-white" />
          </div>

          <div className="relative z-10 space-y-12">
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-widest text-violet-600 dark:text-violet-400 uppercase">
                {translations.theory.modelTitle[lang]}
              </span>
              <div className="text-3xl font-serif italic text-slate-800 dark:text-white p-6 bg-violet-50/50 dark:bg-violet-900/10 rounded-2xl border border-violet-200/50 dark:border-violet-500/20 inline-block w-full text-center">
                I = ∫ V(τ) · W(τ) dτ
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-[#007AFF]/10 dark:bg-[#0A84FF]/20 flex items-center justify-center shrink-0 border border-[#007AFF]/20 dark:border-[#0A84FF]/30">
                  <span className="font-serif italic font-bold text-[#007AFF] dark:text-[#0A84FF]">V</span>
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-white">{translations.theory.valueFunc.title[lang]}</h5>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{translations.theory.valueFunc.desc[lang]}</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-[#AF52DE]/10 dark:bg-[#BF5AF2]/20 flex items-center justify-center shrink-0 border border-[#AF52DE]/20 dark:border-[#BF5AF2]/30">
                  <span className="font-serif italic font-bold text-[#AF52DE] dark:text-[#BF5AF2]">W</span>
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-white">{translations.theory.weightFunc.title[lang]}</h5>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{translations.theory.weightFunc.desc[lang]}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

