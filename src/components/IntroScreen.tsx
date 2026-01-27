import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import {
    Rocket, ArrowRight, Brain, Scale, Clock,
    Smartphone, Target, ShieldCheck, TrendingUp, Zap, Armchair, ChevronDown
} from 'lucide-react';
import { useI18n } from '../i18n';

interface IntroScreenProps {
    onSignIn: () => void;
    onSignUp: () => void;
}

type Lang = 'en' | 'zh';

const translations = {
    nav: {
        signIn: { en: 'Sign In', zh: '登录' },
        signUp: { en: 'Sign Up', zh: '注册' },
        startJourney: { en: 'Start Journey', zh: '开启旅程' },
    },
    hero: {
        tag: { en: 'MOMENTUM v2.0', zh: 'MOMENTUM v2.0' },
        titleline1: { en: 'Master Your', zh: '掌控你的' },
        titleline2: { en: 'Focus Protocol', zh: '专注协议' },
        desc: {
            en: 'The mathematical solution to self-control. Solving procrastination through the CTDP scientific model.',
            zh: '基于数学模型的自制力解决方案。通过 CTDP 科学模型彻底破解拖延症。'
        }
    },
    theory: {
        titleEn: 'Theoretical Basis',
        titleZh: '理论基石',
        desc: {
            en: 'Mathematical framework for behavioral economics.',
            zh: '行为经济学的数学框架。'
        },
        modelTitle: { en: 'The Integral Model', zh: '积分模型' },
        insightTitle: { en: 'Key Insight', zh: '关键洞察' },
        insightDesc: {
            en: 'The brain rewards short-term dopamine. We fix the weight function W(τ) to prioritize long-term value.',
            zh: '大脑倾向于短期多巴胺奖励。我们修正权重函数 W(τ) 以重塑长期价值优先级。'
        },
        valueFunc: {
            title: { en: 'Value V(τ)', zh: '价值函数 V(τ)' },
            desc: { en: 'Future value estimation', zh: '未来价值估算' }
        },
        weightFunc: {
            title: { en: 'Weight W(τ)', zh: '权重函数 W(τ)' },
            desc: { en: 'Time preference discounting', zh: '时间偏好贴现' }
        },
        cards: {
            social: {
                title: { en: 'Distraction', zh: '干扰源' },
                desc: { en: 'High Impulse, Net Negative', zh: '高冲动 · 净负值' }
            },
            work: {
                title: { en: 'Deep Work', zh: '深度工作' },
                desc: { en: 'Low Impulse, Net Positive', zh: '低冲动 · 净正值' }
            }
        }
    },
    principles: {
        titleEn: 'Core Principles',
        titleZh: '核心法则',
        list: [
            {
                id: 'sacred-seat',
                titleEn: 'SACRED SEAT',
                titleZh: '神圣座位',
                descEn: 'Value Compression',
                descZh: '价值压缩',
                detailEn: 'Bind the entire chain\'s value to a single trigger action.',
                detailZh: '将整个链条的价值绑定到单一触发动作。'
            },
            {
                id: 'precedent',
                titleEn: 'PRECEDENT LAW',
                titleZh: '判例法',
                descEn: 'Binary Constraints',
                descZh: '二元约束',
                detailEn: 'Zero tolerance for broken windows. Reset or Allow.',
                detailZh: '对破窗效应零容忍。要么重置，要么允许。'
            },
            {
                id: 'time-delay',
                titleEn: 'TIME DELAY',
                titleZh: '线性时延',
                descEn: 'Resistance Shifting',
                descZh: '阻力平移',
                detailEn: 'Use 15-min buffers to bypass startup inertia.',
                detailZh: '利用15分钟缓冲期绕过启动惯性。'
            }
        ]
    },
    features: {
        titleEn: 'System Modules',
        titleZh: '系统模块',
        desc: {
            en: 'Engineered for flow state.',
            zh: '为心流状态而工程化设计。'
        },
        list: [
            {
                titleEn: 'Chain Mgmt',
                titleZh: '链条管理',
                descEn: 'Independent execution threads.',
                descZh: '独立的执行线程。'
            },
            {
                titleEn: 'Reservation',
                titleZh: '预约系统',
                descEn: 'Startup inertia buffer.',
                descZh: '启动惯性缓冲。'
            },
            {
                titleEn: 'Adjudication',
                titleZh: '规则判决',
                descEn: 'Strict logic enforcement.',
                descZh: '严格的逻辑执行。'
            },
            {
                titleEn: 'Analytics',
                titleZh: '数据分析',
                descEn: 'Visualized progression.',
                descZh: '可视化的进阶。'
            }
        ]
    },
    benefits: {
        titleEn: 'Why Momentum',
        titleZh: '为何选择',
        list: [
            {
                titleEn: 'Scientific',
                titleZh: '科学构建',
                descEn: 'Math-proven models.',
                descZh: '经数学验证的模型。'
            },
            {
                titleEn: 'Instant',
                titleZh: '即时生效',
                descEn: 'Zero adaptation time.',
                descZh: '零适应时间。'
            },
            {
                titleEn: 'Durable',
                titleZh: '持久稳固',
                descEn: 'Anti-fragile design.',
                descZh: '反脆弱设计。'
            }
        ]
    }
};

