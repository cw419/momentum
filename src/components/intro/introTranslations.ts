export type IntroLang = 'en' | 'zh';

export const introTranslations = {
    nav: {
        signIn: { en: 'Sign In', zh: '登录' },
        signUp: { en: 'Sign Up', zh: '注册' },
        startJourney: { en: 'Start Journey', zh: '开启旅程' },
        startJourneySubtext: { en: 'Open-source on GitHub. Free to use.', zh: '开源项目，免费使用。' },
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
} as const;

