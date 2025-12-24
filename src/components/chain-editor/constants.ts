import type { LucideIcon } from 'lucide-react';
import { Bell, BookOpen, Code, Coffee, Clock, Dumbbell, Headphones, Target } from 'lucide-react';

export type PresetLanguage = 'en' | 'zh';

export interface PresetTemplate {
  icon: LucideIcon;
  value: string;
  label: Record<PresetLanguage, string>;
  color: string;
}

export const CUSTOM_TRIGGER_VALUE = '自定义触发器';
export const CUSTOM_AUXILIARY_SIGNAL_VALUE = '自定义信号';

export const TRIGGER_TEMPLATES: PresetTemplate[] = [
  {
    icon: Headphones,
    value: '戴上降噪耳机',
    label: { zh: '戴上降噪耳机', en: 'Put on noise-cancelling headphones' },
    color: 'text-primary-500',
  },
  { icon: Code, value: '打开编程软件', label: { zh: '打开编程软件', en: 'Open your IDE' }, color: 'text-green-500' },
  { icon: BookOpen, value: '坐到书房书桌前', label: { zh: '坐到书房书桌前', en: 'Sit at your desk' }, color: 'text-blue-500' },
  { icon: Dumbbell, value: '换上运动服', label: { zh: '换上运动服', en: 'Put on workout clothes' }, color: 'text-red-500' },
  { icon: Coffee, value: '准备一杯咖啡', label: { zh: '准备一杯咖啡', en: 'Make a cup of coffee' }, color: 'text-yellow-500' },
  { icon: Target, value: CUSTOM_TRIGGER_VALUE, label: { zh: CUSTOM_TRIGGER_VALUE, en: 'Custom trigger' }, color: 'text-gray-500' },
];

export const AUXILIARY_SIGNAL_TEMPLATES: PresetTemplate[] = [
  { icon: Target, value: '打响指', label: { zh: '打响指', en: 'Snap your fingers' }, color: 'text-primary-500' },
  { icon: Clock, value: '设置手机闹钟', label: { zh: '设置手机闹钟', en: 'Set a phone alarm' }, color: 'text-green-500' },
  { icon: Bell, value: '按桌上的铃铛', label: { zh: '按桌上的铃铛', en: 'Ring the desk bell' }, color: 'text-blue-500' },
  { icon: Coffee, value: '说"开始预约"', label: { zh: '说"开始预约"', en: 'Say “Start booking”' }, color: 'text-yellow-500' },
  { icon: Target, value: CUSTOM_AUXILIARY_SIGNAL_VALUE, label: { zh: CUSTOM_AUXILIARY_SIGNAL_VALUE, en: 'Custom signal' }, color: 'text-gray-500' },
];

export const AUXILIARY_DURATION_PRESETS = [5, 10, 15, 20, 30, 45];
export const DURATION_PRESETS = [25, 30, 45, 60, 90, 120];

export const getTriggerLabel = (value: string, language: PresetLanguage): string => {
  const special: Partial<Record<string, Record<PresetLanguage, string>>> = {
    任务群容器: { zh: '任务群容器', en: 'Task group container' },
    开始第一个子任务: { zh: '开始第一个子任务', en: 'Start the first subtask' },
  };

  return special[value]?.[language] ?? TRIGGER_TEMPLATES.find(template => template.value === value)?.label[language] ?? value;
};

export const getAuxiliarySignalLabel = (value: string, language: PresetLanguage): string => {
  return AUXILIARY_SIGNAL_TEMPLATES.find(template => template.value === value)?.label[language] ?? value;
};