export const IntroScreen: React.FC<IntroScreenProps> = ({ onSignIn, onSignUp }) => {
    const { language } = useI18n();
    const lang: Lang = language;

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
                    <ThemeToggle />
                </div>
            </nav>

            {/* Hero Section */}
            <section className="min-h-screen flex flex-col items-center justify-center relative z-10 px-6 pt-20 overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-violet-400/20 to-purple-500/20 dark:from-violet-600/15 dark:to-purple-700/15 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-cyan-400/15 to-blue-500/15 dark:from-cyan-600/10 dark:to-blue-700/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-2xl w-full text-center space-y-10 relative">
                    <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/50 dark:bg-white/10 border border-black/5 dark:border-white/10 shadow-[inner_0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] shadow-[0_0_8px_rgba(52,199,89,0.5)]"></span>
                        <span className="text-[10px] font-bold tracking-widest text-[#6C6C70] dark:text-[#98989D] uppercase">{translations.hero.tag[lang]}</span>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter text-slate-800 dark:text-white leading-[0.9]">
                            {translations.hero.titleline1[lang]}
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-400 dark:via-purple-400 dark:to-indigo-400">
                                {translations.hero.titleline2[lang]}
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-lg mx-auto font-medium leading-relaxed">
                            {translations.hero.desc[lang]}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-8 w-full max-w-xs mx-auto">
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

                <button
                    type="button"
                    onClick={scrollToNext}
                    aria-label={lang === 'zh' ? '向下滚动' : 'Scroll down'}
                    className="absolute bottom-12 animate-float cursor-pointer bg-transparent border-0 p-2 rounded-full focus-ring"
                >
                    <ChevronDown size={28} className="text-[#6C6C70] opacity-50" aria-hidden="true" />
                </button>
            </section>

            {/* Theory Section */}
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
                                    <h4 className="text-base font-bold text-slate-800 dark:text-white">{translations.theory.cards.social.title[lang]}</h4>
                                    <p className="text-xs font-semibold text-[#FF3B30] dark:text-[#FF453A] mt-1 tracking-wide">{translations.theory.cards.social.desc[lang]}</p>
                                </div>
                            </div>

                            <div className="glass-panel p-6 rounded-[28px] flex items-center gap-6 group hover:translate-x-2 transition-transform duration-300">
                                <div className="w-14 h-14 bg-green-100/50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center shrink-0">
                                    <Target className="w-6 h-6 text-[#34C759] dark:text-[#32D74B]" strokeWidth={2} />
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-slate-800 dark:text-white">{translations.theory.cards.work.title[lang]}</h4>
                                    <p className="text-xs font-semibold text-[#34C759] dark:text-[#32D74B] mt-1 tracking-wide">{translations.theory.cards.work.desc[lang]}</p>
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

            {/* Principles Section */}
            <section className="py-32 px-6 bg-white/40 dark:bg-slate-900/40 relative border-y border-violet-200/30 dark:border-violet-500/10">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-xl mx-auto mb-24 space-y-4">
                        <h2 className="text-[10px] font-bold tracking-widest text-violet-600 dark:text-violet-400 uppercase">
                            {translations.principles.titleEn}
                        </h2>
                        <h3 className="text-4xl font-extrabold text-slate-800 dark:text-white">
                            {lang === 'zh' ? '三大法则' : 'The Trinity'}
                        </h3>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {translations.principles.list.map((item, index) => {
                            const icons = [Armchair, Scale, Clock];
                            const Icon = icons[index];
                            return (
                                <div key={item.id} className="group relative pt-12">
                                    <div className="absolute top-0 left-8 px-4 py-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[10px] font-bold tracking-widest uppercase rounded-full z-20">
                                        0{index + 1}
                                    </div>
                                    <div className="glass-panel p-10 rounded-[32px] h-full transition duration-500 hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden">
                                        <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mb-10 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform duration-500">
                                            <Icon size={32} strokeWidth={1.5} />
                                        </div>

                                        <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                                            {lang === 'en' ? item.titleEn : item.titleZh}
                                        </h4>
                                        <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-6">
                                            {lang === 'en' ? item.descEn : item.descZh}
                                        </p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                            {lang === 'en' ? item.detailEn : item.detailZh}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

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
                            Free for early adopters. No credit card.
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
