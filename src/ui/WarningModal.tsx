import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface WarningModalProps {
  initialReduceFlash: boolean;
  onConfirm: (reduceFlash: boolean) => void;
}

export const WarningModal: React.FC<WarningModalProps> = ({
  initialReduceFlash,
  onConfirm,
}) => {
  const [reduceFlash, setReduceFlash] = useState(initialReduceFlash);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050507]/95 p-6 safe-pad">
      <div className="w-full max-w-lg border border-red-950/70 bg-[#0d0d12] p-8 shadow-2xl">
        <div className="mb-5 flex items-center gap-3 text-red-500">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <h1 className="font-display text-2xl font-bold tracking-wide text-[#ece7df]">
            Cảnh báo nội dung (16+)
          </h1>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-[#b9b3aa]">
          Trò chơi có không khí u ám, căng thẳng tâm lý, âm thanh đột ngột và hiệu ứng ánh sáng
          chập chờn trong môi trường tối. Không phù hợp với người nhạy cảm với ánh sáng nhấp nháy
          hoặc người dưới 16 tuổi.
        </p>

        <p className="mb-6 text-sm leading-relaxed text-[#8f8a82]">
          Khuyến nghị sử dụng tai nghe ở mức âm lượng vừa phải để cảm nhận âm thanh không gian tốt
          nhất.
        </p>

        <label className="mb-7 flex cursor-pointer items-center gap-3 border border-white/10 bg-[#14141b] px-4 py-3 text-sm text-[#ddd7cf] transition-colors hover:border-red-900/60">
          <input
            type="checkbox"
            checked={reduceFlash}
            onChange={(e) => setReduceFlash(e.target.checked)}
            className="h-4 w-4 accent-red-700"
          />
          <span>Giảm chớp sáng và rung màn hình</span>
        </label>

        <button
          type="button"
          onClick={() => onConfirm(reduceFlash)}
          className="w-full cursor-pointer bg-red-900 px-6 py-3 text-sm font-semibold text-red-50 transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-red-500"
        >
          Tôi đã hiểu, tiếp tục
        </button>
      </div>
    </div>
  );
};
