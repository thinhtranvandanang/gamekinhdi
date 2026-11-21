import { GAME_CONFIG } from '../config';

// Quản lý trạng thái toàn bộ câu đố: ngăn kéo 0317, cầu chì + cầu dao, chữ ẩn 21, mật mã 5821, di vật bàn thờ

export class PuzzleManager {
  public solvedPuzzles = new Set<string>();
  public fuseInstalled = false;
  public powerRestored = false;
  public placedRelics = new Set<string>();
  public revealedHiddenClue21 = false;

  public reset(): void {
    this.solvedPuzzles.clear();
    this.fuseInstalled = false;
    this.powerRestored = false;
    this.placedRelics.clear();
    this.revealedHiddenClue21 = false;
  }

  public isStudyDrawerUnlocked(): boolean {
    return this.solvedPuzzles.has('study_drawer');
  }

  public isMainDoorKeypadSolved(): boolean {
    return this.solvedPuzzles.has('main_door_keypad');
  }

  public checkStudyDrawerCode(code: string): boolean {
    const ok = code.trim() === GAME_CONFIG.STUDY_DRAWER_CODE;
    if (ok) this.solvedPuzzles.add('study_drawer');
    return ok;
  }

  public checkMainDoorCode(code: string): boolean {
    if (!this.powerRestored) return false;
    const ok = code.trim() === GAME_CONFIG.MAIN_DOOR_CODE;
    if (ok) this.solvedPuzzles.add('main_door_keypad');
    return ok;
  }

  public placeRelic(relicId: string): boolean {
    if (this.placedRelics.has(relicId)) return false;
    this.placedRelics.add(relicId);
    return true;
  }

  public solveAllInstant(): void {
    this.solvedPuzzles.add('study_drawer');
    this.fuseInstalled = true;
    this.powerRestored = true;
    this.solvedPuzzles.add('main_door_keypad');
    this.revealedHiddenClue21 = true;
  }
}
