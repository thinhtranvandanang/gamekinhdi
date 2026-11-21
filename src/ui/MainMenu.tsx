import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { ENDING_METADATA } from '../config';
import { EndingId } from '../types';

interface MainMenuProps {
  hasSave: boolean;
  saveError: string | null;
  storageBlocked: boolean;
  isMuted: boolean;
  unlockedEndings: EndingId[];
  onStartNew: () => void;
  onContinue: () => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onOpenStats: () => void;
  onToggleMute: () => void;
}

const ENDING_ORDER: EndingId[] = [EndingId.A, EndingId.B, EndingId.C, EndingId.D, EndingId.E];

export const MainMenu: React.FC<MainMenuProps> = ({
  hasSave,
  saveError,
  storageBlocked,
  isMuted,
  unlockedEndings,
  onStartNew,
  onContinue,
  onOpenSettings,
  onOpenGuide,
  onOpenStats,
  onToggleMute,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between overflow-y-auto bg-gradient-to-r from-[#050507]/95 via-[#07070b]/80 to-[#050507]/45 p-5 sm:p-6 md:p-14 safe-pad">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs tracking-widest text-[#8f8980]">
          Kinh dị sinh tồn · Góc nhìn thứ nhất · 16+
        </span>
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          className="flex cursor-pointer items-center gap-2 border border-white/10 bg-[#0d0d12] px-3.5 py-2 text-xs text-[#cfc9bf] transition-colors hover:border-red-900/70 hover:text-white"
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-red-500" /> : <Volume2 className="h-4 w-4" />}
          <span>{isMuted ? 'Đang tắt tiếng' : 'Âm thanh: Bật'}</span>
        </button>
      </div>

      <div className="my-6 max-w-xl md:my-auto">
        <p className="mb-2 font-mono-tabular text-sm tracking-widest text-red-500">03:00 AM</p>
        <h1 className="font-display mb-4 text-3xl font-bold leading-tight text-[#f0ece4] sm:text-4xl md:mb-5 md:text-6xl text-balance">
          Căn Nhà Lúc 3 Giờ Sáng
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-[#a8a299] md:mb-8 md:text-base">
          Bạn tỉnh dậy giữa đêm trong căn nhà hoang, cửa chính bị khóa chặt và điện thoại mất sóng.
          Hãy dùng đèn pin, quan sát thật kỹ và tìm đường thoát ra trước khi trời sáng.
        </p>

        <div className="flex max-w-xs flex-col gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onStartNew}
            className="cursor-pointer bg-red-900 px-6 py-3 text-left text-sm font-semibold text-red-50 transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-red-500"
          >
            Bắt đầu
          </button>

          <button
            type="button"
            disabled={!hasSave}
            onClick={onContinue}
            className={`border px-6 py-3 text-left text-sm font-medium transition-colors ${
              hasSave
                ? 'cursor-pointer border-white/15 bg-[#111117] text-[#e6e1d8] hover:border-red-900/70 hover:bg-[#171217]'
                : 'cursor-not-allowed border-white/5 bg-[#0a0a0e] text-[#55524d]'
            }`}
          >
            Tiếp tục {hasSave ? '' : '(Chưa có bản lưu)'}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="cursor-pointer border border-white/15 bg-[#111117] px-6 py-3 text-left text-sm font-medium text-[#d6d0c6] transition-colors hover:border-red-900/70 hover:text-white"
          >
            Cài đặt
          </button>

          <button
            type="button"
            onClick={onOpenGuide}
            className="cursor-pointer border border-white/15 bg-[#111117] px-6 py-3 text-left text-sm font-medium text-[#d6d0c6] transition-colors hover:border-red-900/70 hover:text-white"
          >
            Hướng dẫn
          </button>

          <button
            type="button"
            onClick={onOpenStats}
            className="cursor-pointer border border-white/15 bg-[#111117] px-6 py-3 text-left text-sm font-medium text-[#d6d0c6] transition-colors hover:border-red-900/70 hover:text-white"
          >
            Thống kê & Thành tựu
          </button>
        </div>

        {(storageBlocked || saveError) && (
          <p className="mt-3 max-w-sm border border-amber-900/50 bg-amber-950/35 px-3 py-2 text-xs text-amber-200">
            {storageBlocked
              ? 'Trình duyệt đang chặn LocalStorage: tiến trình và cài đặt chỉ giữ trong phiên hiện tại.'
              : saveError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-[#78736c]">
        <span>
          Kết thúc đã mở:{' '}
          <strong className="font-mono-tabular text-[#c5bfb5]">
            {unlockedEndings.length}/5
          </strong>
        </span>
        <div className="flex items-center gap-1">
          {ENDING_ORDER.map((id) => {
            const unlocked = unlockedEndings.includes(id);
            return (
              <span
                key={id}
                title={unlocked ? ENDING_METADATA[id].title : `Kết thúc ${id} (Chưa mở)`}
                className={`font-mono-tabular border px-1.5 py-0.5 text-[10px] ${
                  unlocked
                    ? 'border-red-900/70 bg-red-950/50 text-red-200'
                    : 'border-white/10 bg-[#0b0b10] text-[#57524b]'
                }`}
              >
                {id}
              </span>
            );
          })}
        </div>
        <span aria-hidden="true">·</span>
        <span>3 tầng khám phá</span>
        <span aria-hidden="true">·</span>
        <span>Hỗ trợ PC và cảm ứng</span>
      </div>
    </div>
  );
};
