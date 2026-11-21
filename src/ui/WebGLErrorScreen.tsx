import React from 'react';
import { MonitorX } from 'lucide-react';

export const WebGLErrorScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050507] p-6 safe-pad">
      <div className="w-full max-w-md border border-red-950 bg-[#0d0d12] p-8 text-center">
        <MonitorX className="mx-auto mb-4 h-10 w-10 text-red-500" />
        <h1 className="font-display mb-3 text-2xl font-bold text-[#ece7df]">
          Trình duyệt chưa hỗ trợ WebGL
        </h1>
        <p className="mb-5 text-sm leading-relaxed text-[#a8a299]">
          Trò chơi cần đồ họa 3D WebGL để hiển thị căn nhà. Thiết bị hoặc trình duyệt hiện tại của
          bạn đang tắt hoặc không hỗ trợ WebGL.
        </p>
        <div className="border border-white/10 bg-[#14141b] p-4 text-left text-xs leading-relaxed text-[#c7c1b7]">
          <p className="mb-1.5 font-semibold text-white">Cách khắc phục:</p>
          <p>1. Cập nhật Chrome, Edge, Firefox hoặc Safari lên phiên bản mới nhất.</p>
          <p>2. Bật tùy chọn “Tăng tốc phần cứng” (Hardware Acceleration) trong cài đặt trình duyệt.</p>
        </div>
      </div>
    </div>
  );
};
