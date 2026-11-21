import React, { useMemo, useState } from 'react';
import {
  Backpack,
  BatteryCharging,
  BookOpen,
  Combine,
  Flashlight,
  Ghost,
  HeartHandshake,
  KeyRound,
  Trash2,
  X,
} from 'lucide-react';
import { GAME_CONFIG } from '../config';
import { ITEM_DEFS } from '../inventory/itemData';
import { InventorySlot, ItemCategory } from '../types';

interface InventoryModalProps {
  slots: InventorySlot[];
  questItems: string[];
  batteryPercent: number;
  hasFlashlight: boolean;
  flashlightOn: boolean;
  onUseItem: (itemId: string) => string;
  onCombineItems: (itemA: string, itemB: string) => string;
  onDropItem: (itemId: string) => string;
  onOpenJournal: () => void;
  onClose: () => void;
}

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  [ItemCategory.Tool]: 'Công cụ',
  [ItemCategory.Battery]: 'Năng lượng',
  [ItemCategory.Quest]: 'Vật phẩm bắt buộc',
  [ItemCategory.Relic]: 'Di vật',
  [ItemCategory.Cursed]: 'Vật phẩm nguyền',
};

function renderItemIcon(itemId: string, category?: ItemCategory) {
  if (itemId === 'flashlight') return <Flashlight className="h-5 w-5 text-amber-300" />;
  if (itemId === 'battery') return <BatteryCharging className="h-5 w-5 text-emerald-300" />;
  if (category === ItemCategory.Quest) return <KeyRound className="h-5 w-5 text-amber-200" />;
  if (category === ItemCategory.Relic) return <HeartHandshake className="h-5 w-5 text-sky-200" />;
  if (category === ItemCategory.Cursed) return <Ghost className="h-5 w-5 text-red-400" />;
  return <Backpack className="h-5 w-5 text-[#cfc9bf]" />;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  slots,
  questItems,
  batteryPercent,
  hasFlashlight,
  flashlightOn,
  onUseItem,
  onCombineItems,
  onDropItem,
  onOpenJournal,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    slots[0]?.itemId ?? questItems[0] ?? null,
  );
  const [combineSourceId, setCombineSourceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedDef = useMemo(() => (selectedId ? ITEM_DEFS[selectedId] : undefined), [selectedId]);
  const selectedSlot = useMemo(
    () => slots.find((s) => s.itemId === selectedId) ?? null,
    [slots, selectedId],
  );
  const isSelectedQuest = selectedId ? questItems.includes(selectedId) : false;

  const handleSelectSlot = (itemId: string) => {
    if (combineSourceId) {
      if (combineSourceId === itemId) {
        setCombineSourceId(null);
        setFeedback('Đã hủy chế độ kết hợp.');
        return;
      }
      const msg = onCombineItems(combineSourceId, itemId);
      setCombineSourceId(null);
      setFeedback(msg);
      return;
    }
    setSelectedId(itemId);
    setFeedback(null);
  };

  const handleUse = () => {
    if (!selectedId) return;
    const msg = onUseItem(selectedId);
    if (msg) setFeedback(msg);
  };

  const handleDrop = () => {
    if (!selectedId) return;
    const msg = onDropItem(selectedId);
    setFeedback(msg);
    setCombineSourceId(null);
    if (!slots.some((s) => s.itemId === selectedId)) {
      const remaining = slots.find((s) => s.itemId !== selectedId);
      setSelectedId(remaining?.itemId ?? questItems[0] ?? null);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050508]/92 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col border border-white/15 bg-[#0c0c11] text-[#e7e2da] shadow-2xl">
        {/* Đầu hộp thoại */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Backpack className="h-5 w-5 text-red-500" />
            <div>
              <h2 className="text-base font-semibold tracking-wide text-white">Túi đồ</h2>
              <p className="text-xs text-[#918b82]">
                Đang mang {slots.length}/{GAME_CONFIG.INVENTORY_SLOTS} ô · Đèn pin:{' '}
                <span className="font-mono-tabular text-[#d9d2c7]">
                  {hasFlashlight ? `${batteryPercent}% (${flashlightOn ? 'Bật' : 'Tắt'})` : 'Chưa có'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenJournal}
              className="flex min-h-[40px] cursor-pointer items-center gap-2 border border-white/15 bg-[#15151d] px-3.5 py-2 text-xs font-medium text-[#dfd9cf] transition-colors hover:border-red-800 hover:text-white"
            >
              <BookOpen className="h-4 w-4 text-red-400" />
              <span>Mở Nhật ký (J)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng túi đồ"
              className="flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center border border-white/15 bg-[#15151d] px-3 py-2 text-xs text-[#d0cac0] transition-colors hover:border-red-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Nội dung chính */}
        <div className="grid flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-[1.3fr_1fr]">
          {/* Cột trái: 8 ô túi + khay vật phẩm bắt buộc */}
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-[#9c958b]">
                <span>Ngăn túi chính (8 ô)</span>
                {combineSourceId && (
                  <span className="text-amber-300">
                    Chọn vật phẩm thứ 2 để kết hợp với {ITEM_DEFS[combineSourceId]?.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {Array.from({ length: GAME_CONFIG.INVENTORY_SLOTS }).map((_, idx) => {
                  const slot = slots[idx];
                  const def = slot ? ITEM_DEFS[slot.itemId] : undefined;
                  const isSelected = slot && slot.itemId === selectedId;
                  const isCombineSrc = slot && slot.itemId === combineSourceId;

                  if (!slot || !def) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="flex h-24 flex-col items-center justify-center border border-white/10 bg-[#08080c] text-[11px] text-[#4e4a44]"
                      >
                        Trống
                      </div>
                    );
                  }

                  return (
                    <button
                      key={`${slot.itemId}-${idx}`}
                      type="button"
                      onClick={() => handleSelectSlot(slot.itemId)}
                      className={`relative flex h-24 cursor-pointer flex-col items-center justify-center gap-2 border p-2 text-center transition-colors ${
                        isCombineSrc
                          ? 'border-amber-500 bg-amber-950/35'
                          : isSelected
                            ? 'border-red-600 bg-red-950/35'
                            : 'border-white/15 bg-[#121219] hover:border-white/35'
                      }`}
                    >
                      {renderItemIcon(slot.itemId, def.category)}
                      <span className="line-clamp-2 text-xs font-medium text-[#ece7df]">
                        {def.name}
                      </span>
                      {slot.quantity > 1 && (
                        <span className="font-mono-tabular absolute top-1.5 right-2 text-[11px] font-semibold text-emerald-300">
                          ×{slot.quantity}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Khay vật phẩm bắt buộc */}
            <div>
              <div className="mb-2 text-xs uppercase tracking-wider text-[#9c958b]">
                Khay vật phẩm bắt buộc (Không chiếm ô · Không thể bỏ)
              </div>
              {questItems.length === 0 ? (
                <div className="border border-white/10 bg-[#08080c] px-3.5 py-3 text-xs text-[#69635b]">
                  Chưa có chìa khóa hay cầu chì nào.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {questItems.map((qId) => {
                    const def = ITEM_DEFS[qId];
                    const isSelected = qId === selectedId;
                    return (
                      <button
                        key={qId}
                        type="button"
                        onClick={() => handleSelectSlot(qId)}
                        className={`flex min-h-[48px] cursor-pointer items-center gap-3 border px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? 'border-red-600 bg-red-950/35'
                            : 'border-white/15 bg-[#121219] hover:border-white/35'
                        }`}
                      >
                        {renderItemIcon(qId, ItemCategory.Quest)}
                        <span className="text-xs font-medium text-[#ece7df]">
                          {def?.name ?? qId}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Chi tiết & thao tác */}
          <div className="flex flex-col justify-between border border-white/10 bg-[#08080c] p-4">
            {selectedDef ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 border-b border-white/10 pb-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/15 bg-[#121219]">
                    {renderItemIcon(selectedDef.id, selectedDef.category)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {selectedDef.name}
                      {selectedSlot && selectedSlot.quantity > 1 ? ` (×${selectedSlot.quantity})` : ''}
                    </h3>
                    <p className="text-xs text-red-400">{CATEGORY_LABEL[selectedDef.category]}</p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-[#c9c3b8]">
                  {selectedDef.description}
                </p>

                {selectedDef.id === 'flashlight' && hasFlashlight && (
                  <p className="font-mono-tabular text-xs text-amber-200">
                    Năng lượng hiện tại: {batteryPercent}%
                  </p>
                )}

                {feedback && (
                  <div className="border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-100">
                    {feedback}
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleUse}
                    className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 border border-red-800/80 bg-red-950/70 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-900/80"
                  >
                    Dùng vật phẩm
                  </button>

                  {!isSelectedQuest && (
                    <button
                      type="button"
                      onClick={() => {
                        if (combineSourceId === selectedDef.id) {
                          setCombineSourceId(null);
                          setFeedback('Đã hủy chế độ kết hợp.');
                        } else {
                          setCombineSourceId(selectedDef.id);
                          setFeedback('Chọn một vật phẩm khác trong túi để kết hợp (vd: Pin + Đèn pin).');
                        }
                      }}
                      className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 border border-white/15 bg-[#14141c] px-4 py-2 text-xs font-medium text-[#e0dad0] transition-colors hover:border-amber-600/80"
                    >
                      <Combine className="h-4 w-4" />
                      <span>
                        {combineSourceId === selectedDef.id ? 'Hủy kết hợp' : 'Kết hợp với vật khác'}
                      </span>
                    </button>
                  )}

                  {!isSelectedQuest &&
                  selectedDef.id !== 'flashlight' &&
                  selectedDef.category !== ItemCategory.Cursed ? (
                    <button
                      type="button"
                      onClick={handleDrop}
                      className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 border border-white/15 bg-[#14141c] px-4 py-2 text-xs font-medium text-red-300 transition-colors hover:border-red-700 hover:bg-red-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Bỏ vật phẩm</span>
                    </button>
                  ) : (
                    <p className="text-[11px] text-[#756f66]">
                      {selectedDef.category === ItemCategory.Cursed
                        ? 'Vật phẩm bị nguyền không thể vứt bỏ.'
                        : 'Vật phẩm quan trọng hoặc bắt buộc không thể vứt bỏ.'}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-xs text-[#6f6960]">
                Chọn một vật phẩm để xem chi tiết và thao tác.
              </div>
            )}

            <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-[#837d74]">
              Nhấn Tab, I hoặc Esc để quay lại trò chơi.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
