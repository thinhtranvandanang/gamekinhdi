import React, { useCallback, useEffect, useState } from 'react';
import { Delete, KeyRound, X } from 'lucide-react';
import { KeypadTarget } from '../types';

interface KeypadModalProps {
  target: KeypadTarget;
  onSubmit: (code: string) => { ok: boolean; message: string };
  onClose: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const KeypadModal: React.FC<KeypadModalProps> = ({ target, onSubmit, onClose }) => {
  const [digits, setDigits] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const title =
    target === 'study_drawer'
      ? 'Khóa mã ngăn kéo bàn làm việc'
      : 'Khóa điện từ cửa chính';

  const subtitle =
    target === 'study_drawer'
      ? 'Nhập mật mã 4 chữ số (Gợi ý trong Phòng khách / Nhật ký ông Hạ).'
      : 'Nhập mật mã 4 chữ số: số nhà cũ và ngày sinh của Mai.';

  const pushDigit = useCallback((d: string) => {
    setErrorMsg(null);
    setDigits((prev) => (prev.length < 4 ? prev + d : prev));
  }, []);

  const handleBackspace = useCallback(() => {
    setErrorMsg(null);
    setDigits((prev) => prev.slice(0, -1));
  }, []);

  const handleConfirm = useCallback(() => {
    if (digits.length < 4) {
      setErrorMsg('Hãy nhập đủ 4 chữ số.');
      return;
    }
    const res = onSubmit(digits);
    if (!res.ok) {
      setErrorMsg(res.message);
      setDigits('');
    }
  }, [digits, onSubmit]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        pushDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pushDigit, handleBackspace, handleConfirm, onClose]);

  return (
    <div className="fixed inset-0 z-45 flex items-center justify-center bg-[#050508]/92 p-4">
      <div className="w-full max-w-sm border border-white/15 bg-[#0e0e14] p-5 text-[#eae4dc] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <KeyRound className="h-5 w-5 text-red-500" />
            <div>
              <h2 className="text-sm font-semibold text-white">{title}</h2>
              <p className="mt-0.5 text-xs text-[#9b958c]">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bàn phím"
            className="flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center border border-white/15 bg-[#15151e] text-[#c7c1b7] hover:border-red-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Màn hình 4 số */}
        <div className="my-4 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="font-mono-tabular flex h-14 items-center justify-center border border-white/15 bg-[#07070a] text-2xl font-bold text-red-400"
            >
              {digits[idx] ?? '·'}
            </div>
          ))}
        </div>

        {errorMsg && (
          <div className="mb-3 border border-red-900/70 bg-red-950/45 px-3 py-2 text-xs text-red-100">
            {errorMsg}
          </div>
        )}

        {/* Bàn phím 0-9 */}
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => pushDigit(k)}
              className="font-mono-tabular flex h-12 cursor-pointer items-center justify-center border border-white/15 bg-[#16161f] text-lg font-semibold text-white transition-colors hover:border-red-700 hover:bg-[#1e1e29]"
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Xóa số"
            className="flex h-12 cursor-pointer items-center justify-center border border-white/15 bg-[#16161f] text-xs font-medium text-[#cfc9bf] transition-colors hover:border-red-700 hover:text-white"
          >
            <Delete className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => pushDigit('0')}
            className="font-mono-tabular flex h-12 cursor-pointer items-center justify-center border border-white/15 bg-[#16161f] text-lg font-semibold text-white transition-colors hover:border-red-700 hover:bg-[#1e1e29]"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex h-12 cursor-pointer items-center justify-center border border-red-800/80 bg-red-950/80 text-xs font-semibold text-white transition-colors hover:bg-red-900"
          >
            Mở khóa
          </button>
        </div>
      </div>
    </div>
  );
};
