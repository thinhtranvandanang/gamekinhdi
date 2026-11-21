import React, { useRef, useState } from 'react';
import { ArrowDownToLine, Backpack, BookOpen, Flashlight, Hand, Pause, Wind } from 'lucide-react';
import { TouchControls } from '../input/TouchControls';
import { HUDState } from '../types';

interface TouchOverlayProps {
  hud: HUDState;
  touchControls: TouchControls;
  onToggleFlashlight: () => void;
  onToggleCrouch: () => void;
  onInteract: () => void;
  onOpenInventory: () => void;
  onOpenJournal: () => void;
  onPause: () => void;
}

export const TouchOverlay: React.FC<TouchOverlayProps> = ({
  hud,
  touchControls,
  onToggleFlashlight,
  onToggleCrouch,
  onInteract,
  onOpenInventory,
  onOpenJournal,
  onPause,
}) => {
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const joystickTouchId = useRef<number | null>(null);
  const joystickCenter = useRef({ x: 0, y: 0 });
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  const maxRadius = 42;

  const handleJoystickStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (joystickTouchId.current !== null) return;
    const t = e.changedTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    joystickTouchId.current = t.identifier;
    joystickCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    updateJoystick(t.clientX, t.clientY);
  };

  const handleJoystickMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (joystickTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joystickTouchId.current) {
        updateJoystick(t.clientX, t.clientY);
        break;
      }
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        setKnobOffset({ x: 0, y: 0 });
        touchControls.setJoystickVector(0, 0);
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    let dx = clientX - joystickCenter.current.x;
    let dy = clientY - joystickCenter.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: dx, y: dy });
    touchControls.setJoystickVector(dx / maxRadius, dy / maxRadius);
  };

  const handleLookStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (lookTouchId.current !== null) return;
    const t = e.changedTouches[0];
    lookTouchId.current = t.identifier;
    lastLookPos.current = { x: t.clientX, y: t.clientY };
  };

  const handleLookMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (lookTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchId.current) {
        const dx = t.clientX - lastLookPos.current.x;
        const dy = t.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: t.clientX, y: t.clientY };
        touchControls.addLookDelta(dx, dy);
        break;
      }
    }
  };

  const handleLookEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
        break;
      }
    }
  };

  return (
    <div
      className="pointer-events-none fixed inset-0 z-25 safe-pad"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Vùng vuốt xoay camera bên phải màn hình */}
      <div
        className="pointer-events-auto absolute top-14 right-0 bottom-0 left-1/2"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
      />

      {/* Joystick ảo bên trái */}
      <div
        className="pointer-events-auto absolute bottom-5 left-4 flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-[#09090d]/60 sm:bottom-6 sm:left-6 sm:h-32 sm:w-32"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onTouchCancel={handleJoystickEnd}
      >
        <div
          className="h-12 w-12 rounded-full border border-red-700/80 bg-red-950/80"
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
        />
      </div>

      {/* Các nút góc phải cách xa nhau, đủ lớn (>= 48px) */}
      <div className="pointer-events-auto absolute right-5 bottom-5 flex flex-col items-end gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenJournal}
            aria-label="Mở nhật ký"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#09090d]/80 text-[#dcd6cd]"
          >
            <BookOpen className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onOpenInventory}
            aria-label="Mở túi đồ"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#09090d]/80 text-[#dcd6cd]"
          >
            <Backpack className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Tạm dừng"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#09090d]/80 text-[#dcd6cd]"
          >
            <Pause className="h-5 w-5" />
          </button>
        </div>

        {hud.isHiding && (
          <button
            type="button"
            aria-label="Giữ hơi thở"
            onTouchStart={() => {
              touchControls.holdBreath = true;
            }}
            onTouchEnd={() => {
              touchControls.holdBreath = false;
            }}
            onTouchCancel={() => {
              touchControls.holdBreath = false;
            }}
            className={`flex h-12 items-center gap-2 rounded-full border px-4 text-xs font-semibold ${
              hud.isHoldingBreath
                ? 'border-amber-400 bg-amber-950/90 text-amber-100'
                : 'border-red-700 bg-red-950/90 text-red-100'
            }`}
          >
            <Wind className="h-4 w-4" />
            <span>Giữ hơi</span>
          </button>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleCrouch}
            aria-label="Cúi"
            className={`flex h-12 w-12 items-center justify-center rounded-full border ${
              hud.isCrouching
                ? 'border-red-600 bg-red-950/85 text-red-100'
                : 'border-white/15 bg-[#09090d]/80 text-[#dcd6cd]'
            }`}
          >
            <ArrowDownToLine className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onToggleFlashlight}
            aria-label="Đèn pin"
            className={`flex h-12 w-12 items-center justify-center rounded-full border ${
              hud.flashlightOn
                ? 'border-amber-500/70 bg-amber-950/50 text-amber-200'
                : 'border-white/15 bg-[#09090d]/80 text-[#dcd6cd]'
            }`}
          >
            <Flashlight className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onInteract}
            aria-label="Tương tác"
            className={`flex h-14 w-14 items-center justify-center rounded-full border ${
              hud.interactionPrompt
                ? 'border-red-500 bg-red-900/90 text-white'
                : 'border-red-800/70 bg-red-950/80 text-red-50'
            }`}
          >
            <Hand className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

