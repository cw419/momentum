import { useState, useCallback, useRef, useEffect } from 'react';
import { Minimize2, Cookie } from 'lucide-react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [dismissedCreationDialog, setDismissedCreationDialog] = useState(false);
  const [isFeeding, setIsFeeding] = useState(false);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragRafIdRef = useRef<number | null>(null);
  const pendingDragPositionRef = useRef<{ x: number; y: number } | null>(null);
  // Track if actual dragging occurred (mouse moved significantly)
  const hasDraggedRef = useRef(false);

  // Show creation dialog if no pet exists
  useEffect(() => {
    if (!isLoading && !hasPet && !dismissedCreationDialog) {
      // Small delay for smoother UX
      const timer = setTimeout(() => setShowCreationDialog(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, hasPet, dismissedCreationDialog]);

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
      if (e.button !== 0) return;
      e.preventDefault();
      setIsDragging(true);
      hasDraggedRef.current = false; // Reset drag flag
      const currentPos = pet.isMinimized ? pet.minimizedPosition : pet.position;
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialX: currentPos.x,
        initialY: currentPos.y,
      };
    },
    [pet]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragRef.current || !widgetRef.current) return;

      const deltaX = ((e.clientX - dragRef.current.startX) / window.innerWidth) * 100;
      const deltaY = ((e.clientY - dragRef.current.startY) / window.innerHeight) * 100;

      // Mark as dragged if moved more than 5 pixels
      const pixelDeltaX = Math.abs(e.clientX - dragRef.current.startX);
      const pixelDeltaY = Math.abs(e.clientY - dragRef.current.startY);
      if (pixelDeltaX > 5 || pixelDeltaY > 5) {
        hasDraggedRef.current = true;
      }

      const newX = Math.max(0, Math.min(95, dragRef.current.initialX + deltaX));
      const newY = Math.max(2, Math.min(90, dragRef.current.initialY + deltaY));

      pendingDragPositionRef.current = { x: newX, y: newY };

      // Throttle DOM writes to animation frames for smoother dragging (especially on high polling-rate mice)
      if (dragRafIdRef.current !== null) return;
      dragRafIdRef.current = window.requestAnimationFrame(() => {
        dragRafIdRef.current = null;
        if (!widgetRef.current || !pendingDragPositionRef.current) return;
        widgetRef.current.style.left = `${pendingDragPositionRef.current.x}%`;
        widgetRef.current.style.top = `${pendingDragPositionRef.current.y}%`;
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(async () => {
    if (!isDragging || !widgetRef.current || !pet) return;
    setIsDragging(false);

    // Flush latest pending position so saved coordinates match the final visual position.
    if (pendingDragPositionRef.current) {
      widgetRef.current.style.left = `${pendingDragPositionRef.current.x}%`;
      widgetRef.current.style.top = `${pendingDragPositionRef.current.y}%`;
    }
    pendingDragPositionRef.current = null;
    if (dragRafIdRef.current !== null) {
      cancelAnimationFrame(dragRafIdRef.current);
      dragRafIdRef.current = null;
    }

    const rect = widgetRef.current.getBoundingClientRect();
    const newX = (rect.left / window.innerWidth) * 100;
    const newY = (rect.top / window.innerHeight) * 100;

    // Save to appropriate position based on minimized state
    if (pet.isMinimized) {
      await onUpdateMinimizedPosition(newX, newY);
    } else {
      await onUpdatePosition(newX, newY);
    }
    dragRef.current = null;
  }, [isDragging, pet, onUpdatePosition, onUpdateMinimizedPosition]);

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

  // Don't render if loading
  if (isLoading) return null;

  // Get current position based on minimized state
  const currentPosition = pet?.isMinimized ? pet.minimizedPosition : pet?.position;

  return (
    <>
      {/* No-pet Launcher (after "Maybe later") */}
      {!hasPet && dismissedCreationDialog && !showCreationDialog && (
        <button
          type="button"
          onClick={() => setShowCreationDialog(true)}
          className="fixed z-40 right-4 bottom-4 flex items-center gap-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 shadow-lg shadow-black/5 px-3 py-2 hover:shadow-xl hover:-translate-y-0.5 transition-all"
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
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {tr('给新伙伴起个名字', 'Name your new companion')}
            </div>
          </div>
        </button>
      )}

      {/* Main Widget - shows in both minimized and expanded states */}
      {pet && currentPosition && (
        <div
          ref={widgetRef}
          className={`
            fixed z-40 select-none
            ${isDragging ? 'transition-none' : 'transition-all duration-200'}
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
            /* Minimized View - Just Avatar, draggable, click to expand */
            <div
              className="cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
            >
              <button
                type="button"
                onClick={e => {
                  // Only expand if no drag occurred (click without movement)
                  if (!hasDraggedRef.current) {
                    e.stopPropagation();
                    void onExpand();
                  }
                }}
                className="p-2 rounded-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:scale-105 transition-all"
                title={tr('展开宠物', 'Expand pet')}
                aria-label={tr('展开宠物', 'Expand pet')}
              >
                <PetAvatar stage={pet.stage} mood={mood} size="sm" />
              </button>
            </div>
          ) : (
            /* Expanded View */
            <div
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
            >
              {/* Header - Draggable */}
              <div
                className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 px-3 py-2 cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-24">
                  {pet.name}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      void onMinimize();
                    }}
                    className="p-1 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-colors"
                    title={tr('最小化', 'Minimize')}
                    aria-label={tr('最小化', 'Minimize')}
                  >
                    <Minimize2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-3">
                {/* Avatar */}
                <div className="flex justify-center mb-2">
                  <PetAvatar stage={pet.stage} mood={mood} size="md" onClick={handleFeed} />
                </div>

                {/* Feed Button */}
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
                    transition-all text-sm font-medium
                    ${isFeeding ? 'animate-pulse' : ''}
                  `}
                >
                  <Cookie size={16} aria-hidden="true" />
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
            </div>
          )}
        </div>
      )}

      {/* Creation Dialog */}
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

// Export a connected version that uses the domain hook
export { PetWidget as PetWidgetView };
