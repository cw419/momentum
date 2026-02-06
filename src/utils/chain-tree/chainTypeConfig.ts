import type { Chain } from '../../types';
import type { IconName } from '../iconMap';

/**
 * 根据类型获取对应的图标和颜色
 */
export const getChainTypeConfig = (
  type: Chain['type'],
  language: 'en' | 'zh' = 'en'
): { icon: IconName; color: string; bgColor: string; name: string } => {
  const configs: Record<Chain['type'], { icon: IconName; color: string; bgColor: string }> = {
    unit: { icon: 'link', color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
    group: { icon: 'layers', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    assault: { icon: 'zap', color: 'text-red-500', bgColor: 'bg-red-500/10' },
    recon: { icon: 'search', color: 'text-green-500', bgColor: 'bg-green-500/10' },
    command: { icon: 'crown', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    special_ops: { icon: 'wrench', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    engineering: { icon: 'dumbbell', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    quartermaster: { icon: 'utensils', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  };

  const names: Record<'en' | 'zh', Record<Chain['type'], string>> = {
    en: {
      unit: 'Unit',
      group: 'Group',
      assault: 'Assault',
      recon: 'Recon',
      command: 'Command',
      special_ops: 'Special ops',
      engineering: 'Engineering',
      quartermaster: 'Quartermaster',
    },
    zh: {
      unit: '基础单元',
      group: '任务群',
      assault: '突击单元',
      recon: '侦查单元',
      command: '指挥单元',
      special_ops: '特勤单元',
      engineering: '工程单元',
      quartermaster: '炊事单元',
    },
  };

  const resolvedConfig = configs[type] || configs.unit;
  const resolvedName = names[language]?.[type] || names[language]?.unit || names.en.unit;

  return { ...resolvedConfig, name: resolvedName };
};

