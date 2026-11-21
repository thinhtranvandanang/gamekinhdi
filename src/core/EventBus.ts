import { GhostState, RoomId, ScriptedEventId } from '../types';

// EventBus dùng chung để tách biệt gameplay GĐ2, kinh dị GĐ3 và kết thúc GĐ4

export interface GameEvents {
  wrong_pin: { target: 'study_drawer' | 'main_door'; tensionDelta: number };
  door_toggled: { doorId: string; isOpen: boolean; roomA: RoomId; roomB: RoomId };
  power_restored: Record<string, never>;
  item_collected: { itemId: string; isQuest: boolean };
  document_read: { docId: string };
  relic_placed: { relicId: string; totalPlaced: number };
  quest_updated: Record<string, never>;
  game_escaped: Record<string, never>;
  ghost_state_changed: { from: GhostState; to: GhostState };
  scripted_event: { id: ScriptedEventId };
  ghost_stunned: { durationSec: number };
  player_caught: { count: number; maxCount: number };
  game_caught_fatal: Record<string, never>;
  hide_state_changed: { isHiding: boolean; spotId: string | null };
  toast: { message: string };
}

type EventKey = keyof GameEvents;
type Handler<K extends EventKey> = (payload: GameEvents[K]) => void;

export class EventBus {
  private listeners = new Map<EventKey, Set<Handler<never>>>();

  public on<K extends EventKey>(event: K, handler: Handler<K>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => {
      set?.delete(handler as Handler<never>);
    };
  }

  public emit<K extends EventKey>(event: K, payload: GameEvents[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((fn) => {
      (fn as Handler<K>)(payload);
    });
  }

  public clear(): void {
    this.listeners.clear();
  }
}
