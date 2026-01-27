import type { PetStage } from '../../types/pet';
import { getLevelProgress, getXpForLevel, getStageName } from '../../utils/petLogic';
import { useI18n } from '../../i18n';

interface PetStatsBarProps {
  hunger: number;
  happiness: number;
  health: number;
  level: number;
  experience: number;
  stage: PetStage;
}

interface StatBarProps {
  label: string;
  value: number;
  maxValue?: number;
  colorClass: string;
  icon: string;
  inverted?: boolean; // For hunger, lower is better
}

function StatBar({ label, value, maxValue = 100, colorClass, icon, inverted }: StatBarProps) {
  const displayValue = inverted ? maxValue - value : value;
  const percentage = (displayValue / maxValue) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm" title={label}>
        {icon}
      </span>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-[width] duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
        {Math.round(displayValue)}
      </span>
    </div>
  );
}

export function PetStatsBar({ hunger, happiness, health, level, experience, stage }: PetStatsBarProps) {
  const { language } = useI18n();
  const levelProgress = getLevelProgress({ level, experience });
  const xpRequired = getXpForLevel(level);
  const stageName = getStageName(stage, language);

  return (
    <div className="space-y-2 mt-3">
      {/* Level and Stage */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Lv.{level} {stageName}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {experience}/{xpRequired} XP
        </span>
      </div>

      {/* XP Progress */}
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-[width] duration-300"
          style={{ width: `${levelProgress}%` }}
        />
      </div>

      {/* Stats */}
      <div className="space-y-1.5 pt-1">
        <StatBar
          label="Fullness"
          value={hunger}
          colorClass="bg-gradient-to-r from-amber-400 to-orange-500"
          icon="🍖"
          inverted={true}
        />
        <StatBar
          label="Happiness"
          value={happiness}
          colorClass="bg-gradient-to-r from-pink-400 to-rose-500"
          icon="💖"
        />
        <StatBar
          label="Health"
          value={health}
          colorClass="bg-gradient-to-r from-green-400 to-emerald-500"
          icon="💚"
        />
      </div>
    </div>
  );
}
