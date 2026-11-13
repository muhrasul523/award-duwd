import { useEffect } from 'react';
import { ExternalLink, FileText, Video, Link2, X } from 'lucide-react';
import type { MaterialType } from '../shared/types';

interface MaterialPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityName: string;
  materialType: MaterialType;
  materialUrl: string;
  uploadedFileName?: string;
}

export function MaterialPreviewModal({
  isOpen,
  onClose,
  title,
  entityName,
  materialType,
  materialUrl,
  uploadedFileName,
}: MaterialPreviewModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLocalUpload = materialUrl.startsWith('/uploads/');
  const lowerUrl = materialUrl.toLowerCase();
  const isPdf = lowerUrl.endsWith('.pdf');
  const isImage = /\.(png|jpe?g|webp|gif)$/i.test(lowerUrl);
  const isVideoFile = /\.(mp4|webm|mov)$/i.test(lowerUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07525E]/35 backdrop-blur-md p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div
        className="glass-panel-strong w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200/70">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-[#0C7A89]">
              {materialType === 'PDF/PPT' && <FileText className="w-3.5 h-3.5 shrink-0" />}
              {materialType === 'Video' && <Video className="w-3.5 h-3.5 shrink-0" />}
              {materialType === 'Link' && <Link2 className="w-3.5 h-3.5 shrink-0" />}
              <span>{materialType}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate text-slate-500">{entityName}</span>
            </div>
            <h3
              id="preview-modal-title"
              className="mt-1 text-lg font-bold text-[#07525E] leading-snug"
            >
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={materialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0C7A89] to-[#07525E] hover:brightness-110 transition whitespace-nowrap shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Tautan Asli</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-900/5 transition"
              aria-label="Tutup pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/70">
          {isLocalUpload && isPdf && (
            <iframe
              src={materialUrl}
              title={title}
              className="w-full h-[65vh] rounded-2xl border border-slate-200 bg-white"
            />
          )}

          {isLocalUpload && isImage && (
            <div className="flex items-center justify-center bg-white rounded-2xl p-4 border border-slate-200">
              <img
                src={materialUrl}
                alt={title}
                referrerPolicy="no-referrer"
                className="max-h-[62vh] rounded-xl object-contain"
              />
            </div>
          )}

          {isLocalUpload && isVideoFile && (
            <video
              src={materialUrl}
              controls
              className="w-full max-h-[62vh] rounded-2xl bg-black"
            />
          )}

          {(!isLocalUpload || (!isPdf && !isImage && !isVideoFile)) && (
            <div className="bg-white/90 rounded-2xl border border-slate-200/80 p-8 text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-[#0C7A89]/10 text-[#0C7A89]">
                {materialType === 'Video' ? (
                  <Video className="w-6 h-6" />
                ) : materialType === 'PDF/PPT' ? (
                  <FileText className="w-6 h-6" />
                ) : (
                  <Link2 className="w-6 h-6" />
                )}
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">
                {uploadedFileName || 'Tautan Eksternal Bahan Presentasi'}
              </p>
              <p className="mt-1.5 text-xs text-slate-500 break-all max-w-xl mx-auto">
                {materialUrl}
              </p>
              <div className="mt-6">
                <a
                  href={materialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#0C7A89] to-[#07525E] hover:brightness-110 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka Bahan di Tab Baru</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
