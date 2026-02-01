import React from 'react';
import { Armchair, Scale, Clock } from 'lucide-react';
import { introTranslations as translations, type IntroLang } from './introTranslations';

interface IntroPrinciplesSectionProps {
  lang: IntroLang;
}

type PrincipleIllustrationSpec = {
  src: string;
  wrapperClassName: string;
  imgClassName: string;
  imgPaddingClassName: string;
};

const diagramDarkFilter =
  'dark:invert dark:hue-rotate-180 dark:mix-blend-screen dark:brightness-150 dark:contrast-150 dark:saturate-125 dark:drop-shadow-[0_0_14px_rgba(167,139,250,0.16)]';

const principleIllustrations: Record<string, PrincipleIllustrationSpec> = {
  'sacred-seat': {
    src: '/intro/sacred-seat.svg',
    wrapperClassName: 'w-[260px] opacity-[0.18] dark:opacity-[0.34] -right-12 -bottom-12 rotate-[8deg]',
    imgClassName: `h-auto object-contain ${diagramDarkFilter}`,
    imgPaddingClassName: 'p-4',
  },
  'precedent': {
    src: '/intro/integral-model.svg',
    wrapperClassName: 'w-[260px] opacity-[0.18] dark:opacity-[0.30] -right-12 -bottom-12 rotate-[8deg]',
    imgClassName: `h-auto object-contain ${diagramDarkFilter}`,
    imgPaddingClassName: 'p-4',
  },
  'time-delay': {
    src: '/intro/timeline.svg',
    wrapperClassName: 'w-[360px] opacity-[0.14] dark:opacity-[0.44] -right-16 -bottom-16 rotate-[10deg]',
    imgClassName: 'h-[240px] object-cover object-left scale-[1.45] intro-principle-ill--timeline',
    imgPaddingClassName: 'p-0',
  },
};

export const IntroPrinciplesSection: React.FC<IntroPrinciplesSectionProps> = ({ lang }) => {
  return (
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
            const illustration = principleIllustrations[item.id];
            return (
              <div key={item.id} className="group relative pt-12">
                <div className="absolute top-0 left-8 px-4 py-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[10px] font-bold tracking-widest uppercase rounded-full z-20">
                  0{index + 1}
                </div>
                <div className="glass-panel p-10 rounded-[32px] h-full transition duration-500 hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden">
                  {illustration ? (
                    <div className={`absolute pointer-events-none select-none ${illustration.wrapperClassName}`}>
                      <div className="rounded-[28px] border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/[0.08] backdrop-blur-sm shadow-[0_20px_80px_rgba(0,0,0,0.18)] overflow-hidden">
                        <img
                          src={illustration.src}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                          className={`w-full ${illustration.imgPaddingClassName} ${illustration.imgClassName}`}
                        />
                      </div>
                    </div>
                  ) : null}

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
  );
};

