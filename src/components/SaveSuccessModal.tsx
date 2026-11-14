import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Award, CheckCircle2, FileCheck2, Sparkles, X } from 'lucide-react';

export interface SaveSuccessDetailItem {
  label: string;
  value: string;
}

export interface SaveSuccessPayload {
  variant: 'participant' | 'score';
  title: string;
  subtitle: string;
  highlightLabel?: string;
  highlightValue?: string;
  details: SaveSuccessDetailItem[];
  savedAt: string;
  nextActionLabel?: string;
}

interface SaveSuccessModalProps {
  payload: SaveSuccessPayload | null;
  onClose: () => void;
  onNextAction?: () => void;
}

export function SaveSuccessModal({
  payload,
  onClose,
  onNextAction,
}: SaveSuccessModalProps) {
  useEffect(() => {
    if (!payload) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [payload, onClose]);

  const isScore = payload?.variant === 'score';

  return (
    <AnimatePresence>
      {payload && (
        <motion.div
          key="save-success-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#07525E]/40 backdrop-blur-md p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-success-title"
        >
          <motion.div
            key="save-success-card"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel-strong w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/25"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top celebration bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-[#0C7A89] to-[#D88B15]" />

            <div className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-[#0C7A89] text-white flex items-center justify-center shadow-md shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#D88B15] text-white flex items-center justify-center shadow-xs">
                      {isScore ? (
                        <Award className="w-3 h-3" />
                      ) : (
                        <FileCheck2 className="w-3 h-3" />
                      )}
                    </span>
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      <Sparkles className="w-3 h-3 text-[#D88B15]" />
                      <span>Tersimpan Permanen</span>
                    </div>
                    <h3
                      id="save-success-title"
                      className="text-base sm:text-lg font-extrabold text-[#07525E] leading-snug mt-0.5"
                    >
                      {payload.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-900/5 transition shrink-0"
                  aria-label="Tutup notifikasi berhasil"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                {payload.subtitle}
              </p>

              {/* Highlight Box (e.g. Weighted Score or Category) */}
              {payload.highlightLabel && payload.highlightValue && (
                <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#07525E] via-[#096472] to-[#0C7A89] text-white px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm">
                  <span className="text-xs font-medium text-white/85">
                    {payload.highlightLabel}
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-amber-300">
                    {payload.highlightValue}
                  </span>
                </div>
              )}

              {/* Structured Summary Details */}
              {payload.details.length > 0 && (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50/70 via-white/90 to-[#F2F9FA]/80 p-3.5 space-y-2">
                  {payload.details.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-start justify-between gap-3 text-xs"
                    >
                      <span className="text-slate-500 font-medium shrink-0">
                        {item.label}
                      </span>
                      <span className="text-slate-900 font-bold text-right break-words">
                        {item.value}
                      </span>
                    </div>
                  ))}
                  <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                    <span>Waktu Simpan</span>
                    <span className="font-mono tabular-nums font-semibold text-[#07525E]">
                      {payload.savedAt}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
                {payload.nextActionLabel && onNextAction && (
                  <button
                    type="button"
                    onClick={onNextAction}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#07525E] bg-[#0C7A89]/10 border border-[#0C7A89]/25 hover:bg-[#0C7A89]/20 transition"
                  >
                    <span>{payload.nextActionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-[#0C7A89] to-[#07525E] hover:brightness-110 transition shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>OK, Mengerti</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
