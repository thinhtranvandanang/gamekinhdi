import { ENDING_METADATA } from '../config';
import { SaveManager } from '../save/SaveManager';
import { EndingId, EndingSummary } from '../types';

// Đánh giá thứ tự ưu tiên kết thúc (D -> E -> C -> B -> A) và lưu danh sách kết thúc đã mở

export class EndingManager {
  private saveManager: SaveManager;

  constructor(saveManager: SaveManager) {
    this.saveManager = saveManager;
  }

  public resolveEnding(params: {
    caughtThreeTimes: boolean;
    timeExpired: boolean;
    hasCursedDoll: boolean;
    documentsFound: number;
    totalDocuments: number;
    placedRelicsCount: number;
    playTimeSeconds: number;
    caughtCount: number;
  }): EndingSummary {
    let endingId: EndingId = EndingId.A;

    if (params.caughtThreeTimes) {
      endingId = EndingId.D;
    } else if (params.timeExpired) {
      endingId = EndingId.E;
    } else if (params.hasCursedDoll) {
      endingId = EndingId.C;
    } else if (params.documentsFound >= params.totalDocuments && params.placedRelicsCount >= 3) {
      endingId = EndingId.B;
    } else {
      endingId = EndingId.A;
    }

    const unlocked = this.saveManager.unlockEnding(endingId);
    const meta = ENDING_METADATA[endingId];

    // Gợi ý về một kết thúc chưa mở
    const allIds: EndingId[] = [EndingId.B, EndingId.C, EndingId.A, EndingId.D, EndingId.E];
    const nextLocked = allIds.find((id) => !unlocked.includes(id));
    const nextEndingHint = nextLocked
      ? ENDING_METADATA[nextLocked].hint
      : 'Bạn đã mở khóa toàn bộ 5 kết thúc của căn nhà.';

    return {
      endingId,
      title: meta.title,
      subtitle: meta.subtitle,
      description: meta.description,
      playTimeSeconds: params.playTimeSeconds,
      documentsFound: params.documentsFound,
      totalDocuments: params.totalDocuments,
      caughtCount: params.caughtCount,
      unlockedEndings: unlocked,
      nextEndingHint,
    };
  }
}
