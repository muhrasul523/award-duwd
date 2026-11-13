import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BarChart3,
  Download,
  ExternalLink,
  Eye,
  Handshake,
  Lightbulb,
  Loader2,
  Scale,
  Search,
  Trophy,
} from 'lucide-react';
import {
  getAwardCategoryLabel,
  getIndicatorsForCategory,
  getParticipantMaterials,
  normalizeAwardCategory,
} from '../shared/scoring';
import { AWARD_CATEGORY_LIST } from '../shared/types';
import type {
  AwardCategory,
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

interface ScoreHoverCellProps {
  entry: LeaderboardEntry;
  hasTie: boolean;
  align?: 'left' | 'right';
}

function ScoreHoverCell({ entry, hasTie, align = 'right' }: ScoreHoverCellProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (!hasTie) return;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setShowTooltip(true);
    }, 2000);
  };

  const handleMouseLeave = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShowTooltip(false);
  };

  const handleTapToggle = () => {
    if (!hasTie) return;
    setShowTooltip((prev) => !prev);
  };

  return (
    <div
      className={`relative inline-block ${hasTie ? 'cursor-help select-none' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTapToggle}
    >
      <div className="text-lg font-extrabold font-mono tabular-nums text-[#07525E]">
        {entry.finalScore.toFixed(2)}
      </div>

      {hasTie && showTooltip && (
        <div
          role="tooltip"
          className={`absolute z-30 bottom-full mb-2 w-72 sm:w-80 rounded-2xl bg-white/95 backdrop-blur-xl border border-[#D88B15]/40 shadow-xl p-3.5 text-left pointer-events-none ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-start gap-2">
            <Scale className="w-4 h-4 text-[#D88B15] shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px] leading-relaxed">
              <div className="font-mono tabular-nums font-bold text-[#07525E]">
                Ind. {entry.highestIndicatorWeight}%:{' '}
                {entry.highestIndicatorWeightedScore.toFixed(2)}
              </div>
              {entry.tieBreakerNote && (
                <div className="font-semibold text-[#9A5E06]">{entry.tieBreakerNote}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LeaderboardTab({
  leaderboard,
  indicators,
  onOpenDetail,
  onPreviewMaterial,
}: LeaderboardTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<AwardCategory>('KOLABORASI');
  const [entityFilter, setEntityFilter] = useState<'ALL' | EntityType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const categoryLeaderboard = useMemo(
    () =>
      leaderboard.filter(
        (entry) => normalizeAwardCategory(entry.awardCategory) === selectedCategory
      ),
    [leaderboard, selectedCategory]
  );

  const categoryCounts = useMemo(() => {
    return {
      KOLABORASI: leaderboard.filter(
        (e) => normalizeAwardCategory(e.awardCategory) === 'KOLABORASI'
      ).length,
      INOVASI_MANDIRI: leaderboard.filter(
        (e) => normalizeAwardCategory(e.awardCategory) === 'INOVASI_MANDIRI'
      ).length,
    };
  }, [leaderboard]);

  const categoryIndicators = useMemo(
    () => getIndicatorsForCategory(indicators, selectedCategory),
    [indicators, selectedCategory]
  );

  const highestIndicator = useMemo(
    () => [...categoryIndicators].sort((a, b) => b.weight - a.weight || a.order - b.order)[0],
    [categoryIndicators]
  );

  const tiedFinalScoreKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of categoryLeaderboard) {
      if (entry.finalScore <= 0) continue;
      const key = entry.finalScore.toFixed(2);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const tied = new Set<string>();
    for (const [key, cnt] of counts.entries()) {
      if (cnt > 1) tied.add(key);
    }
    return tied;
  }, [categoryLeaderboard]);

  const filteredLeaderboard = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categoryLeaderboard.filter((entry) => {
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
  }, [categoryLeaderboard, entityFilter, searchQuery]);

  const activeCategoryMeta =
    AWARD_CATEGORY_LIST.find((c) => c.id === selectedCategory) ?? AWARD_CATEGORY_LIST[0];

  const handleExportCsv = () => {
    setIsExporting(true);
    try {
      const header = [
        'Kategori Award',
        'Peringkat',
        'Jenis Entitas',
        'Nama Entitas',
        'Provinsi',
        'Judul Inovasi',
        'Jumlah Bahan',
        'Tautan Bahan Utama',
        'Progress Juri',
        'Nilai Akhir',
        'Keterangan Tie-Breaker',
      ];

      const rows = filteredLeaderboard.map((entry) => {
        const mats = getParticipantMaterials(entry.participant);
        return [
          getAwardCategoryLabel(entry.awardCategory),
          String(entry.rank),
          entry.participant.entityType,
          entry.participant.entityName,
          entry.participant.province,
          entry.participant.innovationTitle,
          String(mats.length),
          mats.map((m) => m.url).join(' | '),
          `${entry.judgesScoredCount}/${entry.totalJudgesCount}`,
          entry.finalScore.toFixed(2),
          entry.tieBreakerNote || '-',
        ];
      });

      const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
      const csvContent =
        '\uFEFF' +
        [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const slug = selectedCategory === 'INOVASI_MANDIRI' ? 'inovasi-mandiri' : 'kolaborasi';
      link.download = `rekap-peringkat-${slug}-2026.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      window.setTimeout(() => setIsExporting(false), 350);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Main Leaderboard Card */}
      <section className="glass-panel rounded-3xl p-4 sm:p-7">
        {/* Category Switcher Banner (Separate Rankings for 2 Award Categories) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-5 border-b border-slate-200/70">
          {AWARD_CATEGORY_LIST.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id];
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-left rounded-2xl p-4 border transition flex items-start gap-3.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#07525E] via-[#096472] to-[#0C7A89] text-white border-transparent shadow-md'
                    : 'bg-gradient-to-br from-white/90 to-[#F5FAFB]/85 border-slate-200/80 text-slate-800 hover:border-[#0C7A89]/40'
                }`}
              >
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-white/15 text-amber-200'
                      : 'bg-gradient-to-br from-[#0C7A89]/15 to-[#D88B15]/10 text-[#07525E]'
                  }`}
                >
                  {cat.id === 'KOLABORASI' ? (
                    <Handshake className="w-5 h-5" />
                  ) : (
                    <Lightbulb className="w-5 h-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm sm:text-base font-extrabold tracking-tight">
                      {cat.label}
                    </span>
                    <span
                      className={`text-xs font-mono tabular-nums font-bold shrink-0 ${
                        isSelected ? 'text-amber-200' : 'text-[#0C7A89]'
                      }`}
                    >
                      {count} Peserta
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-[11px] leading-relaxed ${
                      isSelected ? 'text-white/80' : 'text-slate-500'
                    }`}
                  >
                    {cat.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Category Header + Filter + Export */}
        <div className="pt-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 sm:pb-5 border-b border-slate-200/70">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#07525E]">
              Peringkat {activeCategoryMeta.label}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Bobot indikator kategori ini:{' '}
              <span className="font-mono font-semibold text-[#07525E]">
                {categoryIndicators.map((ind) => `${ind.weight}%`).join(' · ') || '—'}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-900/[0.05] border border-slate-200/70">
              {(['ALL', 'DPW', 'DPD'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setEntityFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    entityFilter === tab
                      ? 'bg-gradient-to-r from-[#0C7A89] to-[#07525E] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'ALL' ? 'Semua' : tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#07525E] bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-70 transition whitespace-nowrap shrink-0"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0C7A89]" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isExporting ? 'Menyiapkan...' : 'Unduh CSV'}</span>
            </button>
          </div>
        </div>

        {/* Search & Count Row */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Cari peringkat ${activeCategoryMeta.shortLabel}...`}
              className="w-full rounded-xl bg-white/95 border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
            />
          </div>

          <div className="text-xs text-slate-500 tabular-nums">
            Menampilkan{' '}
            <span className="font-semibold text-slate-800">{filteredLeaderboard.length}</span> dari{' '}
            <span className="font-semibold text-slate-800">{categoryLeaderboard.length}</span>{' '}
            peserta {activeCategoryMeta.shortLabel}
          </div>
        </div>

        {/* Empty State */}
        {filteredLeaderboard.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/80 p-10 text-center">
            <p className="text-sm font-semibold text-slate-700">
              Belum ada peserta pada kategori {activeCategoryMeta.label}.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Ubah filter pencarian atau tambahkan peserta melalui tab Input Bahan.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Responsive Card View (< md) */}
            <div className="mt-5 space-y-3 md:hidden">
              {filteredLeaderboard.map((entry) => {
                const p = entry.participant;
                const mats = getParticipantMaterials(p);
                const progressPct =
                  entry.totalJudgesCount > 0
                    ? Math.round((entry.judgesScoredCount / entry.totalJudgesCount) * 100)
                    : 0;
                const isTopOne = entry.rank === 1 && entry.finalScore > 0;
                const isTopThree = entry.rank <= 3 && entry.finalScore > 0;
                const hasTie =
                  Boolean(entry.tieBreakerNote) ||
                  tiedFinalScoreKeys.has(entry.finalScore.toFixed(2));

                return (
                  <article
                    key={p.id}
                    className={`rounded-2xl border p-4 space-y-3 transition ${
                      isTopOne
                        ? 'border-[#D88B15]/40 bg-gradient-to-br from-[#FDF8EE]/95 via-white/95 to-[#F4FAFB]/90'
                        : 'border-slate-200/80 bg-gradient-to-br from-white/95 to-[#F6FAFB]/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isTopOne ? (
                          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D88B15] to-[#B6720B] text-white inline-flex items-center justify-center shrink-0 shadow-sm">
                            <Trophy className="w-4 h-4" />
                          </span>
                        ) : isTopThree ? (
                          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0C7A89]/20 to-[#07525E]/10 text-[#07525E] inline-flex items-center justify-center font-mono tabular-nums text-xs font-extrabold shrink-0">
                            #{entry.rank}
                          </span>
                        ) : (
                          <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 inline-flex items-center justify-center font-mono tabular-nums text-xs font-bold shrink-0">
                            #{entry.rank}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium text-slate-500">
                            <span className="font-bold text-[#0C7A89]">{p.entityType}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{p.province}</span>
                          </div>
                          <h3 className="text-sm font-bold text-[#07525E] leading-snug break-words">
                            {p.entityName}
                          </h3>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <ScoreHoverCell entry={entry} hasTie={hasTie} align="right" />
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 leading-snug break-words">
                      {p.innovationTitle}
                    </p>

                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                        <span className="font-mono tabular-nums text-slate-700 font-semibold">
                          {entry.judgesScoredCount}/{entry.totalJudgesCount} Juri
                        </span>
                        <span className="text-slate-500">
                          {entry.scoredJudgeCodes.length > 0
                            ? entry.scoredJudgeCodes.join(', ')
                            : 'Belum ada'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            progressPct === 100
                              ? 'bg-gradient-to-r from-[#0C7A89] to-[#07525E]'
                              : 'bg-gradient-to-r from-[#D88B15] to-[#E5A032]'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onPreviewMaterial(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#07525E] bg-[#0C7A89]/10 hover:bg-[#0C7A89]/20 transition whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Bahan ({mats.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenDetail(entry)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0C7A89] to-[#07525E] hover:brightness-110 transition shadow-sm whitespace-nowrap"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Rincian Nilai</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="mt-5 hidden md:block overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/85">
              <table className="w-full text-left border-collapse min-w-[880px]">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-gradient-to-r from-[#07525E]/[0.05] via-[#0C7A89]/[0.04] to-[#D88B15]/[0.05] text-xs font-semibold text-slate-600">
                    <th className="py-3.5 px-4 w-24">Peringkat</th>
                    <th className="py-3.5 px-4">Entitas &amp; Wilayah</th>
                    <th className="py-3.5 px-4">Judul Karya / Inovasi</th>
                    <th className="py-3.5 px-4">Bahan</th>
                    <th className="py-3.5 px-4 w-44">Progress Juri</th>
                    <th className="py-3.5 px-4 text-right w-32">Nilai Akhir</th>
                    <th className="py-3.5 px-4 text-right w-36">Rincian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-sm">
                  {filteredLeaderboard.map((entry) => {
                    const p = entry.participant;
                    const mats = getParticipantMaterials(p);
                    const progressPct =
                      entry.totalJudgesCount > 0
                        ? Math.round((entry.judgesScoredCount / entry.totalJudgesCount) * 100)
                        : 0;
                    const isTopOne = entry.rank === 1 && entry.finalScore > 0;
                    const isTopThree = entry.rank <= 3 && entry.finalScore > 0;
                    const hasTie =
                      Boolean(entry.tieBreakerNote) ||
                      tiedFinalScoreKeys.has(entry.finalScore.toFixed(2));

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-[#0C7A89]/[0.04] transition-colors ${
                          isTopOne
                            ? 'bg-gradient-to-r from-[#D88B15]/[0.06] via-transparent to-transparent'
                            : ''
                        }`}
                      >
                        <td className="py-4 px-4 align-top">
                          <div className="flex items-center gap-2">
                            {isTopOne ? (
                              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D88B15] to-[#B6720B] text-white inline-flex items-center justify-center font-mono tabular-nums text-xs font-extrabold shadow-sm">
                                <Trophy className="w-4 h-4" />
                              </span>
                            ) : isTopThree ? (
                              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0C7A89]/18 to-[#07525E]/10 text-[#07525E] inline-flex items-center justify-center font-mono tabular-nums text-xs font-extrabold">
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
                        </td>

                        <td className="py-4 px-4 align-top">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onPreviewMaterial(p)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#07525E] bg-[#0C7A89]/10 hover:bg-[#0C7A89]/20 transition whitespace-nowrap"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>
                                {mats.length > 1 ? `${mats.length} Bahan` : p.materialType}
                              </span>
                            </button>
                            <a
                              href={p.materialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#0C7A89] hover:bg-slate-900/5 transition"
                              title="Buka bahan utama di tab baru"
                              aria-label={`Buka tautan bahan ${p.entityName}`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
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
                                progressPct === 100
                                  ? 'bg-gradient-to-r from-[#0C7A89] to-[#07525E]'
                                  : 'bg-gradient-to-r from-[#D88B15] to-[#E5A032]'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-4 px-4 align-top text-right">
                          <ScoreHoverCell entry={entry} hasTie={hasTie} align="right" />
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
            </div>
          </>
        )}
      </section>

      {/* Transparent Tie-Breaker Rules Card (Dynamic for Active Category) */}
      <section className="glass-panel rounded-3xl p-4 sm:p-6">
        <div className="flex items-center gap-2.5">
          <Award className="w-4 h-4 text-[#D88B15]" />
          <h3 className="text-sm font-bold text-[#07525E]">
            Aturan Tie-Breaker Kategori {activeCategoryMeta.shortLabel}
          </h3>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs">
          <div className="rounded-2xl bg-gradient-to-br from-white/90 to-[#F2F9FA]/85 border border-slate-200/80 p-4">
            <div className="font-bold text-[#0C7A89]">01. Nilai Akhir Tertinggi</div>
            <p className="mt-1 text-slate-600 leading-relaxed">
              Peringkat utama ditentukan dari rata-rata total nilai terbobot tertinggi pada kategori{' '}
              {activeCategoryMeta.shortLabel}.
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/90 to-[#F2F9FA]/85 border border-slate-200/80 p-4">
            <div className="font-bold text-[#0C7A89]">02. Indikator Bobot Tertinggi</div>
            <p className="mt-1 text-slate-600 leading-relaxed">
              Jika nilai akhir seri, sistem membandingkan nilai pada indikator bobot tertinggi (
              <span className="font-semibold text-slate-800">
                {highestIndicator?.name ?? 'Indikator Utama'} · {highestIndicator?.weight ?? 40}%
              </span>
              ).
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/90 to-[#F2F9FA]/85 border border-slate-200/80 p-4">
            <div className="font-bold text-[#0C7A89]">03. Rata-rata Nilai Murni Juri</div>
            <p className="mt-1 text-slate-600 leading-relaxed">
              Jika masih seri, dibandingkan rata-rata nilai murni (0–100) seluruh Dewan Juri pada indikator tersebut.
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/90 to-[#FDF8EE]/90 border border-slate-200/80 p-4">
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
