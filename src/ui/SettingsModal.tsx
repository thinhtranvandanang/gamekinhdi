import React, { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { DEFAULT_KEY_BINDINGS, GAME_CONFIG, KEY_ACTION_LABELS } from '../config';
import { formatKeyCode } from '../input/Input';
import { GameSettings, KeyAction, QualityLevel } from '../types';

interface SettingsModalProps {
  settings: GameSettings;
  onSave: (next: GameSettings) => void;
  onClose: () => void;
}

const KEY_ACTIONS = Object.keys(KEY_ACTION_LABELS) as KeyAction[];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<GameSettings>({
    ...settings,
    keyBindings: { ...settings.keyBindings },
  });
  const [listeningAction, setListeningAction] = useState<KeyAction | null>(null);

  const updateField = <K extends keyof GameSettings>(key: K, val: GameSettings[K]) => {
    const next = { ...draft, [key]: val };
    setDraft(next);
    onSave(next);
  };

  useEffect(() => {
    if (!listeningAction) return;

    const handleKeyCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListeningAction(null);
        return;
      }
      const nextBindings = { ...draft.keyBindings };
      const oldCode = nextBindings[listeningAction];
      // Hoán đổi nếu phím mới đang được gán cho hành động khác
      for (const action of KEY_ACTIONS) {
        if (action !== listeningAction && nextBindings[action] === e.code) {
          nextBindings[action] = oldCode;
        }
      }
      nextBindings[listeningAction] = e.code;
      const nextSettings = { ...draft, keyBindings: nextBindings };
      setDraft(nextSettings);
      onSave(nextSettings);
      setListeningAction(null);
    };

    window.addEventListener('keydown', handleKeyCapture, true);
    return () => window.removeEventListener('keydown', handleKeyCapture, true);
  }, [listeningAction, draft, onSave]);

  const handleResetBindings = () => {
    const nextSettings = { ...draft, keyBindings: { ...DEFAULT_KEY_BINDINGS } };
    setDraft(nextSettings);
    onSave(nextSettings);
    setListeningAction(null);
  };

  const qualities: QualityLevel[] = [QualityLevel.Low, QualityLevel.Medium, QualityLevel.High];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050507]/85 p-4 safe-pad">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-white/10 bg-[#0d0d12] p-6 shadow-2xl md:p-8">
        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="font-display text-2xl font-bold text-[#ece7df]">Cài đặt</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cài đặt"
            className="cursor-pointer p-2 text-[#9b958c] transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 text-sm text-[#d4cec4]">
          <div>
            <div className="mb-1.5 flex justify-between">
              <span>Âm lượng tổng</span>
              <span className="font-mono-tabular text-red-400">
                {Math.round(draft.masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draft.masterVolume}
              onChange={(e) => updateField('masterVolume', parseFloat(e.target.value))}
              className="w-full accent-red-700"
            />
          </div>

          <div>
            <div className="mb-1.5 flex justify-between">
              <span>Âm lượng nhạc nền</span>
              <span className="font-mono-tabular text-red-400">
                {Math.round(draft.musicVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draft.musicVolume}
              onChange={(e) => updateField('musicVolume', parseFloat(e.target.value))}
              className="w-full accent-red-700"
            />
          </div>

          <div>
            <div className="mb-1.5 flex justify-between">
              <span>Âm lượng hiệu ứng</span>
              <span className="font-mono-tabular text-red-400">
                {Math.round(draft.sfxVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draft.sfxVolume}
              onChange={(e) => updateField('sfxVolume', parseFloat(e.target.value))}
              className="w-full accent-red-700"
            />
          </div>

          <div>
            <div className="mb-1.5 flex justify-between">
              <span>Độ nhạy xoay góc nhìn</span>
              <span className="font-mono-tabular text-red-400">
                {draft.mouseSensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.3}
              max={2.5}
              step={0.1}
              value={draft.mouseSensitivity}
              onChange={(e) => updateField('mouseSensitivity', parseFloat(e.target.value))}
              className="w-full accent-red-700"
            />
          </div>

          <div>
            <div className="mb-2">Chất lượng đồ họa</div>
            <div className="grid grid-cols-3 gap-2">
              {qualities.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => updateField('quality', q)}
                  className={`cursor-pointer border py-2 text-xs font-semibold transition-colors ${
                    draft.quality === q
                      ? 'border-red-700 bg-red-950/60 text-red-100'
                      : 'border-white/10 bg-[#14141b] text-[#9c968d] hover:text-white'
                  }`}
                >
                  {GAME_CONFIG.QUALITY_PRESETS[q].label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between border border-white/10 bg-[#14141b] px-4 py-3">
            <span>Giảm chớp sáng và rung màn hình</span>
            <input
              type="checkbox"
              checked={draft.reduceFlash}
              onChange={(e) => updateField('reduceFlash', e.target.checked)}
              className="h-4 w-4 accent-red-700"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between border border-white/10 bg-[#14141b] px-4 py-3">
            <span>Hiển thị phụ đề âm thanh</span>
            <input
              type="checkbox"
              checked={draft.showSubtitles}
              onChange={(e) => updateField('showSubtitles', e.target.checked)}
              className="h-4 w-4 accent-red-700"
            />
          </label>

          <div className="border-t border-white/10 pt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
                Đổi phím điều khiển (PC)
              </span>
              <button
                type="button"
                onClick={handleResetBindings}
                className="flex cursor-pointer items-center gap-1 text-xs text-[#9b958c] transition-colors hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Mặc định</span>
              </button>
            </div>
            <div className="divide-y divide-white/5 border border-white/10 bg-[#121218]">
              {KEY_ACTIONS.map((action) => {
                const isListening = listeningAction === action;
                return (
                  <div
                    key={action}
                    className="flex items-center justify-between px-3.5 py-2 text-xs"
                  >
                    <span className="text-[#cfc9bf]">{KEY_ACTION_LABELS[action]}</span>
                    <button
                      type="button"
                      onClick={() => setListeningAction(isListening ? null : action)}
                      className={`font-mono-tabular min-w-[84px] cursor-pointer border px-2.5 py-1 text-center transition-colors ${
                        isListening
                          ? 'border-red-600 bg-red-950/70 text-red-200'
                          : 'border-white/15 bg-[#181820] text-[#ece7df] hover:border-red-800'
                      }`}
                    >
                      {isListening ? 'Nhấn phím...' : formatKeyCode(draft.keyBindings[action])}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full cursor-pointer bg-red-900 py-2.5 text-sm font-semibold text-red-50 transition-colors hover:bg-red-800"
        >
          Xong
        </button>
      </div>
    </div>
  );
};
