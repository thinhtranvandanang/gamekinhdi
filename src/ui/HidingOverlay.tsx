import React from 'react';
import { DEFAULT_KEY_BINDINGS } from '../config';
import { formatKeyCode } from '../input/Input';
import { HUDState, KeyBindings } from '../types';

interface HidingOverlayProps {
  hud: HUDState;
  keyBindings?: KeyBindings;
}

// Lớp phủ khe cửa tủ khi đang trốn + thanh hơi thở và hướng dẫn nín thở
export const HidingOverlay: React.FC<HidingOverlayProps> = ({
  hud,
  keyBindings = DEFAULT_KEY_BINDINGS,
}) => {
  if (!hud.isHiding) return null;

  const breathLow = hud.breathPercent <= 25;
  const holdKey = formatKeyCode(keyBindings.holdBreath);
  const exitKey = formatKeyCode(keyBindings.interact);

  return (
    <div className="pointer-events-none fixed inset-0 z-15 flex flex-col justify-between">
      {/* Thanh đen trên dưới và hai mép tạo cảm giác nhìn qua khe tủ */}
      <div className="h-[18%] w-full border-b border-black bg-[#040406]/92" />

      <div className="flex flex-1 justify-between">
        <div className="w-[14%] border-r border-black bg-[#040406]/92 sm:w-[22%]" />
        <div className="relative flex-1">
          {/* Khe hở mảnh ở hai mép dọc tạo bóng gỗ tủ */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/80 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-3 bg-gradient-to-l from-black/80 to-transparent" />
        </div>
        <div className="w-[14%] border-l border-black bg-[#040406]/92 sm:w-[22%]" />
      </div>

      <div className="flex h-[20%] w-full flex-col items-center justify-start border-t border-black bg-[#040406]/94 pt-4">
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <div className="text-xs font-semibold tracking-wide text-[#d4cec4]">
            Đang trốn: {hud.hidingSpotLabel ?? 'Chỗ trốn'}
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-[#9b958c]">Hơi thở</span>
            <div className="h-2 w-44 border border-white/15 bg-[#121218] p-[1px]">
              <div
                className={`h-full transition-all duration-75 ${
                  breathLow
                    ? 'bg-red-600'
                    : hud.isHoldingBreath
                      ? 'bg-amber-300'
                      : 'bg-[#bdb6ab]'
                }`}
                style={{ width: `${hud.breathPercent}%` }}
              />
            </div>
            <span className="font-mono-tabular w-9 text-right text-[11px] text-[#d4cec4]">
              {hud.breathPercent}%
            </span>
          </div>

          <p className="text-[11px] text-[#9c958b]">
            {hud.isTouchDevice
              ? 'Giữ nút Giữ hơi để nín thở · Nhấn nút Bàn tay để ra ngoài'
              : `Giữ [${holdKey}] để nín thở · Nhấn [${exitKey}] để bước ra ngoài`}
          </p>
        </div>
      </div>
    </div>
  );
};
