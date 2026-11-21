import { ACHIEVEMENT_METADATA, GAME_CONFIG } from '../config';
import { ALL_DOCUMENTS } from '../inventory/documentData';
import { AchievementId, EndingId, PlayerStats } from '../types';

// Quản lý thống kê người chơi và 6 thành tựu lưu riêng trong LocalStorage (stats_v1)

const VALID_ACHIEVEMENTS = new Set<AchievementId>(
  Object.keys(ACHIEVEMENT_METADATA) as AchievementId[],
);

export function createEmptyStats(): PlayerStats {
  return {
    gamesStarted: 0,
    gamesEscaped: 0,
    totalPlaySeconds: 0,
    timesCaughtTotal: 0,
    ghostStunsTotal: 0,
    hidesSurvivedTotal: 0,
    fastestEscapeSeconds: null,
    documentsReadEver: [],
    unlockedAchievements: [],
  };
}

export class StatsManager {
  private stats: PlayerStats;
  private onUnlock?: (id: AchievementId, title: string) => void;

  constructor(onUnlock?: (id: AchievementId, title: string) => void) {
    this.onUnlock = onUnlock;
    this.stats = this.load();
  }

  public getSnapshot(): PlayerStats {
    return {
      ...this.stats,
      documentsReadEver: [...this.stats.documentsReadEver],
      unlockedAchievements: [...this.stats.unlockedAchievements],
    };
  }

  public load(): PlayerStats {
    try {
      const raw = localStorage.getItem(GAME_CONFIG.STATS_STORAGE_KEY);
      if (!raw) return createEmptyStats();
      const parsed = JSON.parse(raw) as Partial<PlayerStats>;
      if (!parsed || typeof parsed !== 'object') return createEmptyStats();

      const num = (v: unknown) =>
        typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;

      const docs = Array.isArray(parsed.documentsReadEver)
        ? Array.from(new Set(parsed.documentsReadEver.filter((d) => typeof d === 'string')))
        : [];
      const achs = Array.isArray(parsed.unlockedAchievements)
        ? Array.from(
            new Set(
              parsed.unlockedAchievements.filter((a) =>
                VALID_ACHIEVEMENTS.has(a as AchievementId),
              ) as AchievementId[],
            ),
          )
        : [];

      return {
        gamesStarted: num(parsed.gamesStarted),
        gamesEscaped: num(parsed.gamesEscaped),
        totalPlaySeconds: num(parsed.totalPlaySeconds),
        timesCaughtTotal: num(parsed.timesCaughtTotal),
        ghostStunsTotal: num(parsed.ghostStunsTotal),
        hidesSurvivedTotal: num(parsed.hidesSurvivedTotal),
        fastestEscapeSeconds:
          typeof parsed.fastestEscapeSeconds === 'number' &&
          Number.isFinite(parsed.fastestEscapeSeconds) &&
          parsed.fastestEscapeSeconds >= 0
            ? parsed.fastestEscapeSeconds
            : null,
        documentsReadEver: docs,
        unlockedAchievements: achs,
      };
    } catch {
      return createEmptyStats();
    }
  }

  private save(): void {
    try {
      localStorage.setItem(GAME_CONFIG.STATS_STORAGE_KEY, JSON.stringify(this.stats));
    } catch {
      // Bỏ qua nếu trình duyệt chặn LocalStorage
    }
  }

  public unlockAchievement(id: AchievementId): boolean {
    if (this.stats.unlockedAchievements.includes(id)) return false;
    this.stats.unlockedAchievements.push(id);
    this.save();
    const meta = ACHIEVEMENT_METADATA[id];
    if (meta) {
      this.onUnlock?.(id, meta.title);
    }
    return true;
  }

  public recordGameStart(): void {
    this.stats.gamesStarted += 1;
    this.save();
  }

  public recordPlayTime(seconds: number): void {
    if (seconds <= 0) return;
    this.stats.totalPlaySeconds += seconds;
    this.save();
  }

  public recordCaught(): void {
    this.stats.timesCaughtTotal += 1;
    this.save();
  }

  public recordGhostStun(): void {
    this.stats.ghostStunsTotal += 1;
    this.unlockAchievement('flash_stunner');
    this.save();
  }

  public recordHideSurvived(): void {
    this.stats.hidesSurvivedTotal += 1;
    this.unlockAchievement('silent_breath');
    this.save();
  }

  public recordDocumentRead(docId: string): void {
    if (!this.stats.documentsReadEver.includes(docId)) {
      this.stats.documentsReadEver.push(docId);
      if (ALL_DOCUMENTS.every((d) => this.stats.documentsReadEver.includes(d.id))) {
        this.unlockAchievement('collector_all');
      }
      this.save();
    }
  }

  public recordEnding(endingId: EndingId, runSeconds: number): void {
    if (endingId === EndingId.A || endingId === EndingId.B || endingId === EndingId.C) {
      this.stats.gamesEscaped += 1;
      if (
        this.stats.fastestEscapeSeconds === null ||
        runSeconds < this.stats.fastestEscapeSeconds
      ) {
        this.stats.fastestEscapeSeconds = Math.round(runSeconds);
      }
      this.unlockAchievement('first_escape');
    }
    if (endingId === EndingId.B) {
      this.unlockAchievement('truth_seeker');
    }
    if (endingId === EndingId.C) {
      this.unlockAchievement('cursed_curiosity');
    }
    this.save();
  }

  public resetStats(): void {
    this.stats = createEmptyStats();
    this.save();
  }
}
