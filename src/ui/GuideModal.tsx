import React from 'react';
import { X } from 'lucide-react';
import { DEFAULT_KEY_BINDINGS } from '../config';
import { formatKeyCode } from '../input/Input';
import { KeyBindings } from '../types';

interface GuideModalProps {
  keyBindings?: KeyBindings;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ keyBindings = DEFAULT_KEY_BINDINGS, onClose }) => {
  const f = (k: keyof KeyBindings) => formatKeyCode(keyBindings[k]);
  const pcControls = [
    [`${f('moveForward')} / ${f('moveLeft')} / ${f('moveBackward')} / ${f('moveRight')}`, 'Di chuyển'],
    ['Chuột (nhấp màn hình)', 'Xoay góc nhìn'],
    [f('sprint'), 'Chạy nhanh (tiêu hao thể lực)'],
    [`${f('crouch')} hoặc Ctrl`, 'Cúi thấp (giảm tiếng bước chân)'],
    [f('flashlight'), 'Bật / Tắt đèn pin'],
    [f('interact'), 'Tương tác vật phẩm, cửa, chỗ trốn'],
    [f('holdBreath'), 'Giữ hơi thở khi đang trốn'],
    [`Tab hoặc ${f('inventory')} / ${f('journal')}`, 'Mở túi đồ / Nhật ký'],
    ['Esc', 'Tạm dừng'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050507]/85 p-4 safe-pad">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-white/10 bg-[#0d0d12] p-6 md:p-8 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="font-display text-2xl font-bold text-[#ece7df]">Hướng dẫn sinh tồn</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hướng dẫn"
            className="cursor-pointer p-2 text-[#9b958c] transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 text-sm text-[#c7c1b7]">
          <div>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-red-400">
              Điều khiển trên máy tính (PC)
            </h3>
            <div className="divide-y divide-white/5 border border-white/10 bg-[#121218]">
              {pcControls.map(([key, action]) => (
                <div key={key} className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-mono-tabular text-xs font-medium text-[#ece7df]">{key}</span>
                  <span className="text-xs text-[#9e988e]">{action}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-400">
              Điều khiển cảm ứng (Điện thoại / Máy tính bảng)
            </h3>
            <p className="leading-relaxed text-[#a8a299]">
              Kéo cần điều khiển bên trái để đi lại (đẩy hết cỡ ra viền sẽ tự chạy nhanh). Vuốt vùng
              bên phải màn hình để xoay góc nhìn. Các nút hành động nằm ở góc phải màn hình.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-400">
              Lưu ý quan trọng
            </h3>
            <p className="leading-relaxed text-[#a8a299]">
              Bạn không có vũ khí. Hãy tiết kiệm pin đèn, lắng nghe tiếng bước chân trên sàn gỗ,
              gạch và bê tông, và quay lại phòng ngủ khi cần nơi an toàn để lấy lại bình tĩnh.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full cursor-pointer bg-red-900 py-2.5 text-sm font-semibold text-red-50 transition-colors hover:bg-red-800"
        >
          Đã rõ
        </button>
      </div>
    </div>
  );
};
