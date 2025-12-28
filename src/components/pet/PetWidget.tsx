import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Minimize2, Maximize2, Cookie } from 'lucide-react';
import type { PetState, PetMood, FeedResult } from '../../types/pet';
import { PetAvatar } from './PetAvatar';
import { PetStatsBar } from './PetStatsBar';
import { PetCreationDialog } from './PetCreationDialog';
import { useI18n } from '../../i18n';
import { toast } from '../../utils/toast';

interface PetWidgetProps {
  pet: PetState | null;
  mood: PetMood;
  isLoading: boolean;
  hasPet: boolean;
  onCreatePet: (name: string) => Promise<PetState>;
  onFeedPet: () => Promise<FeedResult | null>;
  onUpdatePosition: (x: number, y: number) => Promise<void>;
  onToggleVisibility: () => Promise<void>;
}

export function PetWidget({
  pet,
  mood,
  isLoading,
  hasPet,
  onCreatePet,
  onFeedPet,
  onUpdatePosition,
  onToggleVisibility,
}: PetWidgetProps) {
  const { tr } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [isFeeding, setIsFeeding] = useState(false);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Show creation dialog if no pet exists
  useEffect(() => {
    if (!isLoading && !hasPet) {
      // Small delay for smoother UX
      const timer = setTimeout(() => setShowCreationDialog(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, hasPet]);

  // Handle feeding
  const handleFeed = useCallback(async () => {
    if (isFeeding || !pet) return;

    setIsFeeding(true);
    try {
      const result = await onFeedPet();
      if (result && result.hungerReduced > 0) {
        toast.success(tr(`喂食成功！饱食度+${Math.round(result.hungerReduced)}`, `Fed! Fullness +${Math.round(result.hungerReduced)}`));
      } else if (result && result.hungerReduced === 0) {
        toast.info(tr('宠物已经吃饱了~', 'Pet is already full~'));
      }
    } finally {
      setIsFeeding(false);
    }
  }, [isFeeding, pet, onFeedPet, tr]);

  // Dragging handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!pet) return;
      e.preventDefault();
      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialX: pet.position.x,
        initialY: pet.position.y,
      };
    },
    [pet]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragRef.current || !widgetRef.current) return;

      const deltaX = ((e.clientX - dragRef.current.startX) / window.innerWidth) * 100;
      const deltaY = ((e.clientY - dragRef.current.startY) / window.innerHeight) * 100;

      const newX = Math.max(0, Math.min(85, dragRef.current.initialX + deltaX));
      const newY = Math.max(5, Math.min(85, dragRef.current.initialY + deltaY));

      widgetRef.current.style.left = `${newX}%`;
      widgetRef.current.style.top = `${newY}%`;
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(async () => {
    if (!isDragging || !widgetRef.current) return;
    setIsDragging(false);

    const rect = widgetRef.current.getBoundingClientRect();
    const newX = (rect.left / window.innerWidth) * 100;
    const newY = (rect.top / window.innerHeight) * 100;

    await onUpdatePosition(newX, newY);
  }, [isDragging, onUpdatePosition]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle pet creation
  const handleCreatePet = useCallback(
    async (name: string) => {
      await onCreatePet(name);
      setShowCreationDialog(false);
      toast.success(tr(`欢迎 ${name} 加入！`, `Welcome ${name}!`) + ' 🎉');
    },
    [onCreatePet, tr]
  );

  // Don't render if loading or pet is hidden
  if (isLoading) return null;
  if (pet && !pet.isVisible) return null;

  return (
    <>
      {/* Main Widget */}
      {pet && (
        <div
          ref={widgetRef}
          className={`
            fixed z-40 transition-all duration-200
            ${isMinimized ? 'w-16' : 'w-52'}
            ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-default'}
          `}
          style={{
            left: `${pet.position.x}%`,
            top: `${pet.position.y}%`,
          }}
        >
          {/* Widget Container */}
          <div
            className={`
              bg-white/95 dark:bg-gray-800/95 backdrop-blur-md
              rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50
              overflow-hidden
              ${isMinimized ? 'p-2' : ''}
            `}
          >
            {/* Header - Draggable */}
            <div
              className={`
                flex items-center justify-between
                bg-gradient-to-r from-green-50 to-emerald-50
                dark:from-green-900/20 dark:to-emerald-900/20
                ${isMinimized ? 'p-1' : 'px-3 py-2'}
                cursor-grab active:cursor-grabbing
              `}
              onMouseDown={handleMouseDown}
            >
              {!isMinimized && (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-24">
                  {pet.name}
                </span>
              )}
              <div className={`flex items-center ${isMinimized ? 'gap-0' : 'gap-1'}`}>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setIsMinimized(!isMinimized);
                  }}
                  className="p-1 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-colors"
                  title={isMinimized ? tr('展开', 'Expand') : tr('最小化', 'Minimize')}
                >
                  {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
                {!isMinimized && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onToggleVisibility();
                    }}
                    className="p-1 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-colors"
                    title={tr('隐藏', 'Hide')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            {isMinimized ? (
              /* Minimized View - Just Avatar */
              <div className="p-1 flex justify-center">
                <PetAvatar stage={pet.stage} mood={mood} size="sm" onClick={handleFeed} />
              </div>
            ) : (
              /* Expanded View */
              <div className="p-3">
                {/* Avatar */}
                <div className="flex justify-center mb-2">
                  <PetAvatar stage={pet.stage} mood={mood} size="md" onClick={handleFeed} />
                </div>

                {/* Feed Button */}
                <button
                  onClick={handleFeed}
                  disabled={isFeeding || pet.hunger <= 5}
                  className={`
                    w-full flex items-center justify-center gap-2
                    py-2 px-3 rounded-xl mb-2
                    ${
                      pet.hunger <= 5
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600'
                    }
                    transition-all text-sm font-medium
                    ${isFeeding ? 'animate-pulse' : ''}
                  `}
                >
                  <Cookie size={16} />
                  {isFeeding ? tr('喂食中...', 'Feeding...') : tr('喂食', 'Feed')}
                </button>

                {/* Stats */}
                <PetStatsBar
                  hunger={pet.hunger}
                  happiness={pet.happiness}
                  health={pet.health}
                  level={pet.level}
                  experience={pet.experience}
                  stage={pet.stage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creation Dialog */}
      {showCreationDialog && (
        <PetCreationDialog
          onSubmit={handleCreatePet}
          onCancel={() => setShowCreationDialog(false)}
        />
      )}
    </>
  );
}

// Export a connected version that uses the domain hook
export { PetWidget as PetWidgetView };
