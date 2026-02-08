/**
 * Sound Manager for playing notification sounds
 */

import { logger } from './logger';

class SoundManager {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize AudioContext on user interaction if possible,
    // but we can try to create it here.
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      logger.warn('SOUND', 'Failed to initialize AudioContext', undefined, err);
    }
  }

  /**
   * Play a simple beep sound
   * @param frequency Frequency in Hz (default: 440)
   * @param duration Duration in seconds (default: 0.5)
   * @param type Oscillator type (default: 'sine')
   */
  public playBeep(
    frequency: number = 880,
    duration: number = 0.5,
    type: OscillatorType = 'sine',
  ) {
    if (!this.audioContext) return;

    // Resume context if suspended (browser policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(
      frequency,
      this.audioContext.currentTime,
    );

    // Envelope to avoid clicking
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      0.5,
      this.audioContext.currentTime + 0.05,
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration,
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  /**
   * Play a "Timer Finished" sound (Double beep)
   */
  public playTimerFinished() {
    this.playBeep(880, 0.2);
    setTimeout(() => {
      this.playBeep(880, 0.4);
    }, 250);
  }
}

export const soundManager = new SoundManager();
