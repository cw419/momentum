// Pet Evolution Stages
export type PetStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult' | 'elder';

// Pet Mood States
export type PetMood = 'ecstatic' | 'happy' | 'neutral' | 'sad' | 'depressed';

// Pet State Interface
export interface PetState {
  id: string;
  name: string;

  // Core Stats (0-100 scale)
  hunger: number; // 0 = full, 100 = starving
  happiness: number; // 0 = sad, 100 = ecstatic
  health: number; // 0 = sick, 100 = healthy

  // Growth System
  level: number; // Current level (1-100)
  experience: number; // Current XP towards next level
  stage: PetStage; // Evolution stage

  // Timestamps
  createdAt: Date;
  lastFedAt: Date;
  lastInteractedAt: Date;
  lastDecayCalculatedAt: Date;

  // UI State
  isVisible: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
  minimizedPosition: { x: number; y: number };
}

// Configuration Constants
export interface PetConfig {
  // Decay rates (per hour of inactivity)
  hungerDecayRate: number; // Default: 2 points/hour
  happinessDecayRate: number; // Default: 1 point/hour
  healthDecayRate: number; // Default: 0.5 points/hour (when hunger > 80)

  // XP rewards
  taskCompletionXP: number; // Base XP per task (modified by duration)
  feedingHungerReduction: number; // Hunger reduction per feeding

  // Level thresholds
  xpPerLevel: (level: number) => number; // XP required for level
  stageThresholds: Record<PetStage, number>; // Level thresholds for evolution
}

// Pet Action Results
export interface FeedResult {
  hungerReduced: number;
  newHunger: number;
  happinessGained: number;
}

export interface TaskCompletionReward {
  xpGained: number;
  hungerReduced: number;
  happinessGained: number;
  leveledUp: boolean;
  evolved: boolean;
  newLevel?: number;
  newStage?: PetStage;
}

// Serialized version for storage (dates as strings)
export interface SerializedPetState {
  id: string;
  name: string;
  hunger: number;
  happiness: number;
  health: number;
  level: number;
  experience: number;
  stage: PetStage;
  createdAt: string;
  lastFedAt: string;
  lastInteractedAt: string;
  lastDecayCalculatedAt: string;
  isVisible: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
  minimizedPosition: { x: number; y: number };
}
