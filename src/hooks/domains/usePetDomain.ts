import { useCallback, useEffect, useState, useRef } from 'react';
import type { PetState, PetMood, TaskCompletionReward, FeedResult } from '../../types/pet';
import { useStorage } from '../../storage/StorageContext';
import { logger } from '../../utils/logger';
import {
  DEFAULT_PET_CONFIG,
  calculateDecay,
  calculateTaskReward,
  calculateMood,
  createNewPet,
  getXpForLevel,
} from '../../utils/petLogic';

interface UsePetDomainReturn {
  pet: PetState | null;
  mood: PetMood;
  isLoading: boolean;
  hasPet: boolean;

  // Actions
  createPet: (name: string) => Promise<PetState>;
  feedPet: () => Promise<FeedResult | null>;
  onTaskCompleted: (duration: number, wasSuccessful: boolean) => Promise<TaskCompletionReward | null>;
  updatePosition: (x: number, y: number) => Promise<void>;
  toggleVisibility: () => Promise<void>;
  showPet: () => Promise<void>;
}

const DECAY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function usePetDomain(): UsePetDomainReturn {
  const storage = useStorage();
  const [pet, setPet] = useState<PetState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mood, setMood] = useState<PetMood>('neutral');
  const decayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load pet state on mount
  const loadPet = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedPet = await storage.getPetState();
      if (savedPet) {
        // Apply decay since last session
        const decayedState = calculateDecay(savedPet, new Date());
        const updatedPet = { ...savedPet, ...decayedState };
        setPet(updatedPet);
        setMood(calculateMood(updatedPet));
        await storage.savePetState(updatedPet);
      }
    } catch (error) {
      logger.error('PET', 'Failed to load pet state', undefined, error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [storage]);

  // Create new pet
  const createPet = useCallback(
    async (name: string): Promise<PetState> => {
      const newPet = createNewPet(name);
      await storage.savePetState(newPet);
      setPet(newPet);
      setMood(calculateMood(newPet));
      logger.info('PET', 'Created new pet', { name });
      return newPet;
    },
    [storage]
  );

  // Feed the pet (manual action)
  const feedPet = useCallback(async (): Promise<FeedResult | null> => {
    if (!pet) return null;

    const hungerReduced = Math.min(pet.hunger, DEFAULT_PET_CONFIG.feedingHungerReduction);
    const newHunger = pet.hunger - hungerReduced;
    const happinessGained = Math.min(5, hungerReduced / 6);

    const updatedPet: PetState = {
      ...pet,
      hunger: Math.round((newHunger) * 10) / 10,
      happiness: Math.min(100, Math.round((pet.happiness + happinessGained) * 10) / 10),
      lastFedAt: new Date(),
      lastInteractedAt: new Date(),
    };

    await storage.savePetState(updatedPet);
    setPet(updatedPet);
    setMood(calculateMood(updatedPet));
    logger.info('PET', 'Fed pet', { hungerReduced, newHunger });

    return { hungerReduced, newHunger, happinessGained };
  }, [pet, storage]);

  // Handle task completion (called from SessionsDomain)
  const onTaskCompleted = useCallback(
    async (taskDuration: number, wasSuccessful: boolean): Promise<TaskCompletionReward | null> => {
      if (!pet) return null;

      const reward = calculateTaskReward(pet, taskDuration, wasSuccessful);

      // Calculate new experience (handle level up)
      let newExperience = pet.experience + reward.xpGained;
      if (reward.leveledUp) {
        newExperience = newExperience - getXpForLevel(pet.level);
      }

      const updatedPet: PetState = {
        ...pet,
        hunger: Math.max(0, Math.round((pet.hunger - reward.hungerReduced) * 10) / 10),
        happiness: Math.min(100, Math.max(0, Math.round((pet.happiness + reward.happinessGained) * 10) / 10)),
        experience: newExperience,
        level: reward.newLevel ?? pet.level,
        stage: reward.newStage ?? pet.stage,
        lastInteractedAt: new Date(),
      };

      await storage.savePetState(updatedPet);
      setPet(updatedPet);
      setMood(calculateMood(updatedPet));

      logger.info('PET', 'Task completed reward', {
        xpGained: reward.xpGained,
        leveledUp: reward.leveledUp,
        evolved: reward.evolved,
      });

      return reward;
    },
    [pet, storage]
  );

  // Update pet position (for dragging)
  const updatePosition = useCallback(
    async (x: number, y: number) => {
      if (!pet) return;

      const updatedPet = { ...pet, position: { x, y } };
      await storage.savePetState(updatedPet);
      setPet(updatedPet);
    },
    [pet, storage]
  );

  // Toggle visibility
  const toggleVisibility = useCallback(async () => {
    if (!pet) return;

    const updatedPet = { ...pet, isVisible: !pet.isVisible };
    await storage.savePetState(updatedPet);
    setPet(updatedPet);
  }, [pet, storage]);

  // Show pet (make visible)
  const showPet = useCallback(async () => {
    if (!pet || pet.isVisible) return;

    const updatedPet = { ...pet, isVisible: true };
    await storage.savePetState(updatedPet);
    setPet(updatedPet);
  }, [pet, storage]);

  // Setup decay interval
  useEffect(() => {
    if (!pet) return;

    const runDecay = async () => {
      const decayedState = calculateDecay(pet, new Date());

      // Only update if there's actual change
      if (
        decayedState.hunger !== pet.hunger ||
        decayedState.happiness !== pet.happiness ||
        decayedState.health !== pet.health
      ) {
        const updatedPet = { ...pet, ...decayedState };
        await storage.savePetState(updatedPet);
        setPet(updatedPet);
        setMood(calculateMood(updatedPet));

        // Log warnings
        if (updatedPet.hunger > 80 && pet.hunger <= 80) {
          logger.warn('PET', 'Pet is starving!', { hunger: updatedPet.hunger });
        }
        if (updatedPet.health < 30 && pet.health >= 30) {
          logger.warn('PET', 'Pet health is low!', { health: updatedPet.health });
        }
      }
    };

    decayIntervalRef.current = setInterval(runDecay, DECAY_INTERVAL_MS);

    return () => {
      if (decayIntervalRef.current) {
        clearInterval(decayIntervalRef.current);
      }
    };
  }, [pet, storage]);

  // Load on mount
  useEffect(() => {
    loadPet();
  }, [loadPet]);

  return {
    pet,
    mood,
    isLoading,
    hasPet: !!pet,

    // Actions
    createPet,
    feedPet,
    onTaskCompleted,
    updatePosition,
    toggleVisibility,
    showPet,
  };
}
