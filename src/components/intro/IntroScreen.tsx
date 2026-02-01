import React from 'react';
import { ThemeToggle } from '../ThemeToggle';
import {
    Rocket, ArrowRight, Clock,
    ShieldCheck, TrendingUp, Zap, Github
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { introTranslations as translations, type IntroLang as Lang } from './introTranslations';
import { IntroHeroSection } from './IntroHeroSection';
import { IntroTheorySection } from './IntroTheorySection';
import { IntroPrinciplesSection } from './IntroPrinciplesSection';

interface IntroScreenProps {
    onSignIn: () => void;
    onSignUp: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onSignIn, onSignUp }) => {
    const { language, setLanguage } = useI18n();
    const lang: Lang = language;
    const githubUrl = 'https://github.com/KenXiao1/momentum';

    const scrollToNext = () => {
        const theorySection = document.getElementById('theory-section');
        theorySection?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen relative overflow-x-hidden bg-background transition-colors duration-500 font-sans selection:bg-violet-600 selection:text-white dark:selection:bg-violet-400 dark:selection:text-black">

            {/* Header */}
            <nav className="fixed top-0 left-0 right-0 h-16 px-6 z-50 flex justify-between items-center nav-glass">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/25">
                        <Rocket className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-slate-800 dark:text-white">MOMENTUM</span>
                </div>
                <div className="flex items-center space-x-4">
                    <div
                        className="inline-flex items-center rounded-full border border-black/5 bg-white/60 p-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                        role="radiogroup"
                        aria-label="Language"
                    >
                        <button
                            type="button"
                            onClick={() => setLanguage('en')}
                            className={`focus-ring inline-flex h-8 w-10 items-center justify-center rounded-full transition ${
                                language === 'en'
                                    ? 'bg-white/90 text-slate-900 dark:bg-white/15 dark:text-white'
                                    : 'hover:bg-white/60 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white'
                            }`}
                            aria-checked={language === 'en'}
                            role="radio"
                            title="English"
                        >
                            EN
                        </button>
                        <button
                            type="button"
                            onClick={() => setLanguage('zh')}
                            className={`focus-ring inline-flex h-8 w-10 items-center justify-center rounded-full transition ${
                                language === 'zh'
                                    ? 'bg-white/90 text-slate-900 dark:bg-white/15 dark:text-white'
                                    : 'hover:bg-white/60 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white'
                            }`}
                            aria-checked={language === 'zh'}
                            role="radio"
                            title="Chinese"
                        >
                            CN
                        </button>
                    </div>
                    <a
                        href={githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={lang === 'zh' ? '在 GitHub 打开项目' : 'Open project on GitHub'}
                        title={lang === 'zh' ? '在 GitHub 打开项目' : 'Open project on GitHub'}
                        className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/5 bg-white/60 text-slate-700 shadow-sm transition hover:bg-white/80 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                        <Github className="h-5 w-5" aria-hidden="true" />
                    </a>
                    <ThemeToggle />
                </div>
            </nav>

            <IntroHeroSection lang={lang} onSignIn={onSignIn} onSignUp={onSignUp} onScrollDown={scrollToNext} />

            {/* Theory Section */}
            <IntroTheorySection lang={lang} />

            {/* Principles Section */}
            <IntroPrinciplesSection lang={lang} />

            {/* Features Section */}
            <section className="py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                        <div className="space-y-4">
                            <h2 className="text-[10px] font-bold tracking-widest text-violet-600 dark:text-violet-400 uppercase">
                                {translations.features.titleEn}
                            </h2>
                            <h3 className="text-4xl font-extrabold text-slate-800 dark:text-white max-w-md leading-tight">
                                {lang === 'zh' ? '为心流状态而工程化设计的系统' : 'Engineered for Flow State'}
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="w-2 h-2 rounded-full bg-violet-600 dark:bg-violet-400 opacity-20"></div>
                            <div className="w-2 h-2 rounded-full bg-violet-600 dark:bg-violet-400 opacity-40"></div>
                            <div className="w-2 h-2 rounded-full bg-violet-600 dark:bg-violet-400 opacity-60"></div>
                            <div className="w-2 h-2 rounded-full bg-violet-600 dark:bg-violet-400 opacity-100"></div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        {translations.features.list.map((item, index) => {
                            const icons = [TrendingUp, Clock, ShieldCheck, Zap];
                            const Icon = icons[index];
                            return (
                                <div key={index} className="glass-panel p-8 rounded-[24px] hover:bg-white/80 dark:hover:bg-slate-800/60 transition-colors">
                                    <Icon className="w-8 h-8 text-violet-600 dark:text-violet-400 mb-6" strokeWidth={1.5} />
                                    <h4 className="text-base font-bold text-slate-800 dark:text-white mb-2">{lang === 'en' ? item.titleEn : item.titleZh}</h4>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{lang === 'en' ? item.descEn : item.descZh}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* Footer CTA */}
            <section className="py-32 px-6 flex justify-center">
                <div className="glass-panel rounded-[40px] p-2 pr-10 pl-2 flex items-center space-x-6 max-w-xl w-full mx-auto shadow-2xl hover:scale-[1.01] transition-transform duration-500">
                    <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-[32px] flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/25">
                        <Rocket className="text-white w-8 h-8" strokeWidth={2} />
                    </div>
                    <div className="flex-1 space-y-1">
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                            {translations.nav.startJourney[lang]}
                        </h4>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {translations.nav.startJourneySubtext[lang]}
                        </p>
                    </div>
                    <button
                        onClick={onSignUp}
                        className="w-12 h-12 rounded-full border-2 border-violet-200 dark:border-violet-500/30 flex items-center justify-center group hover:bg-gradient-to-r hover:from-violet-600 hover:to-purple-600 hover:border-transparent transition"
                    >
                        <ArrowRight className="w-5 h-5 text-violet-600 dark:text-violet-400 group-hover:text-white" />
                    </button>
                </div>
            </section>
        </div>
    );
};
