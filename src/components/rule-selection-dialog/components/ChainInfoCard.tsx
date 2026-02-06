import type { SessionContext } from '../../../types';
import type { ActionType } from '../types';
import { getActionBgClass, getActionColorClass } from '../utils';

export function ChainInfoCard({
  actionType,
  sessionContext,
  language,
}: {
  actionType: ActionType;
  sessionContext: SessionContext;
  language: string;
}) {
  const actionBg = getActionBgClass(actionType);
  const actionColor = getActionColorClass(actionType);

  return (
    <div className={`mx-6 mt-4 p-4 rounded-2xl border ${actionBg}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{sessionContext.chainName}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {language === 'zh'
              ? `已进行 ${Math.floor(sessionContext.elapsedTime / 60)} 分钟`
              : `Elapsed ${Math.floor(sessionContext.elapsedTime / 60)} min`}
            {sessionContext.remainingTime && (
              <span>
                {language === 'zh'
                  ? `，剩余 ${Math.floor(sessionContext.remainingTime / 60)} 分钟`
                  : `, ${Math.floor(sessionContext.remainingTime / 60)} min remaining`}
              </span>
            )}
          </p>
        </div>
        <div className={`text-2xl font-mono ${actionColor}`}>
          {Math.floor(sessionContext.elapsedTime / 60)}:
          {(sessionContext.elapsedTime % 60).toString().padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}
