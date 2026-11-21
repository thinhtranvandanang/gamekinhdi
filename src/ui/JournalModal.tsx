import React, { useEffect, useState } from 'react';
import { ArrowLeft, Backpack, BookOpen, Lock, X } from 'lucide-react';
import { ALL_DOCUMENTS, DOCUMENTS, SIDE_DOCUMENTS } from '../inventory/documentData';
import { DocumentDef } from '../types';

interface JournalModalProps {
  readDocumentIds: string[];
  initialDocId: string | null;
  onOpenInventory: () => void;
  onClose: () => void;
}

export const JournalModal: React.FC<JournalModalProps> = ({
  readDocumentIds,
  initialDocId,
  onOpenInventory,
  onClose,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(initialDocId);

  useEffect(() => {
    setSelectedDocId(initialDocId);
  }, [initialDocId]);

  const readSet = new Set(readDocumentIds);
  const coreReadCount = DOCUMENTS.filter((d) => readSet.has(d.id)).length;
  const sideReadCount = SIDE_DOCUMENTS.filter((d) => readSet.has(d.id)).length;
  const selectedDoc: DocumentDef | undefined = selectedDocId
    ? ALL_DOCUMENTS.find((d) => d.id === selectedDocId)
    : undefined;

  // Khi mở trực tiếp một tài liệu vừa nhặt: hiển thị toàn màn hình để đọc dễ dàng
  if (selectedDoc && readSet.has(selectedDoc.id)) {
    return (
      <div className="fixed inset-0 z-45 flex flex-col justify-between bg-[#07070a]/96 p-5 text-[#e6dfd4] md:p-10">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs text-red-400">
            <BookOpen className="h-4 w-4" />
            <span>
              {selectedDoc.isSideNote ? 'Ghi chú phụ · ' : ''}
              {selectedDoc.locationLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDocId(null)}
              className="flex min-h-[40px] cursor-pointer items-center gap-1.5 border border-white/15 bg-[#121218] px-3 py-1.5 text-xs text-[#d6cfc4] transition-colors hover:border-white/40"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Danh sách ({coreReadCount}/{DOCUMENTS.length})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[40px] cursor-pointer items-center gap-1.5 border border-red-800/70 bg-red-950/70 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-900/80"
            >
              <X className="h-3.5 w-3.5" />
              <span>Đóng</span>
            </button>
          </div>
        </div>

        <article className="mx-auto my-auto w-full max-w-2xl border border-white/15 bg-[#100f14] p-6 shadow-2xl md:p-9">
          <h2 className="text-xl font-bold tracking-wide text-white md:text-2xl">
            {selectedDoc.title}
          </h2>
          <div className="my-4 h-px w-full bg-red-900/40" />
          <p className="text-sm leading-7 whitespace-pre-line text-[#dad3c7] md:text-base md:leading-8">
            {selectedDoc.content}
          </p>
        </article>

        <div className="mx-auto w-full max-w-2xl text-center text-xs text-[#817b72]">
          Thời gian trong game đang tạm dừng · Nhấn J hoặc Esc để quay lại
        </div>
      </div>
    );
  }

  const renderDocButton = (doc: DocumentDef, prefix: string) => {
    const unlocked = readSet.has(doc.id);
    return (
      <button
        key={doc.id}
        type="button"
        disabled={!unlocked}
        onClick={() => unlocked && setSelectedDocId(doc.id)}
        className={`flex min-h-[48px] w-full items-center justify-between border px-3.5 py-2 text-left transition-colors ${
          unlocked
            ? 'cursor-pointer border-white/15 bg-[#13131b] hover:border-red-700'
            : 'cursor-not-allowed border-white/5 bg-[#09090d] text-[#555049]'
        }`}
      >
        <div>
          <div className="text-xs font-medium">
            <span className="font-mono-tabular mr-2 text-[#857f76]">{prefix}</span>
            {unlocked ? doc.title : 'Chưa tìm thấy tài liệu'}
          </div>
          <div className="mt-0.5 text-[11px] text-[#7c766d]">{doc.locationLabel}</div>
        </div>
        {!unlocked && <Lock className="h-3.5 w-3.5 shrink-0 text-[#4c4740]" />}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050508]/92 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col border border-white/15 bg-[#0c0c11] text-[#e7e2da] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-red-500" />
            <div>
              <h2 className="text-base font-semibold tracking-wide text-white">
                Nhật ký tài liệu
              </h2>
              <p className="font-mono-tabular text-xs text-[#918b82]">
                Tài liệu chính: {coreReadCount}/{DOCUMENTS.length} · Ghi chú phụ: {sideReadCount}/
                {SIDE_DOCUMENTS.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenInventory}
              className="flex min-h-[40px] cursor-pointer items-center gap-2 border border-white/15 bg-[#15151d] px-3.5 py-2 text-xs font-medium text-[#dfd9cf] transition-colors hover:border-red-800 hover:text-white"
            >
              <Backpack className="h-4 w-4 text-red-400" />
              <span>Túi đồ (Tab)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng nhật ký"
              className="flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center border border-white/15 bg-[#15151d] px-3 py-2 text-xs text-[#d0cac0] transition-colors hover:border-red-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-red-400">
                Tài liệu cốt truyện ({coreReadCount}/{DOCUMENTS.length})
              </div>
              {DOCUMENTS.map((doc, idx) =>
                renderDocButton(doc, `${String(idx + 1).padStart(2, '0')}.`),
              )}
            </div>

            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9b958c]">
                Ghi chú phụ mở rộng ({sideReadCount}/{SIDE_DOCUMENTS.length})
              </div>
              {SIDE_DOCUMENTS.map((doc, idx) => renderDocButton(doc, `P${idx + 1}.`))}
            </div>
          </div>

          <div className="flex flex-col justify-center border border-white/10 bg-[#08080c] p-5 text-center text-xs text-[#817b72]">
            <p className="leading-relaxed">
              Chọn một tài liệu đã thu thập bên trái để mở đọc toàn màn hình.
            </p>
            <p className="mt-2 text-[11px] text-[#666058]">
              Thời gian trong game dừng lại khi bạn đọc nhật ký. Nhấn J hoặc Esc để đóng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
