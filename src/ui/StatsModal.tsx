import React, { useState } from 'react';
import { Award, Lock, RotateCcw, Trophy, X } from 'lucide-react';
import { ACHIEVEMENT_METADATA } from '../config';
import { ALL_DOCUMENTS } from '../inventory/documentData';
import { AchievementId, PlayerStats } from '../types';

interface StatsModalProps {
  stats: PlayerStats;
  onResetStats: () => void;
  onClose: () => void;
}

const ACHIEVEMENT_ORDER: AchievementId[] = [
  'first_escape',
  'truth_seeker',
  'flash_stunner',
  'silent_breath',
  'collector_all',
  'cursed_curiosity',
];

function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}g ${String(m).padStart(2, '0')}p`;
  return `${m}p ${String(sec).padStart(2, '0')}g`;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  stats,
  onResetStats,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const unlockedCount = stats.unlockedAchievements.length;
  const totalAch = ACHIEVEMENT_ORDER.length;

  const statCards = [
    { label: 'Lượt chơi đã bắt đầu', value: String(stats.gamesStarted) },
    { label: 'Số lần thoát thân', value: String(stats.gamesEscaped) },
    {
      label: 'Thoát nhanh nhất',
      value:
        stats.fastestEscapeSeconds !== null ? formatDuration(stats.fastestEscapeSeconds) : '--',
    },
    { label: 'Tổng thời gian chơi', value: formatDuration(stats.totalPlaySeconds) },
    { label: 'Làm choáng Cái Bóng', value: String(stats.ghostStunsTotal) },
    { label: 'Nín thở qua kiểm tra', value: String(stats.hidesSurvivedTotal) },
    { label: 'Số lần bị bắt', value: String(stats.timesCaughtTotal) },
    {
      label: 'Tài liệu đã khám phá',
      value: `${stats.documentsReadEver.length}/${ALL_DOCUMENTS.length}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050507]/90 p-4 safe-pad">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-white/10 bg-[#0d0d12] text-[#e6e1d8] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-red-500" />
            <div>
              <h2 className="font-display text-xl font-bold text-[#f0ece4] md:text-2xl">
                Thống kê & Thành tựu
              </h2>
              <p className="font-mono-tabular text-xs text-[#9b958c]">
                Đã mở khóa {unlockedCount}/{totalAch} thành tựu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thống kê"
            className="cursor-pointer p-2 text-[#9b958c] transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-400">
              Số liệu sinh tồn tích lũy
            </h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="border border-white/10 bg-[#121218] px-3 py-2.5"
                >
                  <div className="font-mono-tabular text-lg font-semibold text-white">
                    {card.value}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-[#8f8980]">
                    {card.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-400">
              Thành tựu ({unlockedCount}/{totalAch})
            </h3>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {ACHIEVEMENT_ORDER.map((id) => {
                const unlocked = stats.unlockedAchievements.includes(id);
                const meta = ACHIEVEMENT_METADATA[id];
                return (
                  <div
                    key={id}
                    className={`flex items-start gap-3 border p-3.5 ${
                      unlocked
                        ? 'border-red-900/60 bg-red-950/20'
                        : 'border-white/5 bg-[#09090d] opacity-75'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border ${
                        unlocked
                          ? 'border-red-800/80 bg-red-950/60 text-red-300'
                          : 'border-white/10 bg-[#121218] text-[#5e5952]'
                      }`}
                    >
                      {unlocked ? <Award className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-semibold ${
                          unlocked ? 'text-[#f2ede4]' : 'text-[#7c766d]'
                        }`}
                      >
                        {meta.title}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#958f86]">
                        {meta.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex cursor-pointer items-center gap-1.5 border border-white/10 bg-[#14141b] px-3 py-2 text-xs text-[#9b958c] transition-colors hover:border-red-900/60 hover:text-red-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Đặt lại thống kê</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-300">Xác nhận xóa thống kê?</span>
              <button
                type="button"
                onClick={() => {
                  onResetStats();
                  setConfirmReset(false);
                }}
                className="cursor-pointer border border-red-800 bg-red-950/80 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-900"
              >
                Xóa
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="cursor-pointer border border-white/15 bg-[#14141b] px-3 py-1.5 text-xs text-[#cfc9bf] hover:text-white"
              >
                Hủy
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer bg-red-900 px-6 py-2 text-xs font-semibold text-red-50 transition-colors hover:bg-red-800"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
