import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { GAME_CONFIG } from '../config';
import { DebugState, EndingId, GhostState, RoomId, ScriptedEventId } from '../types';
import { ROOMS } from '../world/layoutData';

interface DebugPanelProps {
  debug: DebugState;
  onToggleNoclip: (enabled: boolean) => void;
  onTeleport: (roomId: RoomId) => void;
  onSetTime: (seconds: number) => void;
  onSetTension: (value: number) => void;
  onTriggerGhost: (state: GhostState) => void;
  onTriggerScriptedEvent: (id: ScriptedEventId) => void;
  onToggleVisuals: (colliders: boolean, waypoints: boolean, ghostDebug?: boolean) => void;
  onGiveAllItems: () => void;
  onSolveAllPuzzles: () => void;
  onJumpNearEnd: () => void;
  onForceEnding: (id: EndingId) => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  debug,
  onToggleNoclip,
  onTeleport,
  onSetTime,
  onSetTension,
  onTriggerGhost,
  onTriggerScriptedEvent,
  onToggleVisuals,
  onGiveAllItems,
  onSolveAllPuzzles,
  onJumpNearEnd,
  onForceEnding,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!debug.enabled) return null;

  const roomList = Object.values(ROOMS);
  const allGhostStates: GhostState[] = [
    GhostState.Dormant,
    GhostState.Scare,
    GhostState.Stalk,
    GhostState.Chase,
    GhostState.Search,
    GhostState.Cooldown,
  ];
  const scriptedEvents: ScriptedEventId[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
  const endings: EndingId[] = [EndingId.A, EndingId.B, EndingId.C, EndingId.D, EndingId.E];

  return (
    <div className="fixed top-20 left-4 z-45 w-76 border border-red-900/60 bg-[#09090d]/95 text-xs text-[#ddd7cf] shadow-xl">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full cursor-pointer items-center justify-between border-b border-white/10 px-3 py-2 font-semibold text-red-400"
      >
        <span className="flex items-center gap-2">
          <Bug className="h-3.5 w-3.5" />
          Chế độ Debug · FPS {debug.fps}
        </span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {!collapsed && (
        <div className="max-h-[72vh] space-y-3 overflow-y-auto p-3">
          <div className="flex items-center justify-between">
            <span>Xuyên tường (Noclip)</span>
            <input
              type="checkbox"
              checked={debug.noclip}
              onChange={(e) => onToggleNoclip(e.target.checked)}
              className="accent-red-700"
            />
          </div>

          <div className="flex items-center justify-between">
            <span>Hiện Collider</span>
            <input
              type="checkbox"
              checked={debug.showColliders}
              onChange={(e) =>
                onToggleVisuals(e.target.checked, debug.showWaypoints, debug.showGhostDebug)
              }
              className="accent-red-700"
            />
          </div>

          <div className="flex items-center justify-between">
            <span>Hiện Waypoint A*</span>
            <input
              type="checkbox"
              checked={debug.showWaypoints}
              onChange={(e) =>
                onToggleVisuals(debug.showColliders, e.target.checked, debug.showGhostDebug)
              }
              className="accent-red-700"
            />
          </div>

          <div className="flex items-center justify-between">
            <span>Hiện đường đi & tầm nhìn ma</span>
            <input
              type="checkbox"
              checked={debug.showGhostDebug}
              onChange={(e) =>
                onToggleVisuals(debug.showColliders, debug.showWaypoints, e.target.checked)
              }
              className="accent-red-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-[#9b958c]">Dịch chuyển tới phòng</label>
            <select
              onChange={(e) => {
                if (e.target.value) onTeleport(e.target.value as RoomId);
              }}
              defaultValue=""
              className="w-full border border-white/15 bg-[#14141b] px-2 py-1.5 text-xs text-white"
            >
              <option value="" disabled>
                Chọn phòng...
              </option>
              {roomList.map((r) => (
                <option key={r.id} value={r.id}>
                  T{r.floorLevel === -1 ? 'H' : r.floorLevel} · {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 flex justify-between">
              <span className="text-[#9b958c]">Giờ game</span>
              <span className="font-mono-tabular">
                {Math.round((debug.gameTimeSeconds / GAME_CONFIG.TOTAL_REAL_SECONDS) * 180)} phút
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={GAME_CONFIG.TOTAL_REAL_SECONDS - 10}
              step={30}
              value={debug.gameTimeSeconds}
              onChange={(e) => onSetTime(parseFloat(e.target.value))}
              className="w-full accent-red-700"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between">
              <span className="text-[#9b958c]">Tension (30/60/85)</span>
              <span className="font-mono-tabular">
                {debug.tension} · Bị bắt {debug.caughtCount}/3
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={debug.tension}
              onChange={(e) => onSetTension(parseFloat(e.target.value))}
              className="w-full accent-red-700"
            />
          </div>

          <div>
            <div className="mb-1 text-[#9b958c]">Trạng thái Cái Bóng ({debug.ghostState})</div>
            <div className="grid grid-cols-3 gap-1.5">
              {allGhostStates.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => onTriggerGhost(st)}
                  className={`cursor-pointer border py-1 text-[11px] hover:border-red-700 ${
                    debug.ghostState === st
                      ? 'border-red-700 bg-red-950/60 text-red-100'
                      : 'border-white/10 bg-[#14141b]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-[#9b958c]">Sự kiện kịch bản</div>
            <div className="grid grid-cols-3 gap-1.5">
              {scriptedEvents.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTriggerScriptedEvent(id)}
                  className="cursor-pointer border border-white/10 bg-[#14141b] py-1 text-[11px] hover:border-red-700"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onGiveAllItems}
              className="w-full cursor-pointer border border-red-900/70 bg-red-950/60 py-1.5 font-medium text-red-200 hover:bg-red-900/60"
            >
              Nhận toàn bộ vật phẩm & pin
            </button>

            <button
              type="button"
              onClick={onSolveAllPuzzles}
              className="w-full cursor-pointer border border-amber-800/70 bg-amber-950/50 py-1.5 font-medium text-amber-200 hover:bg-amber-900/50"
            >
              Giải đố tức thì
            </button>

            <button
              type="button"
              onClick={onJumpNearEnd}
              className="w-full cursor-pointer border border-sky-800/70 bg-sky-950/50 py-1.5 font-medium text-sky-200 hover:bg-sky-900/50"
            >
              Nhảy tới gần cuối (05:57)
            </button>
          </div>

          <div>
            <div className="mb-1 text-[#9b958c]">Ép từng kết thúc</div>
            <div className="grid grid-cols-5 gap-1">
              {endings.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onForceEnding(id)}
                  className="cursor-pointer border border-white/15 bg-[#14141b] py-1 font-mono-tabular text-[11px] font-semibold hover:border-red-600 hover:bg-red-950/50"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

