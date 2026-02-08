export type Theme = 'light' | 'dark';
export type Language = 'en' | 'zh';

export interface CanvasState {
  scale: number;
  positionX: number;
  positionY: number;
}

export interface AutoResumeData {
  chainId: string;
  startedAt: string;
  resumeAt: string;
}

export interface TimerPersistData {
  sessionId: string;
  startTime: number;
  pausedTime: number;
  totalPausedDuration: number;
  isPaused: boolean;
  timestamp: number;
}
