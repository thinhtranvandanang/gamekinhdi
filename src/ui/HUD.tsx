import React from 'react';
import { Backpack, BookOpen, Flashlight, Pause, Volume2, VolumeX } from 'lucide-react';
import { DEFAULT_KEY_BINDINGS } from '../config';
import { formatKeyCode } from '../input/Input';
import { GhostState, HUDState, KeyBindings, QuestStatus } from '../types';

interface HUDProps {
  hud: HUDState;
  isMuted: boolean;
  keyBindings?: KeyBindings;
  onToggleMute: () => void;
  onPause: () => void;
  onLockPointer: () => void;
  onOpenInventory: () => void;
  onOpenJournal: () => void;
}

const SIDE_STATUS_TEXT: Record<QuestStatus, string> = {
  unaccepted: 'Chưa nhận',
  in_progress: 'Đang làm',
  completed: 'Hoàn thành',
};

const SIDE_STATUS_COLOR: Record<QuestStatus, string> = {
  unaccepted: 'text-[#6c675e]',
  in_progress: 'text-amber-300',
  completed: 'text-emerald-400',
};

export const HUD: React.FC<HUDProps> = ({
  hud,
  isMuted,
  keyBindings = DEFAULT_KEY_BINDINGS,
  onToggleMute,
  onPause,
  onLockPointer,
  onOpenInventory,
  onOpenJournal,
}) => {
  const ghostCloseDanger =
    hud.ghostState === GhostState.Chase ||
    (hud.ghostDistance < 10 &&
      hud.ghostState !== GhostState.Dormant &&
      hud.ghostState !== GhostState.Cooldown);

  return (
    <>
      {ghostCloseDanger && !hud.caughtNotice && (
        <div
          className={`pointer-events-none fixed inset-0 z-18 ${
            hud.ghostState === GhostState.Chase
              ? 'border-[6px] border-red-900/55 shadow-[inset_0_0_90px_rgba(127,29,29,0.55)]'
              : 'border-4 border-red-950/35 shadow-[inset_0_0_60px_rgba(90,16,16,0.38)]'
          }`}
        />
      )}

      {hud.caughtNotice && (
        <div className="pointer-events-auto fixed inset-0 z-48 flex items-center justify-center bg-[#030305] px-6 text-center">
          <div className="max-w-md border border-red-900/60 bg-[#08080c] px-6 py-5">
            <p className="font-mono-tabular text-xs tracking-widest text-red-500 uppercase">
              Cái Bóng đã chạm vào bạn
            </p>
            <p className="mt-2 text-sm text-[#e5dfd6]">{hud.caughtNotice}</p>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-4 md:p-6 safe-pad">
        {/* Thanh trên: Đồng hồ + Phòng + Nhiệm vụ | Pin đèn + Phím tắt + Nút tạm dừng */}
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="min-w-0 flex-1 max-w-xs border border-white/10 bg-[#07070a]/75 px-3 py-2 sm:max-w-sm md:max-w-md md:px-3.5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="font-mono-tabular text-lg font-semibold text-red-500">
                {hud.formattedTime}
              </span>
              <span className="text-xs text-[#c7c1b7]">
                {hud.currentFloorLabel} · {hud.currentRoomName}
              </span>
              {hud.caughtCount > 0 && (
                <span className="font-mono-tabular text-[11px] text-red-400">
                  Bị bắt: {hud.caughtCount}/3
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-[#dfd9cf]">
              <span className="mr-1.5 font-semibold text-red-400">Chính:</span>
              {hud.currentObjective}
            </p>

            <p className="mt-0.5 text-[11px] text-[#9b948a]">
              <span className="mr-1.5 font-medium text-[#c7c1b7]">Phụ:</span>
              {hud.sideObjective} ·{' '}
              <span className={SIDE_STATUS_COLOR[hud.sideStatus]}>
                {SIDE_STATUS_TEXT[hud.sideStatus]}
              </span>
            </p>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <div className="flex items-center gap-2 border border-white/10 bg-[#07070a]/75 px-3 py-2 text-xs">
              <Flashlight
                className={`h-4 w-4 ${
                  hud.hasFlashlight && hud.flashlightOn
                    ? hud.isLowBattery
                      ? 'text-red-500'
                      : 'text-amber-300'
                    : 'text-[#6e6a63]'
                }`}
              />
              {hud.hasFlashlight ? (
                <>
                  <span
                    className={`font-mono-tabular font-medium ${
                      hud.isLowBattery ? 'text-red-400' : 'text-[#ddd7cf]'
                    }`}
                  >
                    Pin {hud.batteryPercent}%
                  </span>
                  <span className="text-[#78736c]">· {hud.flashlightOn ? 'Bật' : 'Tắt'}</span>
                  {hud.stunCooldownSec > 0 && (
                    <span className="font-mono-tabular text-[11px] text-[#8e887f]">
                      · Chói {hud.stunCooldownSec}s
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[#8e887f]">Chưa có đèn</span>
              )}
            </div>

            {!hud.isTouchDevice && (
              <>
                <button
                  type="button"
                  onClick={onOpenInventory}
                  aria-label="Mở túi đồ"
                  className="flex cursor-pointer items-center gap-1.5 border border-white/10 bg-[#07070a]/75 px-2.5 py-2 text-xs text-[#c7c1b7] transition-colors hover:border-red-900/70 hover:text-white"
                >
                  <Backpack className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tab</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenJournal}
                  aria-label="Mở nhật ký"
                  className="font-mono-tabular flex cursor-pointer items-center gap-1.5 border border-white/10 bg-[#07070a]/75 px-2.5 py-2 text-xs text-[#c7c1b7] transition-colors hover:border-red-900/70 hover:text-white"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {formatKeyCode(keyBindings.journal)} · {hud.documentsFound}/10
                  </span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="cursor-pointer border border-white/10 bg-[#07070a]/75 p-2 text-[#b8b2a8] transition-colors hover:border-red-900/70 hover:text-white"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-red-500" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {!hud.isTouchDevice && (
              <button
                type="button"
                onClick={onPause}
                aria-label="Tạm dừng"
                className="cursor-pointer border border-white/10 bg-[#07070a]/75 p-2 text-[#b8b2a8] transition-colors hover:border-red-900/70 hover:text-white"
              >
                <Pause className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tâm ngắm & gợi ý giữa màn hình */}
        <div className="pointer-events-none relative flex flex-col items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-[#e6e1d8]/80" />

          {hud.interactionPrompt && (
            <div className="mt-4 border border-red-900/60 bg-[#07070a]/85 px-3.5 py-1.5 text-xs font-medium text-[#ece7df]">
              {hud.interactionPrompt}
            </div>
          )}

          {!hud.isTouchDevice && !hud.pointerLocked && (
            <button
              type="button"
              onClick={onLockPointer}
              className="pointer-events-auto mt-5 cursor-pointer border border-white/15 bg-[#09090d]/85 px-4 py-2 text-xs text-[#cfc9bf] transition-colors hover:border-red-800 hover:text-white"
            >
              Nhấp vào màn hình để khóa chuột xoay góc nhìn (Esc để tạm dừng)
            </button>
          )}

          {hud.autoQualityNote && (
            <div className="mt-3 border border-white/10 bg-[#07070a]/85 px-3 py-1.5 text-xs text-[#cfc9bf]">
              {hud.autoQualityNote}
            </div>
          )}
        </div>

        {/* Thanh dưới: Phụ đề, trạng thái cúi và thanh thể lực */}
        <div className="flex flex-col items-center gap-2">
          {hud.subtitleText && (
            <div className="border border-white/10 bg-[#07070a]/85 px-4 py-1.5 text-xs text-[#e5dfd6]">
              {hud.subtitleText}
            </div>
          )}

          <div className="flex items-center gap-3">
            {hud.isCrouching && (
              <span className="border border-white/10 bg-[#07070a]/75 px-2.5 py-1 text-xs text-[#b9b3aa]">
                Đang cúi ({formatKeyCode(keyBindings.crouch)})
              </span>
            )}

            {hud.staminaPercent < 100 && (
              <div className="w-40 border border-white/10 bg-[#07070a]/75 p-1">
                <div className="h-1.5 w-full bg-[#1a1a22]">
                  <div
                    className="h-full bg-red-700 transition-all duration-100"
                    style={{ width: `${hud.staminaPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};


