import React, { useState } from 'react';
import { Chain, ChainDraft } from '../types';
import { ArrowLeft, Save, Tag, Calendar, Bell, Hash, Hourglass, CheckCircle } from 'lucide-react';
import { ResponsiveContainer } from './ResponsiveContainer';
import { SettingSection } from './SettingSection';
import { SliderContainer } from './SliderContainer';
import { PureDOMSlider } from './PureDOMSlider';
import { useMobileOptimization, useTouchOptimization, useVirtualKeyboardAdaptation } from '../hooks/useMobileOptimization';
import { isDev } from '../utils/env';
import { logger } from '../utils/logger';
import { useI18n } from '../i18n';
import {
  AUXILIARY_DURATION_PRESETS,
  AUXILIARY_SIGNAL_TEMPLATES,
  CUSTOM_AUXILIARY_SIGNAL_VALUE,
  getTriggerLabel,
} from './chain-editor/constants';

interface TaskGroupEditorProps {
  chain?: Chain;
  isEditing: boolean;
  initialParentId?: string;
  onSave: (chain: ChainDraft) => void;
  onCancel: () => void;
}

export const TaskGroupEditor: React.FC<TaskGroupEditorProps> = ({
  chain,
  isEditing,
  initialParentId,
  onSave,
  onCancel,
}) => {
  const { language, tr } = useI18n();
  const [name, setName] = useState(chain?.name || '');
  const [description, setDescription] = useState(chain?.description || '');
  const [auxiliarySignal, setAuxiliarySignal] = useState(chain?.auxiliarySignal || AUXILIARY_SIGNAL_TEMPLATES[0]?.value || '');
  const [customAuxiliarySignal, setCustomAuxiliarySignal] = useState('');
  const [auxiliaryDuration, setAuxiliaryDuration] = useState(chain?.auxiliaryDuration || 15);
  const [isCustomAuxiliaryDuration, setIsCustomAuxiliaryDuration] = useState(
    chain?.auxiliaryDuration ? !AUXILIARY_DURATION_PRESETS.includes(chain.auxiliaryDuration) : false
  );
  const [auxiliaryCompletionTrigger, setAuxiliaryCompletionTrigger] = useState(chain?.auxiliaryCompletionTrigger || '开始第一个子任务');
  const [errors, setErrors] = useState<{
    name?: string;
    description?: string;
    auxiliarySignal?: string;
    auxiliaryCompletionTrigger?: string;
  }>({});

  const handleAuxiliarySignalSelect = (value: string) => {
    setAuxiliarySignal(value);
    if (value !== CUSTOM_AUXILIARY_SIGNAL_VALUE) {
      setCustomAuxiliarySignal('');
    }
    // Clear auxiliary signal error when user makes a selection
    if (errors.auxiliarySignal && value) {
      setErrors(prev => ({ ...prev, auxiliarySignal: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDev) {
      logger.debug('TASK_GROUP_EDITOR', '提交表单');
      logger.debug('TASK_GROUP_EDITOR', '当前表单数据', {
        name: name.trim(),
        description: description.trim(),
        auxiliarySignal: auxiliarySignal === CUSTOM_AUXILIARY_SIGNAL_VALUE ? customAuxiliarySignal.trim() : auxiliarySignal,
        auxiliaryDuration,
        auxiliaryCompletionTrigger: auxiliaryCompletionTrigger.trim(),
      });
    }
    
    // Clear previous errors
    setErrors({});
    
    const newErrors: { 
      name?: string; 
      description?: string; 
      auxiliarySignal?: string; 
      auxiliaryCompletionTrigger?: string; 
    } = {};
    
    if (!name.trim()) {
      newErrors.name = tr('请输入任务群名称', 'Please enter a group name');
    }
    
    if (!description.trim()) {
      newErrors.description = tr('请输入任务群描述', 'Please enter a group description');
    }

    // Validate auxiliary signal
    if (!auxiliarySignal) {
      newErrors.auxiliarySignal = tr('请选择预约信号', 'Please choose a booking signal');
    } else if (auxiliarySignal === CUSTOM_AUXILIARY_SIGNAL_VALUE && !customAuxiliarySignal.trim()) {
      newErrors.auxiliarySignal = tr('请输入自定义预约信号', 'Please enter a custom booking signal');
    }

    // Validate auxiliary completion trigger
    if (!auxiliaryCompletionTrigger.trim()) {
      newErrors.auxiliaryCompletionTrigger = tr('请输入预约完成条件', 'Please enter a booking completion condition');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (isDev) {
        logger.warn('TASK_GROUP_EDITOR', '表单验证失败', { errors: newErrors });
      }
      return;
    }

    const finalAuxiliarySignal = auxiliarySignal === CUSTOM_AUXILIARY_SIGNAL_VALUE
      ? customAuxiliarySignal.trim() 
      : auxiliarySignal;

    const chainData: Extract<ChainDraft, { type: 'group' }> = {
      name: name.trim(),
      type: 'group',
      parentId: chain?.parentId || initialParentId,
      sortOrder: chain?.sortOrder || Math.floor(Date.now() / 1000),
      trigger: '任务群容器',
      duration: 0,
      isDurationless: true,
      description: description.trim(),
      auxiliarySignal: finalAuxiliarySignal,
      auxiliaryDuration,
      auxiliaryCompletionTrigger: auxiliaryCompletionTrigger.trim(),
      exceptions: chain?.exceptions || [],
      auxiliaryExceptions: chain?.auxiliaryExceptions || [],
      // Task group specific properties - system managed
      isTaskGroup: true,
      groupRepeatCount: 0, // System starts at 0, increments on completion
      taskRepeatCount: 1,
      timeLimitHours: undefined,
      timeLimitExceptions: [],
    };
    
    if (isDev) {
      logger.debug('TASK_GROUP_EDITOR', '即将保存的任务群数据', { chainData });
    }
    onSave(chainData);
  };

  // 移动端优化
  const mobileInfo = useMobileOptimization();
  useTouchOptimization();
  const { keyboardHeight, isKeyboardVisible } = useVirtualKeyboardAdaptation();

  return (
    <div 
      className={`min-h-screen bg-background overflow-x-hidden ${isKeyboardVisible ? 'keyboard-active' : ''}`}
      style={{ paddingBottom: isKeyboardVisible ? `${keyboardHeight}px` : '0' }}
    >
      <ResponsiveContainer 
        maxWidth="4xl" 
        className={`py-4 md:py-6 ${mobileInfo.isMobile ? 'px-4' : ''}`}
      >
        {/* Header */}
        <header className="flex items-center justify-between mb-12 animate-fade-in">
          <div className="flex items-center space-x-4">
            <button
              onClick={onCancel}
              className="p-3 text-gray-400 hover:text-[#161615] transition-colors rounded-2xl hover:bg-white/50"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold font-chinese text-[#161615] dark:text-slate-100 mb-2">
                {isEditing ? tr('编辑任务群', 'Edit group') : tr('创建任务群', 'Create group')}
              </h1>
              <p className="text-sm font-mono text-gray-500 tracking-wider uppercase">
                {isEditing ? tr('编辑任务群', 'EDIT GROUP') : tr('创建任务群', 'CREATE GROUP')}
              </p>
            </div>
          </div>
          
          {/* Task Group Completion Counter */}
          {chain && isEditing && (
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/50 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-2">
                <Hash className="text-primary-600 dark:text-primary-400" size={16} />
                <span className="text-primary-700 dark:text-primary-300 font-bold text-lg">
                  #{chain.totalCompletions || 0}
                </span>
              </div>
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-1 font-chinese">
                {tr('完成次数', 'Completions')}
              </p>
            </div>
          )}
        </header>

        <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
          {/* 基础信息区 */}
          <SettingSection
            title={tr('基础信息', 'Basic info')}
            icon={<Tag className="text-primary-500" size={20} />}
            description={tr('设置任务群的基本信息', 'Set the basic information for this group')}
          >
            {/* Task Group Name */}
            <div className="bento-card animate-scale-in">
              <div className="mb-4">
                <label htmlFor="taskgroup-name" className="block text-lg font-semibold font-chinese text-gray-900 dark:text-slate-100 mb-2">
                  {tr('任务群名称', 'Group name')}
                </label>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 font-chinese">
                  {tr('为您的任务群起一个清晰易懂的名称', 'Give your group a clear and recognizable name')}
                </p>
              </div>
              <input
                type="text"
                id="taskgroup-name"
                name="taskGroupName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  // Clear name error when user starts typing
                  if (errors.name && e.target.value.trim()) {
                    setErrors(prev => ({ ...prev, name: undefined }));
                  }
                }}
                placeholder={tr('例如：期末复习计划、网站开发项目、健身训练计划', 'e.g. Finals study plan, Website project, Workout plan')}
                className={`w-full bg-gray-50 dark:bg-slate-700 border ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 dark:border-slate-600 focus:border-primary-500 focus:ring-primary-500/20'} rounded-2xl px-6 py-4 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-300 font-chinese`}
                required
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 font-chinese">{errors.name}</p>
              )}
            </div>

            {/* Task Group Description */}
            <div className="bento-card animate-scale-in">
              <div className="mb-4">
                <label htmlFor="taskgroup-description" className="block text-lg font-semibold font-chinese text-gray-900 dark:text-slate-100 mb-2">
                  {tr('任务群描述', 'Group description')}
                </label>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 font-chinese">
                  {tr('详细描述这个任务群的目标和范围', 'Describe the goal and scope of this group')}
                </p>
              </div>
              <textarea
                id="taskgroup-description"
                name="taskGroupDescription"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  // Clear description error when user starts typing
                  if (errors.description && e.target.value.trim()) {
                    setErrors(prev => ({ ...prev, description: undefined }));
                  }
                }}
                placeholder={tr(
                  '描述这个任务群的目标和范围，例如：期末复习计划，包含各科目的复习、练习题和模拟考试等',
                  'Describe the goal and scope, e.g. Finals study plan with review, practice problems, and mock exams.'
                )}
                rows={4}
                className={`w-full bg-gray-50 dark:bg-slate-700 border ${errors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 dark:border-slate-600 focus:border-primary-500 focus:ring-primary-500/20'} rounded-2xl px-6 py-4 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-300 resize-none font-chinese leading-relaxed`}
                required
              />
              {errors.description && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 font-chinese">{errors.description}</p>
              )}
            </div>
          </SettingSection>

          {/* 辅助链设置区 */}
          <SettingSection
            title={tr('预约功能设置', 'Booking settings')}
            icon={<Calendar className="text-blue-500" size={20} />}
            description={tr('配置预约信号、时长和完成条件', 'Configure booking signal, duration, and completion condition')}
          >
            {/* 预约信号 */}
            <div className="bento-card border-l-4 border-l-blue-500 animate-scale-in">
              <div className="flex items-center space-x-3 mb-4">
                <Bell className="text-blue-500" size={20} />
                <div>
                  <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">{tr('预约信号', 'Booking signal')}</h4>
                  <p className="text-xs font-mono text-gray-500">{tr('预约信号', 'BOOKING SIGNAL')}</p>
                </div>
              </div>
              <select
                id="auxiliary-signal"
                name="auxiliarySignal"
                value={auxiliarySignal}
                onChange={(e) => handleAuxiliarySignalSelect(e.target.value)}
                className={`w-full bg-gray-50 dark:bg-slate-700 border ${errors.auxiliarySignal ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20'} rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all duration-300 mb-4 font-chinese`}
                required
              >
                <option value="" disabled className="text-gray-400">
                  {tr('选择预约信号', 'Choose a booking signal')}
                </option>
                {AUXILIARY_SIGNAL_TEMPLATES.map((template, index) => (
                  <option key={index} value={template.value} className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
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
                  onChange={(e) => {
                    setCustomAuxiliarySignal(e.target.value);
                    if (errors.auxiliarySignal && e.target.value.trim()) {
                      setErrors(prev => ({ ...prev, auxiliarySignal: undefined }));
                    }
                  }}
                  placeholder={tr('输入你的自定义预约信号', 'Enter your custom booking signal')}
                  className={`w-full bg-gray-50 dark:bg-slate-700 border ${errors.auxiliarySignal ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20'} rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-300 font-chinese`}
                  required
                />
              )}
              {errors.auxiliarySignal && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 font-chinese">{errors.auxiliarySignal}</p>
              )}
            </div>

            {/* 预约时长 */}
            <div className="bento-card border-l-4 border-l-blue-500 animate-scale-in">
              <div className="flex items-center space-x-3 mb-4">
                <Hourglass className="text-blue-500" size={20} />
                <div>
                  <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">{tr('预约时长', 'Booking duration')}</h4>
                  <p className="text-xs font-mono text-gray-500">{tr('预约时长', 'BOOKING DURATION')}</p>
                </div>
              </div>
              <select
                id="auxiliary-duration"
                name="auxiliaryDuration"
                value={isCustomAuxiliaryDuration ? "custom" : auxiliaryDuration}
                onChange={(e) => {
                  if (e.target.value === "custom") {
                    setIsCustomAuxiliaryDuration(true);
                    setAuxiliaryDuration(25);
                  } else {
                    setIsCustomAuxiliaryDuration(false);
                    setAuxiliaryDuration(Number(e.target.value));
                  }
                }}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 mb-4 font-chinese"
                required
              >
                {AUXILIARY_DURATION_PRESETS.map((preset) => (
                  <option key={preset} value={preset} className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
                    {tr(`${preset}分钟`, `${preset} min`)}
                  </option>
                ))}
                <option value="custom" className="text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700">
                  {tr('自定义时长', 'Custom duration')}
                </option>
              </select>
              {isCustomAuxiliaryDuration && (
                <SliderContainer
                  label={tr('自定义预约时长', 'Custom booking duration')}
                  description={tr('设置预约阶段的持续时间', 'Set how long the booking phase lasts')}
                  orientation="vertical"
                  showKeyboardInput={true}
                  keyboardInputProps={{
                    value: auxiliaryDuration,
                    onChange: setAuxiliaryDuration,
                    min: 1,
                    max: 120,
                    unit: tr('分钟', 'min'),
                    placeholder: tr('输入时长', 'Enter duration'),
                  }}
                >
                  <PureDOMSlider
                    id="auxiliary-duration-slider"
                    name="auxiliaryDurationSlider"
                    min={1}
                    max={120}
                    initialValue={auxiliaryDuration}
                    onValueChange={setAuxiliaryDuration}
                    valueFormatter={(v) => tr(`${v}分钟`, `${v} min`)}
                    debounceMs={50}
                    showValue={true}
                  />
                </SliderContainer>
              )}
              <p className="text-gray-500 text-xs leading-relaxed">
                {tr('预约阶段的持续时间，用于准备和调整状态', 'How long the booking phase lasts for preparation and alignment')}
              </p>
            </div>

            {/* 预约完成条件 */}
            <div className="bento-card border-l-4 border-l-blue-500 animate-scale-in">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="text-blue-500" size={20} />
                <div>
                  <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">{tr('预约完成条件', 'Completion condition')}</h4>
                  <p className="text-xs font-mono text-gray-500">{tr('完成条件', 'COMPLETION CONDITION')}</p>
                </div>
              </div>
              <input
                type="text"
                id="auxiliary-completion-trigger"
                name="auxiliaryCompletionTrigger"
                value={getTriggerLabel(auxiliaryCompletionTrigger, language)}
                onChange={(e) => {
                  setAuxiliaryCompletionTrigger(e.target.value);
                  if (errors.auxiliaryCompletionTrigger && e.target.value.trim()) {
                    setErrors(prev => ({ ...prev, auxiliaryCompletionTrigger: undefined }));
                  }
                }}
                placeholder={tr('例如：打开第一个子任务、准备好工作材料', 'e.g. Open the first subtask, prepare your materials')}
                className={`w-full bg-gray-50 dark:bg-slate-700 border ${errors.auxiliaryCompletionTrigger ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20'} rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-300 font-chinese`}
                required
              />
              {errors.auxiliaryCompletionTrigger && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 font-chinese">{errors.auxiliaryCompletionTrigger}</p>
              )}
              <p className="text-gray-500 text-xs mt-3 leading-relaxed">
                {tr('这是你在预约时间内必须完成的动作，标志着正式开始执行任务群', 'This is the action you must complete during booking—signaling the start of the group execution.')}
              </p>
            </div>
          </SettingSection>

          {/* 操作按钮区 */}
          <div className={`action-buttons flex ${mobileInfo.isMobile ? 'flex-col space-y-4' : 'flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6'} animate-scale-in pt-4`}>
            <button
              type="button"
              onClick={onCancel}
              className={`mobile-touch-target flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 ${mobileInfo.touchSupport ? 'active:scale-98' : 'hover:scale-105'} font-chinese ${mobileInfo.isMobile ? 'min-h-[48px] text-base' : ''}`}
            >
              <span>{tr('取消', 'Cancel')}</span>
            </button>
            <button
              type="submit"
              className={`mobile-touch-target flex-1 gradient-primary hover:shadow-xl text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center space-x-3 ${mobileInfo.touchSupport ? 'active:scale-98' : 'hover:scale-105'} shadow-lg font-chinese ${mobileInfo.isMobile ? 'min-h-[48px] text-base' : ''}`}
            >
              <Save size={20} />
              <span>{isEditing ? tr('保存更改', 'Save changes') : tr('创建任务群', 'Create group')}</span>
            </button>
          </div>
        </form>
      </ResponsiveContainer>
    </div>
  );
};
