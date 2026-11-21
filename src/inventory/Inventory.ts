import { GAME_CONFIG } from '../config';
import { InventorySlot, ItemCategory } from '../types';
import { ITEM_DEFS } from './itemData';

// Quản lý túi đồ 8 ô, khay vật phẩm bắt buộc riêng, nhật ký tài liệu và kết hợp vật phẩm

export class InventorySystem {
  public slots: InventorySlot[] = [];
  public questItems = new Set<string>();
  public readDocuments = new Set<string>();
  public hasCursedDoll = false;

  public reset(): void {
    this.slots = [];
    this.questItems.clear();
    this.readDocuments.clear();
    this.hasCursedDoll = false;
  }

  public addItem(itemId: string, isQuestOverride?: boolean): boolean {
    const def = ITEM_DEFS[itemId];
    const isQuest = isQuestOverride ?? def?.category === ItemCategory.Quest;

    if (isQuest) {
      this.questItems.add(itemId);
      return true;
    }

    if (itemId === 'cursed_doll') {
      this.hasCursedDoll = true;
    }

    const stackable = def?.stackable ?? false;
    if (stackable) {
      const existing = this.slots.find((s) => s.itemId === itemId);
      if (existing) {
        existing.quantity += 1;
        return true;
      }
    }

    if (this.slots.length >= GAME_CONFIG.INVENTORY_SLOTS) {
      return false;
    }
    this.slots.push({ itemId, quantity: 1 });
    return true;
  }

  public consumeItem(itemId: string): boolean {
    // Vật phẩm bắt buộc không bị tiêu hao
    if (this.questItems.has(itemId)) return false;

    const idx = this.slots.findIndex((s) => s.itemId === itemId);
    if (idx === -1) return false;
    this.slots[idx].quantity -= 1;
    if (this.slots[idx].quantity <= 0) {
      this.slots.splice(idx, 1);
    }
    if (itemId === 'cursed_doll' && !this.slots.some((s) => s.itemId === 'cursed_doll')) {
      this.hasCursedDoll = false;
    }
    return true;
  }

  public dropItem(itemId: string): { ok: boolean; message: string } {
    const def = ITEM_DEFS[itemId];
    if (def?.category === ItemCategory.Quest || this.questItems.has(itemId)) {
      return { ok: false, message: 'Vật phẩm bắt buộc không thể bỏ.' };
    }
    if (def?.category === ItemCategory.Cursed) {
      return { ok: false, message: 'Không thể vứt bỏ Búp bê sứ — hơi lạnh vẫn bám chặt lấy bạn.' };
    }
    if (itemId === 'flashlight') {
      return { ok: false, message: 'Không thể bỏ chiếc đèn pin duy nhất.' };
    }
    const removed = this.consumeItem(itemId);
    return removed
      ? { ok: true, message: `Đã bỏ ${def?.name ?? itemId}.` }
      : { ok: false, message: 'Không tìm thấy vật phẩm trong túi.' };
  }

  public hasItem(itemId: string): boolean {
    return this.questItems.has(itemId) || this.slots.some((s) => s.itemId === itemId);
  }

  public getItemCount(itemId: string): number {
    if (this.questItems.has(itemId)) return 1;
    return this.slots
      .filter((s) => s.itemId === itemId)
      .reduce((acc, s) => acc + s.quantity, 0);
  }

  public canCombine(itemA: string, itemB: string): boolean {
    return (
      (itemA === 'battery' && itemB === 'flashlight') ||
      (itemA === 'flashlight' && itemB === 'battery')
    );
  }
}
