import { useEffect, useState } from 'react';
import type React from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle,
  Clock,
} from 'lucide-react';
import type { Chain } from '../types';
import { useI18n } from '../i18n';
import {
  getAuxiliarySignalLabel,
  getTriggerLabel,
} from './chain-editor/constants';
import { AuxiliaryJudgmentActions } from './auxiliary-judgment/AuxiliaryJudgmentActions';
import { AuxiliaryRuleChoice } from './auxiliary-judgment/AuxiliaryRuleChoice';

interface AuxiliaryJudgmentProps {
  chain: Chain;
  onJudgmentFailure: (reason: string) => void;
  onJudgmentAllow: (exceptionRule: string) => void;
  onCancel: () => void;
}

export const AuxiliaryJudgment: React.FC<AuxiliaryJudgmentProps> = ({
  chain,
  onJudgmentFailure,
  onJudgmentAllow,
  onCancel,
}) => {
  const { language, tr } = useI18n();
  const [reason, setReason] = useState('');
  const [selectedExistingRule, setSelectedExistingRule] = useState('');
  const [useExistingRule, setUseExistingRule] = useState(false);

  useEffect(() => {
    if (chain.auxiliaryExceptions?.length) {
      setSelectedExistingRule(chain.auxiliaryExceptions[0]);
    }
  }, [chain.auxiliaryExceptions]);

  const handleRuleTypeChange = (useExisting: boolean) => {
    setUseExistingRule(useExisting);
    if (useExisting) {
      setReason('');
      setSelectedExistingRule(chain.auxiliaryExceptions?.[0] ?? '');
    } else {
      setSelectedExistingRule('');
    }
  };
  const handleAllow = () => {
    const rule = useExistingRule ? selectedExistingRule : reason.trim();
    if (rule) onJudgmentAllow(rule);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl animate-scale-in overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
        <div className="mb-8 text-center">
          <div className="mb-6 flex items-center justify-center space-x-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500/10">
              <Calendar size={32} className="text-blue-500" />
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-yellow-500/10">
              <AlertTriangle size={32} className="text-yellow-500" />
            </div>
          </div>
          <div className="mb-6">
            <h2 className="mb-2 font-chinese text-3xl font-bold text-gray-900 dark:text-slate-100">
              {tr('辅助链规则判定', 'Booking rule adjudication')}
            </h2>
            <p className="font-mono text-sm tracking-wider text-gray-500">
              {tr('辅助链规则判定', 'BOOKING RULE ADJUDICATION')}
            </p>
          </div>
          <p className="mb-6 font-chinese leading-relaxed text-gray-600 dark:text-slate-300">
            {tr(
              '你似乎做出了与预约承诺不符的行为。请描述具体情况并选择处理方式：',
              'It looks like your behavior didn’t match the booking commitment. Please describe what happened and choose how to handle it:',
            )}
          </p>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-700/50 dark:bg-blue-900/20">
            <div className="grid grid-cols-1 gap-4 text-blue-700 dark:text-blue-300 md:grid-cols-3">
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center space-x-2">
                  <Bell className="text-blue-500" size={16} />
                  <span className="font-chinese font-medium">
                    {tr('预约信号', 'Signal')}
                  </span>
                </div>
                <p className="font-mono text-sm">
                  {getAuxiliarySignalLabel(chain.auxiliarySignal, language)}
                </p>
              </div>
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center space-x-2">
                  <CheckCircle className="text-blue-500" size={16} />
                  <span className="font-chinese font-medium">
                    {tr('完成条件', 'Completion')}
                  </span>
                </div>
                <p className="font-chinese text-sm">
                  {getTriggerLabel(chain.auxiliaryCompletionTrigger, language)}
                </p>
              </div>
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center space-x-2">
                  <Clock className="text-blue-500" size={16} />
                  <span className="font-chinese font-medium">
                    {tr('预约时长', 'Duration')}
                  </span>
                </div>
                <p className="font-mono text-sm">
                  {tr(
                    `${chain.auxiliaryDuration}分钟`,
                    `${chain.auxiliaryDuration} min`,
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
        <AuxiliaryRuleChoice
          chain={chain}
          useExistingRule={useExistingRule}
          onRuleTypeChange={handleRuleTypeChange}
          selectedExistingRule={selectedExistingRule}
          onSelectedExistingRuleChange={setSelectedExistingRule}
          reason={reason}
          onReasonChange={setReason}
          tr={tr}
        />
        <AuxiliaryJudgmentActions
          chain={chain}
          language={language}
          reason={reason}
          useExistingRule={useExistingRule}
          selectedExistingRule={selectedExistingRule}
          onFailure={() =>
            onJudgmentFailure(
              reason || tr('用户主动中断预约', 'User interrupted booking'),
            )
          }
          onAllow={handleAllow}
          onCancel={onCancel}
          tr={tr}
        />
      </div>
    </div>
  );
};
