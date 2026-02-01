import React from 'react';
import { Bell } from 'lucide-react';

import {
  AUXILIARY_SIGNAL_TEMPLATES,
  CUSTOM_AUXILIARY_SIGNAL_VALUE,
} from '../chain-editor/constants';

const ERROR_INPUT_BORDER_CLASSES = 'border-red-500 focus:border-red-500 focus:ring-red-500/20';

interface FormErrors {
  auxiliarySignal?: string;
}

interface AuxiliarySignalSectionProps {
  auxiliarySignal: string;
  customAuxiliarySignal: string;
  errors: FormErrors;
  language: 'zh' | 'en';
  onAuxiliarySignalSelect: (value: string) => void;
  onCustomAuxiliarySignalChange: (value: string) => void;
  tr: (zh: string, en: string) => string;
}

const AuxiliarySignalSectionComponent: React.FC<AuxiliarySignalSectionProps> = ({
  auxiliarySignal,
  customAuxiliarySignal,
  errors,
  language,
  onAuxiliarySignalSelect,
  onCustomAuxiliarySignalChange,
  tr,
}) => (
  <div data-testid="task-group-editor-auxiliary-signal" className="bento-card p-4 md:p-5 border-l-4 border-l-blue-500 animate-scale-in">
    <div className="flex items-center gap-3 mb-3">
      <Bell className="text-blue-500" size={18} />
      <div className="min-w-0">
        <h4 className="text-base font-semibold font-chinese text-gray-900 dark:text-slate-100">
          {tr('预约信号', 'Booking signal')}
        </h4>
        <p className="text-[11px] font-mono text-gray-500">{tr('预约信号', 'BOOKING SIGNAL')}</p>
      </div>
    </div>

    <select
      id="auxiliary-signal"
      name="auxiliarySignal"
      value={auxiliarySignal}
      onChange={(e) => onAuxiliarySignalSelect(e.target.value)}
      className={`w-full bg-gray-50 dark:bg-slate-700 border ${
        errors.auxiliarySignal
          ? ERROR_INPUT_BORDER_CLASSES
          : 'border-gray-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20'
      } rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition duration-300 font-chinese`}
      required
    >
      <option value="" disabled className="text-gray-400">
        {tr('选择预约信号', 'Choose a booking signal')}
      </option>
      {AUXILIARY_SIGNAL_TEMPLATES.map((template, index) => (
        <option
          key={index}
          value={template.value}
          className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700"
        >
          {template.label[language]}
        </option>
      ))}
    </select>

    {auxiliarySignal === CUSTOM_AUXILIARY_SIGNAL_VALUE && (
      <input
        type="text"
        id="custom-auxiliary-signal"
        name="customAuxiliarySignal"
        value={customAuxiliarySignal}
        onChange={(e) => onCustomAuxiliarySignalChange(e.target.value)}
        placeholder={tr('输入你的自定义预约信号', 'Enter your custom booking signal')}
        className={`w-full mt-3 bg-gray-50 dark:bg-slate-700 border ${
          errors.auxiliarySignal
            ? ERROR_INPUT_BORDER_CLASSES
            : 'border-gray-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20'
        } rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 transition duration-300 font-chinese`}
        required
      />
    )}

    {errors.auxiliarySignal && (
      <p className="mt-2 text-sm text-red-600 dark:text-red-400 font-chinese">{errors.auxiliarySignal}</p>
    )}
  </div>
);

export const AuxiliarySignalSection = React.memo(AuxiliarySignalSectionComponent);

AuxiliarySignalSection.displayName = 'AuxiliarySignalSection';

