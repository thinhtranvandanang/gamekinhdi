import { DEFAULT_KEY_BINDINGS, DEFAULT_SETTINGS, GAME_CONFIG } from '../config';
import { EndingId, GameSettings, KeyAction, KeyBindings, QualityLevel, RoomId, SaveData } from '../types';

// Quản lý lưu/tải tiến trình, cài đặt và kết thúc đã mở qua LocalStorage (chịu lỗi an toàn)

export interface SaveLoadResult {
  data: SaveData | null;
  error: string | null;
}

const VALID_ROOM_IDS = new Set<RoomId>([
  'bedroom',
  'hallway_1f',
  'small_storage',
  'living_room',
  'kitchen',
  'basement_alcove',
  'stairs_1f_2f',
  'landing_2f',
  'hallway_2f',
  'study_2f',
  'storage_2f',
  'basement_hallway',
  'electrical_room',
  'ritual_room',
]);

const VALID_ENDINGS = new Set<EndingId>([
  EndingId.A,
  EndingId.B,
  EndingId.C,
  EndingId.D,
  EndingId.E,
]);

export class SaveManager {
  public isStorageAvailable(): boolean {
    try {
      const testKey = '__3am_storage_probe__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  public loadSettings(): GameSettings {
    try {
      const raw = localStorage.getItem(GAME_CONFIG.SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_SETTINGS };

      const clamp01 = (v: unknown, fallback: number) =>
        typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
      const sens =
        typeof parsed.mouseSensitivity === 'number' && Number.isFinite(parsed.mouseSensitivity)
          ? Math.max(0.3, Math.min(2.5, parsed.mouseSensitivity))
          : DEFAULT_SETTINGS.mouseSensitivity;
      const quality =
        parsed.quality === QualityLevel.Low ||
        parsed.quality === QualityLevel.Medium ||
        parsed.quality === QualityLevel.High
          ? parsed.quality
          : DEFAULT_SETTINGS.quality;

      const rawBindings =
        parsed.keyBindings && typeof parsed.keyBindings === 'object'
          ? (parsed.keyBindings as Partial<KeyBindings>)
          : {};
      const keyBindings: KeyBindings = { ...DEFAULT_KEY_BINDINGS };
      (Object.keys(DEFAULT_KEY_BINDINGS) as KeyAction[]).forEach((action) => {
        const val = rawBindings[action];
        if (typeof val === 'string' && val.length > 0 && val.length <= 24) {
          keyBindings[action] = val;
        }
      });

      return {
        masterVolume: clamp01(parsed.masterVolume, DEFAULT_SETTINGS.masterVolume),
        musicVolume: clamp01(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume),
        sfxVolume: clamp01(parsed.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
        mouseSensitivity: sens,
        quality,
        reduceFlash:
          typeof parsed.reduceFlash === 'boolean'
            ? parsed.reduceFlash
            : DEFAULT_SETTINGS.reduceFlash,
        showSubtitles:
          typeof parsed.showSubtitles === 'boolean'
            ? parsed.showSubtitles
            : DEFAULT_SETTINGS.showSubtitles,
        keyBindings,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  public saveSettings(settings: GameSettings): boolean {
    try {
      localStorage.setItem(GAME_CONFIG.SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }

  public isWarningAcknowledged(): boolean {
    try {
      return localStorage.getItem(GAME_CONFIG.WARNING_ACK_KEY) === '1';
    } catch {
      return false;
    }
  }

  public acknowledgeWarning(): void {
    try {
      localStorage.setItem(GAME_CONFIG.WARNING_ACK_KEY, '1');
    } catch {
      // Bỏ qua nếu LocalStorage bị chặn
    }
  }

  public hasValidSave(): boolean {
    const res = this.loadGame();
    return res.data !== null;
  }

  public saveGame(data: SaveData): { ok: boolean; error?: string } {
    try {
      const payload = JSON.stringify({ ...data, version: GAME_CONFIG.SAVE_VERSION });
      localStorage.setItem(GAME_CONFIG.SAVE_STORAGE_KEY, payload);
      return { ok: true };
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'QuotaExceededError'
          ? 'Bộ nhớ trình duyệt đã đầy, không thể lưu.'
          : 'Trình duyệt đang chặn lưu trữ cục bộ.';
      return { ok: false, error: msg };
    }
  }

  public loadGame(): SaveLoadResult {
    try {
      const raw = localStorage.getItem(GAME_CONFIG.SAVE_STORAGE_KEY);
      if (!raw) return { data: null, error: null };
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (!parsed || typeof parsed !== 'object' || parsed.version !== GAME_CONFIG.SAVE_VERSION) {
        return { data: null, error: 'Dữ liệu lưu cũ hoặc không đúng phiên bản.' };
      }

      const p = parsed.player;
      if (
        !p ||
        typeof p !== 'object' ||
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        !Number.isFinite(p.z) ||
        !Number.isFinite(p.yaw) ||
        !Number.isFinite(p.pitch) ||
        !Number.isFinite(p.battery)
      ) {
        return { data: null, error: 'Dữ liệu lưu vị trí người chơi bị hỏng.' };
      }

      if (
        !Array.isArray(parsed.inventory) ||
        !Array.isArray(parsed.questItems) ||
        !Array.isArray(parsed.readDocuments) ||
        typeof parsed.gameTimeSeconds !== 'number' ||
        !Number.isFinite(parsed.gameTimeSeconds) ||
        typeof parsed.caughtCount !== 'number' ||
        !Number.isFinite(parsed.caughtCount)
      ) {
        return { data: null, error: 'Dữ liệu lưu tiến trình bị hỏng.' };
      }

      const safeRoom: RoomId =
        parsed.currentRoomId && VALID_ROOM_IDS.has(parsed.currentRoomId)
          ? parsed.currentRoomId
          : 'bedroom';

      return {
        data: {
          ...(parsed as SaveData),
          currentRoomId: safeRoom,
        },
        error: null,
      };
    } catch {
      return { data: null, error: 'Không thể đọc dữ liệu lưu (save bị hỏng hoặc bị chặn).' };
    }
  }

  public clearSave(): void {
    try {
      localStorage.removeItem(GAME_CONFIG.SAVE_STORAGE_KEY);
    } catch {
      // Bỏ qua lỗi quyền truy cập
    }
  }

  public loadUnlockedEndings(): EndingId[] {
    try {
      const raw = localStorage.getItem(GAME_CONFIG.ENDINGS_STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      const unique = new Set<EndingId>();
      for (const item of arr) {
        if (VALID_ENDINGS.has(item as EndingId)) {
          unique.add(item as EndingId);
        }
      }
      return Array.from(unique);
    } catch {
      return [];
    }
  }

  public unlockEnding(id: EndingId): EndingId[] {
    const current = this.loadUnlockedEndings();
    if (!current.includes(id)) {
      current.push(id);
      try {
        localStorage.setItem(GAME_CONFIG.ENDINGS_STORAGE_KEY, JSON.stringify(current));
      } catch {
        // Vẫn trả về danh sách hiện có để hiển thị ở màn hình kết thúc
      }
    }
    return current;
  }
}
