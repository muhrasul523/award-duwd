import { useEffect, useState } from 'react';
import { Award, CheckCircle2, Info, MessageSquare, Scale, X } from 'lucide-react';
import type { LeaderboardEntry, MasterIndicator, MasterJudge } from '../shared/types';

interface ScoreDetailModalProps {
  entry: LeaderboardEntry | null;
  judges: MasterJudge[];
  indicators: MasterIndicator[];
  onClose: () => void;
}

type MatrixViewMode = 'raw' | 'weighted';

export function ScoreDetailModal({
  entry,
  judges,
  indicators,
  onClose,
}: ScoreDetailModalProps) {
  const [viewMode, setViewMode] = useState<MatrixViewMode>('raw');

  useEffect(() => {
    if (entry) {
      setViewMode('raw');
    }
  }, [entry]);

  useEffect(() => {
    if (!entry) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [entry, onClose]);

  if (!entry) return null;

  const sortedIndicators = [...indicators].sort((a, b) => a.order - b.order);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07525E]/40 backdrop-blur-md p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="score-modal-title"
    >
      <div
        className="glass-panel-strong w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200/70 bg-gradient-to-r from-[#07525E]/[0.04] via-white/40 to-[#D88B15]/[0.05] flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
              <span className="font-bold text-[#D88B15] inline-flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                Peringkat #{entry.rank}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#0C7A89]">{entry.participant.entityType}</span>
              <span aria-hidden="true">·</span>
              <span>{entry.participant.province}</span>
              <span aria-hidden="true">·</span>
              <span>
                Progress Juri: {entry.judgesScoredCount}/{entry.totalJudgesCount}
              </span>
            </div>
            <h2
              id="score-modal-title"
              className="mt-1.5 text-xl font-bold text-[#07525E] leading-snug"
            >
              {entry.participant.entityName}
            </h2>
            <p className="mt-0.5 text-sm font-medium text-slate-600">
              {entry.participant.innovationTitle}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-xs font-medium text-slate-500">Total Nilai Akhir</div>
              <div className="text-2xl font-extrabold text-[#07525E] font-mono tabular-nums">
                {entry.finalScore.toFixed(2)}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-900/5 transition"
              aria-label="Tutup modal rincian"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Tie-breaker banner if relevant */}
          {entry.tieBreakerNote && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-[#D88B15]/10 border border-[#D88B15]/25 text-xs text-slate-800">
              <Scale className="w-4 h-4 text-[#D88B15] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#9A5E06]">Catatan Tie-Breaker: </span>
                <span>{entry.tieBreakerNote}</span>
              </div>
            </div>
          )}

          {/* Toggle Mode Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#07525E]">
                Matriks Penilaian Per Juri &amp; Indikator
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {viewMode === 'raw'
                  ? 'Menampilkan nilai murni input juri pada skala 0–100 per indikator.'
                  : 'Menampilkan kontribusi nilai setelah dikalikan bobot masing-masing indikator (%).'}
              </p>
            </div>

            <div
              className="inline-flex items-center p-1 rounded-xl bg-slate-900/[0.06] border border-slate-200/70 self-start sm:self-auto"
              role="group"
              aria-label="Mode tampilan matriks nilai"
            >
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  viewMode === 'raw'
                    ? 'bg-white text-[#07525E] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nilai Asli Juri (0-100)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('weighted')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  viewMode === 'weighted'
                    ? 'bg-white text-[#07525E] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nilai Hasil Bobot (%)
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/85">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3.5 px-4">Indikator Penilaian</th>
                  <th className="py-3.5 px-3 text-right whitespace-nowrap">Bobot</th>
                  {judges.map((judge) => (
                    <th key={judge.id} className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div>{judge.label}</div>
                      <div className="text-[11px] font-normal text-slate-400 truncate max-w-[130px] ml-auto">
                        {judge.name.replace(/^Ust\.\s*/, '')}
                      </div>
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-right whitespace-nowrap bg-[#0C7A89]/[0.05] text-[#07525E]">
                    Rata-rata
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 text-sm">
                {sortedIndicators.map((ind) => {
                  const avgVal =
                    viewMode === 'raw'
                      ? entry.indicatorAveragesRaw[ind.id]
                      : entry.indicatorAveragesWeighted[ind.id];

                  return (
                    <tr key={ind.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {ind.order}. {ind.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {ind.description}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-[#D88B15]">
                        {ind.weight}%
                      </td>
                      {entry.judgeMatrix.map((cell) => {
                        const val =
                          viewMode === 'raw'
                            ? cell.rawScores[ind.id]
                            : cell.weightedScores[ind.id];
                        return (
                          <td
                            key={cell.judgeId}
                            className="py-3.5 px-4 text-right font-mono tabular-nums"
                          >
                            {cell.hasScored && val !== null ? (
                              <span className="font-semibold text-slate-900">
                                {val.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-xs font-sans text-slate-400">
                                Belum Dinilai
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-[#07525E] bg-[#0C7A89]/[0.04]">
                        {avgVal !== null ? avgVal.toFixed(2) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-[#07525E]/[0.04] font-semibold">
                  <td className="py-3.5 px-4 text-sm text-[#07525E]">
                    Total Nilai Terbobot per Juri
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs text-slate-500">
                    100%
                  </td>
                  {entry.judgeMatrix.map((cell) => (
                    <td
                      key={cell.judgeId}
                      className="py-3.5 px-4 text-right font-mono tabular-nums text-sm text-[#07525E]"
                    >
                      {cell.hasScored && cell.judgeTotalWeighted !== null
                        ? cell.judgeTotalWeighted.toFixed(2)
                        : '—'}
                    </td>
                  ))}
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-base font-extrabold text-[#07525E] bg-[#0C7A89]/10">
                    {entry.finalScore.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Info formula strip */}
          <div className="flex items-start gap-2.5 text-xs text-slate-500 px-1">
            <Info className="w-4 h-4 text-[#0C7A89] shrink-0 mt-0.5" />
            <span>
              Total Nilai Akhir dihitung dari rata-rata nilai terbobot seluruh juri yang telah
              memberikan penilaian. Rumus kontribusi terbobot:{' '}
              <span className="font-mono text-slate-700">Nilai Murni × Bobot (%)</span>.
            </span>
          </div>

          {/* Judge Notes Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#0C7A89]" />
              <span>Catatan &amp; Masukan Dewan Juri</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {entry.judgeMatrix.map((cell) => {
                const judgeObj = judges.find((j) => j.id === cell.judgeId);
                return (
                  <div
                    key={cell.judgeId}
                    className="rounded-2xl border border-slate-200/80 bg-white/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#07525E]">
                        {judgeObj?.label ?? `Juri ${cell.judgeCode}`}
                      </span>
                      {cell.hasScored ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0C7A89]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Selesai</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Menunggu</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {cell.judgeName}
                    </p>
                    <p className="mt-2.5 text-xs text-slate-700 leading-relaxed">
                      {cell.hasScored
                        ? cell.notes || 'Tidak ada catatan tambahan dari juri ini.'
                        : 'Belum mengirimkan evaluasi.'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
