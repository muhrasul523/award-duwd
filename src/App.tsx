import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList,
  FileUp,
  RotateCcw,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import emblemImage from './assets/images/wahdah_award_emblem_1794560437624.jpg';
import { AdminTab } from './components/AdminTab';
import { JudgePortalTab } from './components/JudgePortalTab';
import { LeaderboardTab } from './components/LeaderboardTab';
import { MaterialPreviewModal } from './components/MaterialPreviewModal';
import { ScoreDetailModal } from './components/ScoreDetailModal';
import type {
  BootstrapResponse,
  LeaderboardEntry,
  MasterJudge,
  ParticipantSubmission,
} from './shared/types';

type ActiveTab = 'admin' | 'judge' | 'leaderboard';

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
  const [previewParticipant, setPreviewParticipant] = useState<ParticipantSubmission | null>(
    null
  );

  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fetchBootstrap = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) {
        throw new Error('Gagal memuat data aplikasi dari server.');
      }
      const json = (await res.json()) as BootstrapResponse;
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

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/reset-demo', { method: 'POST' });
      const json = (await res.json()) as { bootstrap?: BootstrapResponse };
      if (res.ok && json.bootstrap) {
        setData(json.bootstrap);
        setShowResetModal(false);
      }
    } finally {
      setIsResetting(false);
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
        dpwCount: 0,
        dpdCount: 0,
        completedEvaluations: 0,
        expectedEvaluations: 0,
        leaderName: '—',
        leaderScore: '0.00',
      };
    }

    const totalParticipants = data.participants.length;
    const dpwCount = data.participants.filter((p) => p.entityType === 'DPW').length;
    const dpdCount = data.participants.filter((p) => p.entityType === 'DPD').length;
    const expectedEvaluations = totalParticipants * data.judges.length;
    const completedEvaluations = data.scores.length;
    const top = data.leaderboard[0];

    return {
      totalParticipants,
      dpwCount,
      dpdCount,
      completedEvaluations,
      expectedEvaluations,
      leaderName: top ? top.participant.entityName : '—',
      leaderScore: top ? top.finalScore.toFixed(2) : '0.00',
    };
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Clean 3-Zone Top Bar */}
      <header className="glass-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('leaderboard');
            }}
            className="text-base sm:text-lg font-extrabold tracking-tight text-[#07525E] whitespace-nowrap shrink-0"
          >
            Award Kolaborasi &amp; Inovasi 2026
          </a>

          {/* Zone 2: Single-line Primary Navigation Links */}
          <nav
            className="hidden md:flex items-center gap-6 text-sm font-semibold"
            aria-label="Navigasi utama"
          >
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
              onClick={() => setActiveTab('leaderboard')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'leaderboard'
                  ? 'border-[#0C7A89] text-[#07525E]'
                  : 'border-transparent text-slate-600 hover:text-[#07525E]'
              }`}
            >
              Peringkat &amp; Skor
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('judge')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0C7A89] to-[#07525E] hover:brightness-110 transition shadow-sm whitespace-nowrap shrink-0"
            >
              {activeJudge ? `Aktif: ${activeJudge.label}` : 'Portal Juri'}
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
        {/* Institutional Hero & Live Summary Strip */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start sm:items-center gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-sm shrink-0">
                <img
                  src={emblemImage}
                  alt="Emblem Award Kolaborasi dan Inovasi Mandiri 2026"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#D88B15]">
                  Dewan Pengurus Pusat Wahdah Islamiyah
                </div>
                <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#07525E] text-balance">
                  Award Kolaborasi dan Inovasi Mandiri 2026
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                  Sistem terpadu pengumpulan karya inovasi DPW &amp; DPD, penilaian objektif berbasis indikator oleh Dewan Juri, dan rekapitulasi peringkat otomatis.
                </p>
              </div>
            </div>

            {/* 3-Tab Segmented Switcher inside Workspace */}
            <div
              className="grid grid-cols-3 gap-1 p-1.5 rounded-2xl bg-slate-900/[0.05] border border-slate-200/80 self-start lg:self-center w-full lg:w-auto"
              role="tablist"
              aria-label="Alur utama aplikasi"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'admin'}
                onClick={() => setActiveTab('admin')}
                className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-white text-[#07525E] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileUp className="w-3.5 h-3.5 shrink-0" />
                <span>1. Input Bahan</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'judge'}
                onClick={() => setActiveTab('judge')}
                className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                  activeTab === 'judge'
                    ? 'bg-white text-[#07525E] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>2. Portal Juri</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'leaderboard'}
                onClick={() => setActiveTab('leaderboard')}
                className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                  activeTab === 'leaderboard'
                    ? 'bg-white text-[#07525E] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 shrink-0" />
                <span>3. Peringkat</span>
              </button>
            </div>
          </div>

          {/* 4-Column Live KPI Strip */}
          <div className="mt-6 pt-6 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0C7A89]/10 text-[#0C7A89] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Peserta Terdaftar</div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-[#07525E]">
                  {summaryStats.totalParticipants} Entitas
                </div>
                <div className="text-[11px] text-slate-500 tabular-nums">
                  {summaryStats.dpwCount} DPW · {summaryStats.dpdCount} DPD
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0C7A89]/10 text-[#0C7A89] flex items-center justify-center shrink-0">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Progress Penilaian Juri</div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-[#07525E]">
                  {summaryStats.completedEvaluations} / {summaryStats.expectedEvaluations}
                </div>
                <div className="text-[11px] text-slate-500">
                  Evaluasi masuk dari {data?.judges.length ?? 3} Dewan Juri
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#D88B15]/12 text-[#D88B15] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Bobot Indikator Penilaian</div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-[#07525E]">
                  40% · 35% · 25%
                </div>
                <div className="text-[11px] text-slate-500">
                  Total akurasi bobot 100%
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#D88B15]/12 text-[#D88B15] flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-500">Peringkat Teratas Saat Ini</div>
                <div className="text-lg font-extrabold font-mono tabular-nums text-[#D88B15]">
                  {summaryStats.leaderScore}
                </div>
                <div className="text-[11px] font-medium text-slate-600 truncate">
                  {summaryStats.leaderName}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Loading / Error / Tab Viewport */}
        {isLoading ? (
          <div className="glass-panel rounded-3xl p-8 space-y-4" aria-busy="true">
            <div className="h-6 w-64 rounded-lg bg-slate-200/70" />
            <div className="h-4 w-96 rounded-lg bg-slate-200/60" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="h-32 rounded-2xl bg-slate-200/50" />
              <div className="h-32 rounded-2xl bg-slate-200/50" />
              <div className="h-32 rounded-2xl bg-slate-200/50" />
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
              className="mt-4 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#0C7A89] hover:bg-[#07525E] transition"
            >
              Muat Ulang Data
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === 'admin' && (
                <AdminTab
                  entities={data.entities}
                  participants={data.participants}
                  onDataUpdated={handleDataUpdated}
                  onPreviewMaterial={(p) => setPreviewParticipant(p)}
                />
              )}

              {activeTab === 'judge' && (
                <JudgePortalTab
                  judges={data.judges}
                  indicators={data.indicators}
                  participants={data.participants}
                  scores={data.scores}
                  activeJudge={activeJudge}
                  onJudgeAuthenticated={handleJudgeAuthenticated}
                  onJudgeLogout={handleJudgeLogout}
                  onDataUpdated={handleDataUpdated}
                  onPreviewMaterial={(p) => setPreviewParticipant(p)}
                />
              )}

              {activeTab === 'leaderboard' && (
                <LeaderboardTab
                  leaderboard={data.leaderboard}
                  indicators={data.indicators}
                  onOpenDetail={(entry) => setSelectedDetailParticipantId(entry.participant.id)}
                  onPreviewMaterial={(p) => setPreviewParticipant(p)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Dewan Pengurus Pusat Wahdah Islamiyah · Award Kolaborasi dan Inovasi Mandiri 2026
        </div>
        <button
          type="button"
          onClick={() => setShowResetModal(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#07525E] transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Data Awal</span>
        </button>
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
        isOpen={Boolean(previewParticipant)}
        onClose={() => setPreviewParticipant(null)}
        title={previewParticipant?.innovationTitle ?? ''}
        entityName={previewParticipant?.entityName ?? ''}
        materialType={previewParticipant?.materialType ?? 'Link'}
        materialUrl={previewParticipant?.materialUrl ?? ''}
        uploadedFileName={previewParticipant?.uploadedFileName}
      />

      {/* Reset Demo Confirmation Modal */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#07525E]/35 backdrop-blur-md p-4"
          onClick={() => !isResetting && setShowResetModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="glass-panel-strong w-full max-w-md rounded-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#07525E]">Kembalikan Data Awal?</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Seluruh perubahan peserta dan penilaian juri akan dikembalikan ke data master dan contoh awal Award 2026.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-900/5 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={() => void handleConfirmReset()}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0C7A89] hover:bg-[#07525E] disabled:opacity-60 transition"
              >
                {isResetting ? 'Memulihkan...' : 'Ya, Kembalikan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
