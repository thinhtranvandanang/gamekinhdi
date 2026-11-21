import React from 'react';
import { ENDING_METADATA } from '../config';
import { EndingId, EndingSummary } from '../types';

interface EndingScreenProps {
  summary: EndingSummary;
  onPlayAgain: () => void;
  onReturnMenu: () => void;
}

const ENDING_ORDER: EndingId[] = [EndingId.A, EndingId.B, EndingId.C, EndingId.D, EndingId.E];

export const EndingScreen: React.FC<EndingScreenProps> = ({
  summary,
  onPlayAgain,
  onReturnMenu,
}) => {
  const mins = Math.floor(summary.playTimeSeconds / 60);
  const secs = Math.floor(summary.playTimeSeconds % 60);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050507]/95 p-4 sm:p-6 safe-pad">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto border border-red-950/70 bg-[#0d0d12] p-6 sm:p-8 shadow-2xl">
        <p className="mb-2 text-xs uppercase tracking-widest text-red-500">
          {summary.subtitle}
        </p>
        <h1 className="font-display mb-4 text-2xl font-bold text-[#f0ece4] sm:text-3xl md:text-4xl">
          {summary.title}
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-[#b9b3aa]">{summary.description}</p>

        <div className="mb-5 grid grid-cols-2 gap-3 border border-white/10 bg-[#131319] p-4 text-xs md:grid-cols-4">
          <div>
            <div className="text-[#8a847b]">Thời gian chơi</div>
            <div className="mt-1 font-mono-tabular text-sm font-semibold text-white">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
          </div>
          <div>
            <div className="text-[#8a847b]">Tài liệu</div>
            <div className="mt-1 font-mono-tabular text-sm font-semibold text-white">
              {summary.documentsFound}/{summary.totalDocuments}
            </div>
          </div>
          <div>
            <div className="text-[#8a847b]">Số lần bị bắt</div>
            <div className="mt-1 font-mono-tabular text-sm font-semibold text-white">
              {summary.caughtCount}
            </div>
          </div>
          <div>
            <div className="text-[#8a847b]">Kết thúc đã mở</div>
            <div className="mt-1 font-mono-tabular text-sm font-semibold text-red-400">
              {summary.unlockedEndings.length}/5
            </div>
          </div>
        </div>

        {/* Danh sách 5 kết thúc đã mở khóa */}
        <div className="mb-5 grid grid-cols-5 gap-1.5 text-center text-[11px]">
          {ENDING_ORDER.map((id) => {
            const unlocked = summary.unlockedEndings.includes(id);
            const isCurrent = summary.endingId === id;
            const shortTitle = ENDING_METADATA[id].title.split(':')[1]?.trim() ?? id;
            return (
              <div
                key={id}
                className={`border px-1.5 py-2 ${
                  isCurrent
                    ? 'border-red-600 bg-red-950/60 text-red-100'
                    : unlocked
                      ? 'border-white/20 bg-[#14141c] text-[#dcd6cc]'
                      : 'border-white/5 bg-[#09090d] text-[#555049]'
                }`}
              >
                <div className="font-mono-tabular font-bold">{id}</div>
                <div className="mt-0.5 truncate text-[10px]">
                  {unlocked ? shortTitle : 'Chưa mở'}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mb-6 border border-white/10 bg-[#111116] px-4 py-3 text-xs text-[#a8a299]">
          Gợi ý: {summary.nextEndingHint}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 cursor-pointer bg-red-900 px-5 py-3 text-sm font-semibold text-red-50 transition-colors hover:bg-red-800"
          >
            Chơi lại
          </button>
          <button
            type="button"
            onClick={onReturnMenu}
            className="flex-1 cursor-pointer border border-white/15 bg-[#14141b] px-5 py-3 text-sm font-medium text-[#d6d0c6] transition-colors hover:border-red-900/70 hover:text-white"
          >
            Về menu
          </button>
        </div>
      </div>
    </div>
  );
};
