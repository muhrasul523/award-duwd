import { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Download,
  ExternalLink,
  Eye,
  Scale,
  Search,
  Trophy,
} from 'lucide-react';
import type {
  EntityType,
  LeaderboardEntry,
  MasterIndicator,
  ParticipantSubmission,
} from '../shared/types';

interface LeaderboardTabProps {
  leaderboard: LeaderboardEntry[];
  indicators: MasterIndicator[];
  onOpenDetail: (entry: LeaderboardEntry) => void;
  onPreviewMaterial: (participant: ParticipantSubmission) => void;
}

export function LeaderboardTab({
  leaderboard,
  indicators,
  onOpenDetail,
  onPreviewMaterial,
}: LeaderboardTabProps) {
  const [entityFilter, setEntityFilter] = useState<'ALL' | EntityType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const highestIndicator = useMemo(
    () => [...indicators].sort((a, b) => b.weight - a.weight || a.order - b.order)[0],
    [indicators]
  );

  const filteredLeaderboard = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leaderboard.filter((entry) => {
      if (entityFilter !== 'ALL' && entry.participant.entityType !== entityFilter) {
        return false;
      }
      if (!q) return true;
      return (
        entry.participant.entityName.toLowerCase().includes(q) ||
        entry.participant.province.toLowerCase().includes(q) ||
        entry.participant.innovationTitle.toLowerCase().includes(q)
      );
    });
  }, [leaderboard, entityFilter, searchQuery]);

  const handleExportCsv = () => {
    const header = [
      'Peringkat',
      'Jenis Entitas',
      'Nama Entitas',
      'Provinsi',
      'Judul Inovasi',
      'Tipe Bahan',
      'Tautan Bahan',
      'Progress Juri',
      'Nilai Akhir',
      'Keterangan Tie-Breaker',
    ];

    const rows = filteredLeaderboard.map((entry) => [
      String(entry.rank),
      entry.participant.entityType,
      entry.participant.entityName,
      entry.participant.province,
      entry.participant.innovationTitle,
      entry.participant.materialType,
      entry.participant.materialUrl,
      `${entry.judgesScoredCount}/${entry.totalJudgesCount}`,
      entry.finalScore.toFixed(2),
      entry.tieBreakerNote || '-',
    ]);

    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const csvContent =
      '\uFEFF' +
      [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rekap-peringkat-award-wahdah-2026.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Main Leaderboard Card */}
      <section className="glass-panel rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200/70">
          <div>
            <h2 className="text-xl font-bold text-[#07525E]">
              Peringkat &amp; Rekapitulasi Skor Real-Time
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Pemeringkatan otomatis berdasarkan nilai akhir terbobot dan aturan tie-breaker Dewan Juri.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-900/[0.05] border border-slate-200/70">
              {(['ALL', 'DPW', 'DPD'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setEntityFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    entityFilter === tab
                      ? 'bg-white text-[#07525E] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'ALL' ? 'Semua Entitas' : tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#07525E] bg-white border border-slate-200 hover:bg-slate-50 transition whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari peringkat entitas, provinsi, atau judul inovasi..."
              className="w-full rounded-xl bg-white/90 border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
            />
          </div>

          <div className="text-xs text-slate-500 tabular-nums">
            Menampilkan <span className="font-semibold text-slate-800">{filteredLeaderboard.length}</span> dari{' '}
            <span className="font-semibold text-slate-800">{leaderboard.length}</span> peserta
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/85">
          {filteredLeaderboard.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Data peringkat tidak ditemukan.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Coba ubah filter kategori entitas atau kata kunci pencarian.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[920px]">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3.5 px-4 w-24">Peringkat</th>
                  <th className="py-3.5 px-4">Entitas &amp; Wilayah</th>
                  <th className="py-3.5 px-4">Judul Inovasi</th>
                  <th className="py-3.5 px-4">Bahan</th>
                  <th className="py-3.5 px-4 w-44">Progress Juri</th>
                  <th className="py-3.5 px-4 text-right w-32">Nilai Akhir</th>
                  <th className="py-3.5 px-4 text-right w-36">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 text-sm">
                {filteredLeaderboard.map((entry) => {
                  const p = entry.participant;
                  const progressPct =
                    entry.totalJudgesCount > 0
                      ? Math.round((entry.judgesScoredCount / entry.totalJudgesCount) * 100)
                      : 0;
                  const isTopOne = entry.rank === 1 && entry.finalScore > 0;
                  const isTopThree = entry.rank <= 3 && entry.finalScore > 0;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[#0C7A89]/[0.03] transition-colors ${
                        isTopOne ? 'bg-[#D88B15]/[0.04]' : ''
                      }`}
                    >
                      <td className="py-4 px-4 align-top">
                        <div className="flex items-center gap-2">
                          {isTopOne ? (
                            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D88B15] to-[#B6720B] text-white inline-flex items-center justify-center font-mono tabular-nums text-xs font-extrabold shadow-sm">
                              <Trophy className="w-4 h-4" />
                            </span>
                          ) : isTopThree ? (
                            <span className="w-8 h-8 rounded-xl bg-[#0C7A89]/12 text-[#07525E] inline-flex items-center justify-center font-mono tabular-nums text-xs font-extrabold">
                              #{entry.rank}
                            </span>
                          ) : (
                            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 inline-flex items-center justify-center font-mono tabular-nums text-xs font-bold">
                              #{entry.rank}
                            </span>
                          )}
                          {isTopOne && (
                            <span className="font-mono tabular-nums text-xs font-extrabold text-[#B6720B]">
                              #1
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="font-bold text-[#07525E] leading-snug">
                          {p.entityName}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="font-semibold text-[#0C7A89]">{p.entityType}</span>
                          <span aria-hidden="true">·</span>
                          <span>{p.province}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top max-w-xs">
                        <div className="font-semibold text-slate-900 leading-snug">
                          {p.innovationTitle}
                        </div>
                        {entry.tieBreakerNote && (
                          <div className="mt-1.5 inline-flex items-start gap-1.5 text-[11px] font-medium text-[#9A5E06]">
                            <Scale className="w-3.5 h-3.5 text-[#D88B15] shrink-0 mt-0.5" />
                            <span>{entry.tieBreakerNote}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={p.materialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0C7A89] hover:text-[#07525E] underline underline-offset-2 whitespace-nowrap"
                          >
                            <span>{p.materialType}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => onPreviewMaterial(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#07525E] hover:bg-slate-900/5 transition"
                            title="Pratinjau bahan"
                            aria-label={`Pratinjau bahan ${p.entityName}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                          <span className="font-mono tabular-nums text-slate-700 font-semibold">
                            {entry.judgesScoredCount}/{entry.totalJudgesCount} Juri
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {entry.scoredJudgeCodes.length > 0
                              ? entry.scoredJudgeCodes.join(', ')
                              : 'Belum ada'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              progressPct === 100 ? 'bg-[#0C7A89]' : 'bg-[#D88B15]'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top text-right">
                        <div className="text-lg font-extrabold font-mono tabular-nums text-[#07525E]">
                          {entry.finalScore.toFixed(2)}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-400">
                          Ind. {highestIndicator?.weight ?? 40}%:{' '}
                          {entry.highestIndicatorWeightedScore.toFixed(2)}
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top text-right">
                        <button
                          type="button"
                          onClick={() => onOpenDetail(entry)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0C7A89] to-[#07525E] hover:brightness-110 transition shadow-sm whitespace-nowrap"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Rincian Nilai</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Transparent Tie-Breaker Rules Card */}
      <section className="glass-panel rounded-3xl p-6">
        <div className="flex items-center gap-2.5">
          <Award className="w-4 h-4 text-[#D88B15]" />
          <h3 className="text-sm font-bold text-[#07525E]">
            Aturan Penentuan Pemenang &amp; Tie-Breaker Otomatis
          </h3>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="rounded-2xl bg-white/75 border border-slate-200/80 p-4">
            <div className="font-bold text-[#0C7A89]">01. Nilai Akhir Tertinggi</div>
            <p className="mt-1 text-slate-600 leading-relaxed">
              Peringkat utama ditentukan dari rata-rata total nilai terbobot tertinggi seluruh juri penilai.
            </p>
          </div>
          <div className="rounded-2xl bg-white/75 border border-slate-200/80 p-4">
            <div className="font-bold text-[#0C7A89]">02. Indikator Bobot Tertinggi</div>
            <p className="mt-1 text-slate-600 leading-relaxed">
              Jika nilai akhir seri, sistem membandingkan nilai pada indikator bobot tertinggi (
              <span className="font-semibold text-slate-800">
                {highestIndicator?.name ?? 'Kolaborasi Strategis'} · {highestIndicator?.weight ?? 40}%
              </span>
              ).
            </p>
          </div>
          <div className="rounded-2xl bg-white/75 border border-slate-200/80 p-4">
            <div className="font-bold text-[#0C7A89]">03. Rata-rata Nilai Murni Juri</div>
            <p className="mt-1 text-slate-600 leading-relaxed">
              Jika masih seri, dibandingkan rata-rata nilai murni (0–100) dari keseluruhan Dewan Juri pada indikator tersebut.
            </p>
          </div>
          <div className="rounded-2xl bg-white/75 border border-slate-200/80 p-4">
            <div className="font-bold text-[#D88B15]">04. Musyawarah Dewan Juri</div>
            <p className="mt-1 text-slate-600 leading-relaxed">
              Apabila seluruh metrik masih seri mutlak, peringkat ditetapkan sama dan diputuskan melalui musyawarah Dewan Juri.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
