import { useI18n } from '../../../i18n';
import type { FeedResult, PetMood, PetState } from '../../../types/pet';
import { Cookie, Minimize2 } from 'lucide-react';
import { PetAvatar } from '../PetAvatar';
import { PetCreationDialog } from '../PetCreationDialog';
import { PetStatsBar } from '../PetStatsBar';
import { usePetWidgetController } from './hooks/usePetWidgetController';

interface PetWidgetProps {
  pet: PetState | null;
  mood: PetMood;
  isLoading: boolean;
  hasPet: boolean;
  onCreatePet: (name: string) => Promise<PetState>;
  onFeedPet: () => Promise<FeedResult | null>;
  onUpdatePosition: (x: number, y: number) => Promise<void>;
  onUpdateMinimizedPosition: (x: number, y: number) => Promise<void>;
  onToggleVisibility: () => Promise<void>;
  onMinimize: () => Promise<void>;
  onExpand: () => Promise<void>;
}

export function PetWidget({
  pet,
  mood,
  isLoading,
  hasPet,
  onCreatePet,
  onFeedPet,
  onUpdatePosition,
  onUpdateMinimizedPosition,
  onMinimize,
  onExpand,
}: PetWidgetProps) {
  const { tr } = useI18n();

  const {
    isDragging,
    showCreationDialog,
    setShowCreationDialog,
    dismissedCreationDialog,
    setDismissedCreationDialog,
    isFeeding,
    widgetRef,
    hasDraggedRef,
    handleFeed,
    handleMouseDown,
    handleCreatePet,
    handleMinimize,
    handleExpand,
  } = usePetWidgetController({
    pet,
    mood,
    isLoading,
    hasPet,
    onCreatePet,
    onFeedPet,
    onUpdatePosition,
    onUpdateMinimizedPosition,
    onMinimize,
    onExpand,
    tr,
  });

  if (isLoading) return null;

  const currentPosition = pet?.isMinimized ? pet.minimizedPosition : pet?.position;

  return (
    <>
      {!hasPet && dismissedCreationDialog && !showCreationDialog && (
        <button
          type="button"
          onClick={() => setShowCreationDialog(true)}
          className="fixed z-40 right-4 bottom-4 flex items-center gap-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 shadow-lg shadow-black/5 px-3 py-2 hover:shadow-xl hover:-translate-y-0.5 transition"
          title={tr('领养宠物', 'Adopt a pet')}
          aria-label={tr('领养宠物', 'Adopt a pet')}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 flex items-center justify-center text-3xl select-none">
            🥚
          </div>
          <div className="text-left leading-tight pr-1">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {tr('领养一只宠物', 'Adopt a pet')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{tr('给新伙伴起个名字', 'Name your new companion')}</div>
          </div>
        </button>
      )}

      {pet && currentPosition && (
        <div
          ref={widgetRef}
          className={`
            fixed z-40 select-none
            ${isDragging ? 'transition-none' : 'transition duration-200'}
            ${pet.isMinimized ? '' : 'w-52'}
            ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-default'}
          `}
          style={{
            left: `${currentPosition.x}%`,
            top: `${currentPosition.y}%`,
            willChange: isDragging ? 'left, top' : undefined,
          }}
        >
          {pet.isMinimized ? (
            <button
              type="button"
              onMouseDown={handleMouseDown}
              onClick={(event) => {
                if (!hasDraggedRef.current) {
                  event.stopPropagation();
                  void handleExpand();
                }
              }}
              className="cursor-grab active:cursor-grabbing p-2 rounded-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:scale-105 transition"
              title={tr('展开宠物', 'Expand pet')}
              aria-label={tr('展开宠物', 'Expand pet')}
            >
              <PetAvatar stage={pet.stage} mood={mood} size="sm" />
            </button>
          ) : (
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 px-3 py-2">
                <button
                  type="button"
                  onMouseDown={handleMouseDown}
                  className="min-w-0 flex-1 text-left cursor-grab active:cursor-grabbing"
                  aria-label={tr('拖拽移动宠物', 'Drag to move pet')}
                  title={tr('拖拽移动', 'Drag to move')}
                >
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-24">
                    {pet.name}
                  </span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleMinimize();
                    }}
                    className="p-1 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-colors"
                    title={tr('最小化', 'Minimize')}
                    aria-label={tr('最小化', 'Minimize')}
                  >
                    <Minimize2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="p-3">
                <div className="flex justify-center mb-2">
                  <PetAvatar stage={pet.stage} mood={mood} size="md" onClick={handleFeed} />
                </div>

                <button
                  type="button"
                  onClick={handleFeed}
                  disabled={isFeeding || pet.hunger <= 5}
                  aria-label={tr('喂食', 'Feed')}
                  className={`
                    w-full flex items-center justify-center gap-2
                    py-2 px-3 rounded-xl mb-2
                    ${
                      pet.hunger <= 5
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600'
                    }
                    transition text-sm font-medium
                    ${isFeeding ? 'animate-pulse' : ''}
                  `}
                >
                  <Cookie size={16} aria-hidden="true" />
                  {isFeeding ? tr('喂食中...', 'Feeding...') : tr('喂食', 'Feed')}
                </button>

                <PetStatsBar
                  hunger={pet.hunger}
                  happiness={pet.happiness}
                  health={pet.health}
                  level={pet.level}
                  experience={pet.experience}
                  stage={pet.stage}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {showCreationDialog && (
        <PetCreationDialog
          onSubmit={handleCreatePet}
          onCancel={() => {
            setShowCreationDialog(false);
            setDismissedCreationDialog(true);
          }}
        />
      )}
    </>
  );
}

