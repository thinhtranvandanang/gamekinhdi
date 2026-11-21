import { GameState } from '../types';

// Máy trạng thái điều phối màn hình và luồng chơi

export type StateChangeListener = (next: GameState, prev: GameState) => void;

export class StateMachine {
  private current: GameState;
  private listeners = new Set<StateChangeListener>();

  constructor(initial: GameState) {
    this.current = initial;
  }

  public getState(): GameState {
    return this.current;
  }

  public isPlaying(): boolean {
    return this.current === GameState.Playing;
  }

  public transition(next: GameState): void {
    if (next === this.current) return;
    const prev = this.current;
    this.current = next;
    this.listeners.forEach((fn) => fn(next, prev));
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
