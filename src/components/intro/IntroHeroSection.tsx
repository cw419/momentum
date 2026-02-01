import React from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { IntroIllustrationDeck } from './IntroIllustrationDeck';
import { introTranslations as translations, type IntroLang } from './introTranslations';

interface IntroHeroSectionProps {
  lang: IntroLang;
  onSignIn: () => void;
  onSignUp: () => void;
  onScrollDown: () => void;
}

export const IntroHeroSection: React.FC<IntroHeroSectionProps> = ({
  lang,
  onSignIn,
  onSignUp,
  onScrollDown,
}) => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative z-10 px-6 pt-20 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-violet-400/20 to-purple-500/20 dark:from-violet-600/15 dark:to-purple-700/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-cyan-400/15 to-blue-500/15 dark:from-cyan-600/10 dark:to-blue-700/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl w-full grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center relative">
        <div className="text-center lg:text-left space-y-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/50 dark:bg-white/10 border border-black/5 dark:border-white/10 shadow-[inner_0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] shadow-[0_0_8px_rgba(52,199,89,0.5)]"></span>
            <span className="text-[10px] font-bold tracking-widest text-[#6C6C70] dark:text-[#98989D] uppercase">
              {translations.hero.tag[lang]}
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter text-slate-800 dark:text-white leading-[0.9]">
              {translations.hero.titleline1[lang]}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-400 dark:via-purple-400 dark:to-indigo-400">
                {translations.hero.titleline2[lang]}
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-lg mx-auto lg:mx-0 font-medium leading-relaxed">
              {translations.hero.desc[lang]}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start pt-8 w-full max-w-xs mx-auto lg:mx-0">
            <button
              onClick={onSignIn}
              className="w-full h-14 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition active:scale-95 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 flex items-center justify-center space-x-2"
            >
              <span className="text-sm font-bold tracking-wide">{translations.nav.signIn[lang]}</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={onSignUp}
              className="w-full h-14 bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-white font-semibold rounded-2xl border border-violet-200 dark:border-violet-500/30 transition active:scale-95 shadow-md hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-500/50 backdrop-blur-sm flex items-center justify-center space-x-2"
            >
              <span className="text-sm font-bold tracking-wide">{translations.nav.signUp[lang]}</span>
            </button>
          </div>
        </div>

        <div className="w-full flex justify-center lg:justify-end">
          <IntroIllustrationDeck lang={lang} className="w-full" />
        </div>
      </div>

      <button
        type="button"
        onClick={onScrollDown}
        aria-label={lang === 'zh' ? '向下滚动' : 'Scroll down'}
        className="absolute bottom-12 animate-float cursor-pointer bg-transparent border-0 p-2 rounded-full focus-ring"
      >
        <ChevronDown size={28} className="text-[#6C6C70] opacity-50" aria-hidden="true" />
      </button>
    </section>
  );
};

