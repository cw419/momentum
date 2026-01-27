import React from 'react';

type Lang = 'en' | 'zh';

interface IntroIllustrationDeckProps {
  lang: Lang;
  className?: string;
}

const DARK_MODE_FILTER =
  'dark:[filter:invert(1)_hue-rotate(180deg)_contrast(1.05)_brightness(1.08)]';

export const IntroIllustrationDeck: React.FC<IntroIllustrationDeckProps> = ({ lang, className }) => {
  const label = {
    title: { en: 'Proof, not vibes.', zh: 'Proof, not vibes.' },
    subtitle: { en: 'CTDP diagrams snapshot', zh: 'CTDP diagrams snapshot' },
  } as const;

  return (
    <div className={className}>
      <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none">
        <div className="absolute -inset-6 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-cyan-500/10 blur-2xl rounded-[48px] pointer-events-none" />

        <div className="relative h-[360px] sm:h-[420px] lg:h-[520px]">
          <div className="absolute inset-0 rotate-[-7deg] translate-x-[-14px] translate-y-[18px] opacity-80 dark:opacity-60 reduce-motion:transform-none">
            <div className="h-full rounded-[32px] border border-black/5 dark:border-white/10 bg-white/70 dark:bg-slate-900/30 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.18)] overflow-hidden">
              <img
                src="/intro/timeline.svg"
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className={`h-full w-full object-contain p-6 select-none pointer-events-none ${DARK_MODE_FILTER}`}
              />
            </div>
          </div>

          <div className="absolute inset-0 rotate-[5deg] translate-x-[16px] translate-y-[24px] opacity-90 dark:opacity-70 reduce-motion:transform-none">
            <div className="h-full rounded-[32px] border border-black/5 dark:border-white/10 bg-white/70 dark:bg-slate-900/30 backdrop-blur-md shadow-[0_20px_70px_rgba(0,0,0,0.22)] overflow-hidden">
              <img
                src="/intro/sacred-seat.svg"
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className={`h-full w-full object-contain p-6 select-none pointer-events-none ${DARK_MODE_FILTER}`}
              />
            </div>
          </div>

          <div className="absolute inset-0 translate-y-[0px] opacity-100 reduce-motion:transform-none">
            <div className="h-full rounded-[36px] border border-violet-200/60 dark:border-violet-500/20 bg-white/80 dark:bg-slate-900/35 backdrop-blur-md shadow-[0_30px_100px_rgba(124,58,237,0.20)] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-violet-200/20 dark:from-white/10 dark:to-violet-500/10 pointer-events-none" />
              <img
                src="/intro/integral-model.svg"
                alt={lang === 'zh' ? 'CTDP integral model diagram' : 'CTDP integral model diagram'}
                decoding="async"
                fetchPriority="high"
                className={`relative z-10 h-full w-full object-contain p-6 select-none ${DARK_MODE_FILTER}`}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-start justify-between gap-6 px-1">
          <div className="space-y-1">
            <div className="text-sm font-extrabold tracking-tight text-slate-800 dark:text-white">{label.title[lang]}</div>
            <div className="text-[11px] font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
              {label.subtitle[lang]}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2" aria-hidden="true">
            <div className="h-1.5 w-1.5 rounded-full bg-violet-600/70 dark:bg-violet-400/70" />
            <div className="h-1.5 w-6 rounded-full bg-violet-600/20 dark:bg-violet-400/20" />
            <div className="h-1.5 w-1.5 rounded-full bg-violet-600/40 dark:bg-violet-400/40" />
          </div>
        </div>
      </div>
    </div>
  );
};
