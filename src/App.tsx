import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList,
  FileUp,
  Layers,
  Loader2,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { AdminTab } from './components/AdminTab';
import { AppsScriptModal } from './components/AppsScriptModal';
import { JudgePortalTab } from './components/JudgePortalTab';
import { LeaderboardTab } from './components/LeaderboardTab';
import { MaterialPreviewModal } from './components/MaterialPreviewModal';
import { ScoreDetailModal } from './components/ScoreDetailModal';
import { apiBootstrap, isUsingAppsScript } from './services/api';
import { getParticipantMaterials, normalizeAwardCategory } from './shared/scoring';
import type {
  BootstrapResponse,
  LeaderboardEntry,
  MasterJudge,
  ParticipantSubmission,
} from './shared/types';

type ActiveTab = 'leaderboard' | 'judge' | 'admin';

const JUDGE_SESSION_KEY = 'wahdah_award_2026_judge';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('leaderboard');
  const [data, setData] = useState<BootstrapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeJudge, setActiveJudge] = useState<MasterJudge | null>(null);
  const [selectedDetailParticipantId, setSelectedDetailParticipantId] = useState<string | null>(
    null
  );
  const [previewState, setPreviewState] = useState<{
    participant: ParticipantSubmission;
    initialMaterialId?: string;
  } | null>(null);

  const [showAppsScriptModal, setShowAppsScriptModal] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('pengaturan') === '1' || window.location.hash === '#pengaturan';
  });
  const [usingGas, setUsingGas] = useState(() => isUsingAppsScript());

  const fetchBootstrap = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const json = await apiBootstrap();
      setData(json);

      // Restore judge session if valid in master judges
      try {
        const savedId = localStorage.getItem(JUDGE_SESSION_KEY);
        if (savedId) {
          const found = json.judges.find((j) => j.id === savedId) ?? null;
          setActiveJudge(found);
        }
      } catch {
        // Ignore storage access errors
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBootstrap();
  }, [fetchBootstrap]);

  const handleDataUpdated = (nextData: BootstrapResponse) => {
    setData(nextData);
  };

  const handleJudgeAuthenticated = (judge: MasterJudge) => {
    setActiveJudge(judge);
    try {
      localStorage.setItem(JUDGE_SESSION_KEY, judge.id);
    } catch {
      // Ignore storage errors
    }
  };

  const handleJudgeLogout = () => {
    setActiveJudge(null);
    try {
      localStorage.removeItem(JUDGE_SESSION_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const selectedDetailEntry: LeaderboardEntry | null = useMemo(() => {
    if (!data || !selectedDetailParticipantId) return null;
    return (
      data.leaderboard.find((e) => e.participant.id === selectedDetailParticipantId) ?? null
    );
  }, [data, selectedDetailParticipantId]);

  const summaryStats = useMemo(() => {
    if (!data) {
      return {
        totalParticipants: 0,
        kolaborasiCount: 0,
        inovasiCount: 0,
        dpwCount: 0,
        dpdCount: 0,
        completedEvaluations: 0,
        expectedEvaluations: 0,
        kolLeaderName: '—',
        kolLeaderScore: '0.00',
        inoLeaderName: '—',
        inoLeaderScore: '0.00',
      };
    }

    const totalParticipants = data.participants.length;
    const kolaborasiCount = data.participants.filter(
      (p) => normalizeAwardCategory(p.awardCategory) === 'KOLABORASI'
    ).length;
    const inovasiCount = data.participants.filter(
      (p) => normalizeAwardCategory(p.awardCategory) === 'INOVASI_MANDIRI'
    ).length;
    const dpwCount = data.participants.filter((p) => p.entityType === 'DPW').length;
    const dpdCount = data.participants.filter((p) => p.entityType === 'DPD').length;
    const expectedEvaluations = totalParticipants * data.judges.length;
    const completedEvaluations = data.scores.length;

    const topKol = data.leaderboard.find(
      (e) => normalizeAwardCategory(e.awardCategory) === 'KOLABORASI'
    );
    const topIno = data.leaderboard.find(
      (e) => normalizeAwardCategory(e.awardCategory) === 'INOVASI_MANDIRI'
    );

    return {
      totalParticipants,
      kolaborasiCount,
      inovasiCount,
      dpwCount,
      dpdCount,
      completedEvaluations,
      expectedEvaluations,
      kolLeaderName: topKol ? topKol.participant.entityName : '—',
      kolLeaderScore: topKol ? topKol.finalScore.toFixed(2) : '0.00',
      inoLeaderName: topIno ? topIno.participant.entityName : '—',
      inoLeaderScore: topIno ? topIno.finalScore.toFixed(2) : '0.00',
    };
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Clean 3-Zone Top Bar */}
      <header className="glass-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('leaderboard');
            }}
            className="text-sm sm:text-lg font-extrabold tracking-tight text-[#07525E] truncate min-w-0"
          >
            Award Kolaborasi &amp; Inovasi 2026
          </a>

          {/* Zone 2: Single-line Primary Navigation Links (1. Peringkat, 2. Portal Juri, 3. Input Bahan) */}
          <nav
            className="hidden md:flex items-center gap-6 text-sm font-semibold"
            aria-label="Navigasi utama"
          >
            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'leaderboard'
                  ? 'border-[#0C7A89] text-[#07525E]'
                  : 'border-transparent text-slate-600 hover:text-[#07525E]'
              }`}
            >
              Peringkat &amp; Skor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('judge')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'judge'
                  ? 'border-[#0C7A89] text-[#07525E]'
                  : 'border-transparent text-slate-600 hover:text-[#07525E]'
              }`}
            >
              Portal Juri
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'admin'
                  ? 'border-[#0C7A89] text-[#07525E]'
                  : 'border-transparent text-slate-600 hover:text-[#07525E]'
              }`}
            >
              Input Bahan
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('judge')}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0C7A89] via-[#096472] to-[#07525E] hover:brightness-110 transition shadow-sm whitespace-nowrap shrink-0"
            >
              {activeJudge ? `Aktif: ${activeJudge.label}` : 'Portal Juri'}
            </button>
          </div>
        </div>
      </header>

      <main
        id="top"
        className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5 sm:space-y-7"
      >
        {/* Institutional Hero & Live Summary Strip */}
        <section className="glass-panel rounded-3xl overflow-hidden bg-gradient-to-br from-white/90 via-[#F2F9FA]/85 to-[#FDF7EB]/85">
          <div className="h-1 w-full bg-gradient-to-r from-[#07525E] via-[#0C7A89] to-[#D88B15]" />
          <div className="p-4 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6">
              <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 min-w-0">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-white to-[#F2F8F9] border border-[#0C7A89]/15 shadow-sm shrink-0 p-1.5 flex items-center justify-center">
                  <img
                    src="./favicon.ico"
                    alt="Logo Resmi Wahdah Islamiyah"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] sm:text-xs font-bold bg-gradient-to-r from-[#D88B15] to-[#B6720B] bg-clip-text text-transparent">
                    Dewan Pimpinan Pusat Wahdah Islamiyah
                  </div>
                  <h1 className="mt-1 text-xl sm:text-3xl font-extrabold tracking-tight text-[#07525E] text-balance leading-tight">
                    Award Kolaborasi dan Inovasi Mandiri 2026
                  </h1>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                    Sistem terpadu pengumpulan karya kategori Kolaborasi dan Inovasi Mandiri DPW &amp; DPD, penilaian berbasis indikator khusus kategori, dan rekapitulasi peringkat terpisah secara otomatis.
                  </p>
                </div>
              </div>

              {/* 3-Tab Segmented Switcher inside Workspace (Order: 1. Peringkat, 2. Portal Juri, 3. Input Bahan) */}
              <div
                className="grid grid-cols-3 gap-1 p-1.5 rounded-2xl bg-gradient-to-r from-[#07525E]/[0.06] via-[#0C7A89]/[0.06] to-[#D88B15]/[0.06] border border-slate-200/80 self-stretch lg:self-center w-full lg:w-auto shrink-0"
                role="tablist"
                aria-label="Alur utama aplikasi"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'leaderboard'}
                  onClick={() => setActiveTab('leaderboard')}
                  className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'leaderboard'
                      ? 'bg-gradient-to-r from-[#0C7A89] to-[#07525E] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 shrink-0" />
                  <span>1. Peringkat</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'judge'}
                  onClick={() => setActiveTab('judge')}
                  className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'judge'
                      ? 'bg-gradient-to-r from-[#0C7A89] to-[#07525E] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:hidden">2. Juri</span>
                  <span className="hidden sm:inline">2. Portal Juri</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'admin'}
                  onClick={() => setActiveTab('admin')}
                  className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'admin'
                      ? 'bg-gradient-to-r from-[#0C7A89] to-[#07525E] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:hidden">3. Bahan</span>
                  <span className="hidden sm:inline">3. Input Bahan</span>
                </button>
              </div>
            </div>

            {/* 4-Column Live KPI Strip */}
            <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-slate-200/70 grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0C7A89]/18 to-[#07525E]/8 text-[#0C7A89] flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-medium text-slate-500">
                    Peserta Terdaftar
                  </div>
                  <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#07525E]">
                    {summaryStats.totalParticipants} Karya
                  </div>
                  <div className="text-[11px] text-slate-500 tabular-nums">
                    {summaryStats.dpwCount} DPW · {summaryStats.dpdCount} DPD
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0C7A89]/18 to-[#07525E]/8 text-[#0C7A89] flex items-center justify-center shrink-0">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-medium text-slate-500">
                    Progress Juri
                  </div>
                  <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#07525E]">
                    {summaryStats.completedEvaluations} / {summaryStats.expectedEvaluations}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Dari {data?.judges.length ?? 3} Dewan Juri
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D88B15]/22 to-[#D88B15]/8 text-[#D88B15] flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-medium text-slate-500">
                    Kategori Lomba
                  </div>
                  <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#07525E]">
                    2 Kategori
                  </div>
                  <div className="text-[11px] text-slate-500 tabular-nums">
                    {summaryStats.kolaborasiCount} Kolaborasi · {summaryStats.inovasiCount} Inovasi
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D88B15]/22 to-[#D88B15]/8 text-[#D88B15] flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-medium text-slate-500">
                    Skor Teratas
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold font-mono tabular-nums text-[#D88B15] leading-snug">
                    Kol {summaryStats.kolLeaderScore} · Ino {summaryStats.inoLeaderScore}
                  </div>
                  <div className="text-[11px] font-medium text-slate-600 truncate">
                    {summaryStats.kolLeaderName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Loading / Error / Tab Viewport */}
        {isLoading ? (
          <div className="glass-panel rounded-3xl p-8 sm:p-10 space-y-5" aria-busy="true">
            <div className="flex items-center justify-center gap-2.5 text-sm font-semibold text-[#07525E]">
              <Loader2 className="w-5 h-5 animate-spin text-[#0C7A89]" />
              <span>Memuat data Award Kolaborasi dan Inovasi Mandiri 2026...</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="h-28 rounded-2xl bg-slate-200/50 animate-pulse" />
              <div className="h-28 rounded-2xl bg-slate-200/50 animate-pulse" />
              <div className="h-28 rounded-2xl bg-slate-200/50 animate-pulse" />
            </div>
          </div>
        ) : loadError || !data ? (
          <div className="glass-panel rounded-3xl p-8 text-center">
            <p className="text-sm font-bold text-red-700">
              {loadError || 'Data aplikasi gagal dimuat.'}
            </p>
            <button
              type="button"
              onClick={() => void fetchBootstrap()}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0C7A89] to-[#07525E] hover:brightness-110 transition"
            >
              Muat Ulang Data
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {usingGas && data.entities.length === 0 && (
              <div className="glass-panel rounded-2xl p-4 sm:p-5 border-[#D88B15]/40 bg-[#D88B15]/[0.07] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-xs text-[#6E4505] leading-relaxed">
                  <span className="font-bold block text-sm text-[#07525E]">
                    Spreadsheet Terhubung, Namun 7 Sheet Belum Diinisialisasi
                  </span>
                  Web App Apps Script Anda sudah aktif, tetapi sheet master dan data awal belum dibuat.
                </div>
                <button
                  type="button"
                  onClick={() => setShowAppsScriptModal(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#D88B15] hover:brightness-105 transition whitespace-nowrap shrink-0"
                >
                  Inisialisasi 7 Sheet
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeTab === 'leaderboard' && (
                  <LeaderboardTab
                    leaderboard={data.leaderboard}
                    indicators={data.indicators}
                    onOpenDetail={(entry) => setSelectedDetailParticipantId(entry.participant.id)}
                    onPreviewMaterial={(p) => setPreviewState({ participant: p })}
                  />
                )}

                {activeTab === 'judge' && (
                  <JudgePortalTab
                    indicators={data.indicators}
                    participants={data.participants}
                    scores={data.scores}
                    activeJudge={activeJudge}
                    onJudgeAuthenticated={handleJudgeAuthenticated}
                    onJudgeLogout={handleJudgeLogout}
                    onDataUpdated={handleDataUpdated}
                    onPreviewMaterial={(p, initialMaterialId) =>
                      setPreviewState({ participant: p, initialMaterialId })
                    }
                  />
                )}

                {activeTab === 'admin' && (
                  <AdminTab
                    entities={data.entities}
                    participants={data.participants}
                    onDataUpdated={handleDataUpdated}
                    onPreviewMaterial={(p) => setPreviewState({ participant: p })}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Clean Institutional Footer (Backend & Reset buttons intentionally hidden from UI) */}
      <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-slate-200/70 text-center sm:text-left text-xs text-slate-500">
        Dewan Pimpinan Pusat Wahdah Islamiyah · Award Kolaborasi dan Inovasi Mandiri 2026
      </footer>

      {/* Score Breakdown Matrix Modal */}
      <ScoreDetailModal
        entry={selectedDetailEntry}
        judges={data?.judges ?? []}
        indicators={data?.indicators ?? []}
        onClose={() => setSelectedDetailParticipantId(null)}
      />

      {/* Material Preview Modal */}
      <MaterialPreviewModal
        isOpen={Boolean(previewState)}
        onClose={() => setPreviewState(null)}
        title={previewState?.participant.innovationTitle ?? ''}
        entityName={previewState?.participant.entityName ?? ''}
        materials={previewState ? getParticipantMaterials(previewState.participant) : []}
        initialMaterialId={previewState?.initialMaterialId}
      />

      {/* Google Apps Script Backend Connection Modal (Only accessible via ?pengaturan=1 or #pengaturan) */}
      <AppsScriptModal
        isOpen={showAppsScriptModal}
        onClose={() => {
          setShowAppsScriptModal(false);
          setUsingGas(isUsingAppsScript());
        }}
        onConnected={(nextBootstrap) => {
          setData(nextBootstrap);
          setUsingGas(isUsingAppsScript());
        }}
      />
    </div>
  );
}
