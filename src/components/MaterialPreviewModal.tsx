import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Link2, Loader2, Video, X } from 'lucide-react';
import type { MaterialItem } from '../shared/types';

interface MaterialPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityName: string;
  materials: MaterialItem[];
  initialMaterialId?: string;
}

function getEmbedUrl(url: string): string | null {
  try {
    const trimmed = url.trim();
    const ytMatch = trimmed.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/
    );
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
  } catch {
    return null;
  }
  return null;
}

export function MaterialPreviewModal({
  isOpen,
  onClose,
  title,
  entityName,
  materials,
  initialMaterialId,
}: MaterialPreviewModalProps) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [isMediaLoading, setIsMediaLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialMaterialId && materials.some((m) => m.id === initialMaterialId)) {
      setSelectedId(initialMaterialId);
    } else if (materials.length > 0) {
      setSelectedId(materials[0].id);
    } else {
      setSelectedId('');
    }
  }, [isOpen, initialMaterialId, materials]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const activeMaterial =
    materials.find((m) => m.id === selectedId) ?? materials[0] ?? null;

  useEffect(() => {
    if (isOpen && activeMaterial) {
      const lowerUrl = activeMaterial.url.toLowerCase();
      const isLocalUpload = activeMaterial.url.startsWith('/uploads/');
      const embedUrl = getEmbedUrl(activeMaterial.url);
      const hasInlineMedia =
        Boolean(embedUrl) ||
        (isLocalUpload &&
          (lowerUrl.endsWith('.pdf') ||
            /\.(png|jpe?g|webp|gif|mp4|webm|mov)$/i.test(lowerUrl)));
      setIsMediaLoading(hasInlineMedia);
    }
  }, [isOpen, activeMaterial]);

  if (!isOpen || !activeMaterial) return null;

  const isLocalUpload = activeMaterial.url.startsWith('/uploads/');
  const lowerUrl = activeMaterial.url.toLowerCase();
  const isPdf = lowerUrl.endsWith('.pdf');
  const isImage = /\.(png|jpe?g|webp|gif)$/i.test(lowerUrl);
  const isVideoFile = /\.(mp4|webm|mov)$/i.test(lowerUrl);
  const embedUrl = getEmbedUrl(activeMaterial.url);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07525E]/40 backdrop-blur-md p-2.5 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div
        className="glass-panel-strong w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200/70 bg-gradient-to-r from-[#07525E]/[0.05] via-white/50 to-[#D88B15]/[0.05] flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-[#0C7A89]">
              {activeMaterial.type === 'PDF/PPT' && <FileText className="w-3.5 h-3.5 shrink-0" />}
              {activeMaterial.type === 'Video' && <Video className="w-3.5 h-3.5 shrink-0" />}
              {activeMaterial.type === 'Link' && <Link2 className="w-3.5 h-3.5 shrink-0" />}
              <span>{activeMaterial.type}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate text-slate-600">{entityName}</span>
            </div>
            <h3
              id="preview-modal-title"
              className="mt-1 text-base sm:text-lg font-bold text-[#07525E] leading-snug break-words"
            >
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={activeMaterial.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0C7A89] to-[#07525E] hover:brightness-110 transition whitespace-nowrap shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buka Tautan Asli</span>
              <span className="sm:hidden">Buka</span>
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

        {/* Multi-Material Switcher Strip */}
        {materials.length > 1 && (
          <div className="px-4 sm:px-6 py-2.5 border-b border-slate-200/70 bg-white/75 flex items-center gap-2 overflow-x-auto">
            {materials.map((mat, idx) => {
              const active = mat.id === activeMaterial.id;
              return (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => setSelectedId(mat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-gradient-to-r from-[#0C7A89] to-[#07525E] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {mat.type === 'PDF/PPT' && <FileText className="w-3.5 h-3.5" />}
                  {mat.type === 'Video' && <Video className="w-3.5 h-3.5" />}
                  {mat.type === 'Link' && <Link2 className="w-3.5 h-3.5" />}
                  <span className="max-w-[180px] truncate">
                    {idx + 1}. {mat.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="relative p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/75">
          {isMediaLoading && (
            <div className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold text-[#0C7A89]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memuat pratinjau bahan...</span>
            </div>
          )}

          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={activeMaterial.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setIsMediaLoading(false)}
              className="w-full h-[55vh] sm:h-[62vh] rounded-2xl border border-slate-200 bg-white"
            />
          ) : isLocalUpload && isPdf ? (
            <iframe
              src={activeMaterial.url}
              title={activeMaterial.title}
              onLoad={() => setIsMediaLoading(false)}
              className="w-full h-[55vh] sm:h-[62vh] rounded-2xl border border-slate-200 bg-white"
            />
          ) : isLocalUpload && isImage ? (
            <div className="flex items-center justify-center bg-white rounded-2xl p-4 border border-slate-200">
              <img
                src={activeMaterial.url}
                alt={activeMaterial.title}
                referrerPolicy="no-referrer"
                onLoad={() => setIsMediaLoading(false)}
                className="max-h-[60vh] rounded-xl object-contain"
              />
            </div>
          ) : isLocalUpload && isVideoFile ? (
            <video
              src={activeMaterial.url}
              controls
              onLoadedData={() => setIsMediaLoading(false)}
              className="w-full max-h-[60vh] rounded-2xl bg-black"
            />
          ) : (
            <div className="bg-white/95 rounded-2xl border border-slate-200/80 p-6 sm:p-8 text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-gradient-to-br from-[#0C7A89]/15 to-[#D88B15]/10 text-[#0C7A89]">
                {activeMaterial.type === 'Video' ? (
                  <Video className="w-6 h-6" />
                ) : activeMaterial.type === 'PDF/PPT' ? (
                  <FileText className="w-6 h-6" />
                ) : (
                  <Link2 className="w-6 h-6" />
                )}
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900 break-words">
                {activeMaterial.uploadedFileName || activeMaterial.title || 'Tautan Bahan Presentasi'}
              </p>
              <p className="mt-1.5 text-xs text-slate-500 break-all max-w-xl mx-auto">
                {activeMaterial.url}
              </p>
              <div className="mt-6">
                <a
                  href={activeMaterial.url}
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
