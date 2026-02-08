import { beforeEach, describe, expect, it } from 'vitest';
import { LOCAL_STORAGE_KEYS } from '../keys';
import {
  clearCanvasState,
  getCanvasState,
  setCanvasState,
} from '../canvasState';

describe('local-preferences/canvasState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no state exists', () => {
    expect(getCanvasState()).toBeNull();
  });

  it('returns null when state shape is invalid or JSON is malformed', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.RSIP_CANVAS_STATE,
      JSON.stringify({ scale: 1 }),
    );
    expect(getCanvasState()).toBeNull();

    localStorage.setItem(LOCAL_STORAGE_KEYS.RSIP_CANVAS_STATE, '{bad-json');
    expect(getCanvasState()).toBeNull();
  });

  it('persists and reads valid canvas state', () => {
    const state = { scale: 1.5, positionX: 100, positionY: -50 };
    setCanvasState(state);
    expect(getCanvasState()).toEqual(state);
  });

  it('clears persisted canvas state', () => {
    setCanvasState({ scale: 1, positionX: 0, positionY: 0 });
    clearCanvasState();
    expect(
      localStorage.getItem(LOCAL_STORAGE_KEYS.RSIP_CANVAS_STATE),
    ).toBeNull();
  });
});
