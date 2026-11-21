import React from 'react';

interface PauseMenuProps {
  onResume: () => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onReturnMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onOpenSettings,
  onOpenGuide,
  onReturnMenu,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050507]/85 p-6 safe-pad">
      <div className="w-full max-w-sm border border-white/10 bg-[#0d0d12] p-8 shadow-2xl">
        <h2 className="font-display mb-6 text-center text-3xl font-bold text-[#ece7df]">
          Tạm dừng
        </h2>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="cursor-pointer bg-red-900 px-5 py-3 text-sm font-semibold text-red-50 transition-colors hover:bg-red-800"
          >
            Tiếp tục
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="cursor-pointer border border-white/15 bg-[#14141b] px-5 py-3 text-sm font-medium text-[#d6d0c6] transition-colors hover:border-red-900/70 hover:text-white"
          >
            Cài đặt
          </button>

          <button
            type="button"
            onClick={onOpenGuide}
            className="cursor-pointer border border-white/15 bg-[#14141b] px-5 py-3 text-sm font-medium text-[#d6d0c6] transition-colors hover:border-red-900/70 hover:text-white"
          >
            Hướng dẫn
          </button>

          <button
            type="button"
            onClick={onReturnMenu}
            className="mt-2 cursor-pointer border border-white/10 bg-[#0a0a0e] px-5 py-3 text-sm font-medium text-[#9c968d] transition-colors hover:border-red-950 hover:text-red-300"
          >
            Về menu chính
          </button>
        </div>
      </div>
    </div>
  );
};
