import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Link2,
  Loader2,
  LogOut,
  Save,
  Search,
  ShieldCheck,
  Video,
} from 'lucide-react';
import {
  computeJudgeTotalWeighted,
  computeWeightedScore,
  getAwardCategoryLabel,
  getIndicatorsForCategory,
  getParticipantMaterials,
  normalizeAwardCategory,
} from '../shared/scoring';
import { apiAuthJudge, apiSaveScores } from '../services/api';
import type {
  AwardCategory,
  BootstrapResponse,
  EntityType,
  JudgeScoreRecord,
  MasterIndicator,
  MasterJudge,
  ParticipantSubmission,
} from '../shared/types';

interface JudgePortalTabProps {
  indicators: MasterIndicator[];
  participants: ParticipantSubmission[];
  scores: JudgeScoreRecord[];
  activeJudge: MasterJudge | null;
  onJudgeAuthenticated: (judge: MasterJudge) => void;
  onJudgeLogout: () => void;
  onDataUpdated: (data: BootstrapResponse) => void;
  onPreviewMaterial: (participant: ParticipantSubmission, initialMaterialId?: string) => void;
}

export function JudgePortalTab({
  indicators,
  participants,
  scores,
  activeJudge,
  onJudgeAuthenticated,
  onJudgeLogout,
  onDataUpdated,
  onPreviewMaterial,
}: JudgePortalTabProps) {
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Workspace state
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AwardCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNSCORED' | 'SCORED'>('ALL');
  const [entityFilter, setEntityFilter] = useState<'ALL' | EntityType>('ALL');

  // Form scores state
  const [draftScores, setDraftScores] = useState<Record<string, number>>({});
  const [draftNotes, setDraftNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const scoringSectionRef = useRef<HTMLElement | null>(null);

  const judgeScoreMap = useMemo(() => {
    const map = new Map<string, JudgeScoreRecord>();
    if (!activeJudge) return map;
    for (const s of scores) {
      if (s.judgeId === activeJudge.id) {
        map.set(s.participantId, s);
      }
    }
    return map;
  }, [scores, activeJudge]);

  const filteredParticipants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return participants.filter((p) => {
      if (
        categoryFilter !== 'ALL' &&
        normalizeAwardCategory(p.awardCategory) !== categoryFilter
      ) {
        return false;
      }
      if (entityFilter !== 'ALL' && p.entityType !== entityFilter) return false;
      const isScored = judgeScoreMap.has(p.id);
      if (statusFilter === 'SCORED' && !isScored) return false;
      if (statusFilter === 'UNSCORED' && isScored) return false;
      if (!q) return true;
      return (
        p.entityName.toLowerCase().includes(q) ||
        p.province.toLowerCase().includes(q) ||
        p.innovationTitle.toLowerCase().includes(q)
      );
    });
  }, [participants, categoryFilter, entityFilter, statusFilter, searchQuery, judgeScoreMap]);

  // Select first available participant automatically when entering workspace
  useEffect(() => {
    if (!activeJudge || participants.length === 0) return;
    if (!selectedParticipantId || !participants.some((p) => p.id === selectedParticipantId)) {
      const firstUnscored = participants.find((p) => !judgeScoreMap.has(p.id));
      setSelectedParticipantId((firstUnscored ?? participants[0]).id);
    }
  }, [activeJudge, participants, selectedParticipantId, judgeScoreMap]);

  const selectedParticipant = useMemo(
    () => participants.find((p) => p.id === selectedParticipantId) ?? null,
    [participants, selectedParticipantId]
  );

  // Indicators strictly matching the selected participant's award category
  const activeIndicators = useMemo(() => {
    if (!selectedParticipant) return [];
    return getIndicatorsForCategory(indicators, selectedParticipant.awardCategory);
  }, [indicators, selectedParticipant]);

  const selectedMaterials = useMemo(
    () => (selectedParticipant ? getParticipantMaterials(selectedParticipant) : []),
    [selectedParticipant]
  );

  // Load saved scores or initialize defaults when selected participant or activeJudge changes
  useEffect(() => {
    if (!activeJudge || !selectedParticipant) return;
    const existing = judgeScoreMap.get(selectedParticipant.id);
    const initial: Record<string, number> = {};
    for (const ind of activeIndicators) {
      initial[ind.id] = existing?.scores[ind.id] ?? 80;
    }
    setDraftScores(initial);
    setDraftNotes(existing?.notes ?? '');
    setSaveFeedback(null);
  }, [activeJudge, selectedParticipant, judgeScoreMap, activeIndicators]);

  const liveTotalWeighted = useMemo(
    () => computeJudgeTotalWeighted(draftScores, activeIndicators),
    [draftScores, activeIndicators]
  );

  const performAccessCodeAuth = async (code: string) => {
    setAuthError(null);
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) {
      setAuthError('Masukkan tepat 6 angka terakhir dari nomor WhatsApp Anda yang terdaftar.');
      return;
    }
    setIsAuthenticating(true);
    try {
      const judge = await apiAuthJudge(clean);
      onJudgeAuthenticated(judge);
      setAccessCodeInput('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Kode akses juri tidak valid.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void performAccessCodeAuth(accessCodeInput);
  };

  const handleSelectParticipant = (id: string) => {
    setSelectedParticipantId(id);
    if (window.innerWidth < 1024 && scoringSectionRef.current) {
      scoringSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScoreInputChange = (indicatorId: string, rawStr: string) => {
    if (rawStr === '') {
      setDraftScores((prev) => ({ ...prev, [indicatorId]: 0 }));
      return;
    }
    const parsed = Number(rawStr);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(0, Math.min(100, parsed));
    setDraftScores((prev) => ({ ...prev, [indicatorId]: clamped }));
  };

  const handleSaveScores = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJudge || !selectedParticipant) return;
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      const nextBootstrap = await apiSaveScores({
        participantId: selectedParticipant.id,
        judgeId: activeJudge.id,
        scores: draftScores,
        notes: draftNotes,
      });
      onDataUpdated(nextBootstrap);
      const catLabel = getAwardCategoryLabel(selectedParticipant.awardCategory);
      setSaveFeedback({
        type: 'success',
        message: `Penilaian (${catLabel}) untuk ${selectedParticipant.entityName} berhasil disimpan (Total Terbobot: ${liveTotalWeighted.toFixed(2)}).`,
      });
    } catch (err) {
      setSaveFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal menyimpan penilaian.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Unauthenticated View: 6-Digit Access Code Login Card (Zero Phone Numbers Shown)
  if (!activeJudge) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="glass-panel rounded-3xl p-6 sm:p-9 bg-gradient-to-br from-white/95 via-[#F4FAFB]/90 to-[#FDF7EC]/85">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0C7A89] via-[#096472] to-[#07525E] text-white flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-[#07525E]">
                Autentikasi Portal Dewan Juri
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Dewan Pimpinan Pusat Wahdah Islamiyah · Masukkan 6 angka terakhir nomor WhatsApp resmi Anda yang terdaftar.
              </p>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="judge-code-input"
                className="block text-xs font-semibold text-slate-700 mb-2"
              >
                Kode Akses Dewan Juri (6 Digit Terakhir Nomor WA)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#0C7A89] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="judge-code-input"
                  type={showCode ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={accessCodeInput}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setAccessCodeInput(digitsOnly);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Masukkan 6 angka terakhir"
                  className="w-full rounded-xl bg-white/95 border border-slate-200 pl-10 pr-11 py-3 text-base font-mono tracking-[0.22em] text-slate-900 placeholder:font-sans placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCode((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  aria-label={showCode ? 'Sembunyikan kode akses' : 'Tampilkan kode akses'}
                >
                  {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Untuk menjaga kerahasiaan data juri, sistem hanya memverifikasi 6 digit akhir secara tertutup.
              </p>
            </div>

            {authError && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-medium text-red-700"
              >
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#0C7A89] via-[#096472] to-[#07525E] hover:brightness-110 disabled:opacity-60 transition shadow-sm"
            >
              {isAuthenticating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>
                {isAuthenticating ? 'Memverifikasi Kode Akses...' : 'Masuk ke Ruang Penilaian'}
              </span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Workspace View
  const scoredByActiveCount = participants.filter((p) => judgeScoreMap.has(p.id)).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Active Judge Session Header (NO phone number displayed) */}
      <div className="glass-panel rounded-2xl px-4 sm:px-5 py-4 bg-gradient-to-r from-white/90 via-[#F4FAFB]/85 to-[#FDF7EC]/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-slate-500">
            <span className="font-bold text-[#0C7A89]">{activeJudge.label}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#D88B15] font-semibold tabular-nums">
              {scoredByActiveCount} / {participants.length} Karya Dinilai
            </span>
          </div>
          <div className="text-sm sm:text-base font-bold text-[#07525E] mt-0.5 break-words">
            {activeJudge.name}
          </div>
          {activeJudge.title && (
            <div className="text-[11px] text-slate-500 mt-0.5 break-words">
              {activeJudge.title}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onJudgeLogout}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar / Ganti Juri</span>
        </button>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Column: Participant Selector */}
        <aside className="lg:col-span-4 glass-panel rounded-3xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#07525E]">Daftar Peserta</h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {filteredParticipants.length} karya
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari wilayah atau inovasi..."
              className="w-full rounded-xl bg-white/95 border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
            />
          </div>

          {/* Category Filter */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-900/[0.05] text-[11px] font-semibold">
            {(
              [
                { id: 'ALL', label: 'Semua' },
                { id: 'KOLABORASI', label: 'Kolaborasi' },
                { id: 'INOVASI_MANDIRI', label: 'Inovasi' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`py-1.5 px-2 rounded-lg transition whitespace-nowrap ${
                  categoryFilter === cat.id
                    ? 'bg-gradient-to-r from-[#0C7A89] to-[#07525E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex p-0.5 rounded-lg bg-slate-900/[0.05] text-[11px] font-semibold">
              {(['ALL', 'UNSCORED', 'SCORED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md transition whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-white text-[#07525E] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'ALL' ? 'Semua' : st === 'UNSCORED' ? 'Belum' : 'Sudah'}
                </button>
              ))}
            </div>

            <div className="inline-flex p-0.5 rounded-lg bg-slate-900/[0.05] text-[11px] font-semibold">
              {(['ALL', 'DPW', 'DPD'] as const).map((et) => (
                <button
                  key={et}
                  type="button"
                  onClick={() => setEntityFilter(et)}
                  className={`px-2 py-1 rounded-md transition whitespace-nowrap ${
                    entityFilter === et
                      ? 'bg-white text-[#07525E] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {et === 'ALL' ? 'All' : et}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-[340px] lg:max-h-[540px] overflow-y-auto pr-1">
            {filteredParticipants.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 rounded-2xl bg-white/60 border border-slate-200/70">
                Tidak ada peserta pada filter ini.
              </div>
            ) : (
              filteredParticipants.map((p) => {
                const record = judgeScoreMap.get(p.id);
                const isSelected = p.id === selectedParticipantId;
                const pIndicators = getIndicatorsForCategory(indicators, p.awardCategory);
                const savedTotal = record
                  ? computeJudgeTotalWeighted(record.scores, pIndicators)
                  : null;
                const catLabel = getAwardCategoryLabel(p.awardCategory);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectParticipant(p.id)}
                    className={`w-full text-left rounded-2xl p-3.5 border transition ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#0C7A89]/14 via-[#0C7A89]/6 to-[#D88B15]/8 border-[#0C7A89] shadow-sm'
                        : 'bg-white/85 border-slate-200/80 hover:border-[#0C7A89]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
                      <span className="text-[#0C7A89] font-bold truncate">
                        {catLabel} · {p.entityType}
                      </span>
                      {savedTotal !== null ? (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums font-bold text-[#07525E] shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0C7A89]" />
                          {savedTotal.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[#D88B15] font-semibold shrink-0">
                          Belum Dinilai
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-900 leading-snug break-words">
                      {p.entityName}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                      {p.innovationTitle}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Column: Evaluation Workspace */}
        <section
          ref={scoringSectionRef}
          className="lg:col-span-8 glass-panel rounded-3xl p-4 sm:p-7"
        >
          {!selectedParticipant ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Pilih peserta dari daftar di samping untuk mulai menilai.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveScores} className="space-y-6">
              {/* Participant Header & Multi-Material Section */}
              <div className="pb-5 border-b border-slate-200/70 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 font-medium">
                      <span className="font-bold text-[#07525E]">
                        Award {getAwardCategoryLabel(selectedParticipant.awardCategory)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-bold text-[#0C7A89]">
                        {selectedParticipant.entityType}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedParticipant.province}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-[#D88B15]">
                        {selectedMaterials.length} Bahan Lampiran
                      </span>
                    </div>
                    <h2 className="mt-1 text-lg sm:text-xl font-bold text-[#07525E] break-words">
                      {selectedParticipant.entityName}
                    </h2>
                    <p className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-800 break-words">
                      {selectedParticipant.innovationTitle}
                    </p>
                    {selectedParticipant.notes && (
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed break-words">
                        {selectedParticipant.notes}
                      </p>
                    )}
                  </div>

                  {selectedMaterials.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onPreviewMaterial(selectedParticipant)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0C7A89] to-[#07525E] hover:brightness-110 transition whitespace-nowrap shrink-0 self-start"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Pratinjau Bahan ({selectedMaterials.length})</span>
                    </button>
                  )}
                </div>

                {/* All Attached Materials List */}
                {selectedMaterials.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedMaterials.map((mat, idx) => (
                      <div
                        key={mat.id}
                        className="rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2.5 flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0C7A89]/15 to-[#07525E]/10 text-[#07525E] flex items-center justify-center shrink-0">
                            {mat.type === 'PDF/PPT' && <FileText className="w-3.5 h-3.5" />}
                            {mat.type === 'Video' && <Video className="w-3.5 h-3.5" />}
                            {mat.type === 'Link' && <Link2 className="w-3.5 h-3.5" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {idx + 1}. {mat.title}
                            </div>
                            <div className="text-[11px] text-[#0C7A89] font-medium">
                              {mat.type}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onPreviewMaterial(selectedParticipant, mat.id)}
                            className="p-1.5 rounded-lg text-[#07525E] hover:bg-[#0C7A89]/10 transition"
                            title={`Pratinjau ${mat.title}`}
                            aria-label={`Pratinjau ${mat.title}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={mat.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-[#0C7A89] hover:bg-[#0C7A89]/10 transition"
                            title={`Buka tautan ${mat.title}`}
                            aria-label={`Buka tautan ${mat.title}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Indicators Scoring Form (Dynamic per Award Category) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h3 className="text-sm font-bold text-[#07525E]">
                    Indikator Kategori {getAwardCategoryLabel(selectedParticipant.awardCategory)} (Skala 0 – 100)
                  </h3>
                  <span className="text-xs text-slate-500">
                    Bobot khusus kategori ini:{' '}
                    <span className="font-mono font-semibold text-[#07525E]">
                      {activeIndicators.map((i) => `${i.weight}%`).join(' · ')}
                    </span>
                  </span>
                </div>

                {activeIndicators.map((ind) => {
                  const raw = draftScores[ind.id] ?? 0;
                  const weighted = computeWeightedScore(raw, ind.weight);

                  return (
                    <div
                      key={ind.id}
                      className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white/95 via-white/90 to-[#F5FAFB]/90 p-4 sm:p-5 space-y-3.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900">
                            {ind.order}. {ind.name}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            {ind.description}
                          </p>
                        </div>
                        <div className="text-xs font-mono tabular-nums font-bold text-[#D88B15] shrink-0">
                          Bobot {ind.weight}%
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 sm:gap-4 items-center pt-1">
                        <div className="col-span-2 sm:col-span-6">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={0.5}
                            value={raw}
                            onChange={(e) => handleScoreInputChange(ind.id, e.target.value)}
                            aria-label={`Slider nilai ${ind.name}`}
                            className="w-full wahdah-slider"
                          />
                          <div className="flex justify-between text-[10px] font-mono tabular-nums text-slate-400 mt-1">
                            <span>0</span>
                            <span>25</span>
                            <span>50</span>
                            <span>75</span>
                            <span>100</span>
                          </div>
                        </div>

                        <div className="col-span-1 sm:col-span-3">
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Nilai Murni
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={raw}
                            onChange={(e) => handleScoreInputChange(ind.id, e.target.value)}
                            className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-mono tabular-nums font-bold text-[#07525E] text-right focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89]"
                          />
                        </div>

                        <div className="col-span-1 sm:col-span-3 rounded-xl bg-gradient-to-br from-[#0C7A89]/10 to-[#07525E]/5 border border-[#0C7A89]/15 px-3 py-2 text-right">
                          <div className="text-[11px] font-medium text-slate-500">
                            Nilai Terbobot
                          </div>
                          <div className="text-base font-mono tabular-nums font-extrabold text-[#07525E]">
                            {weighted.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Judge Evaluation Notes */}
              <div>
                <label
                  htmlFor="judge-notes"
                  className="block text-xs font-semibold text-slate-700 mb-2"
                >
                  Catatan Evaluasi Dewan Juri (Opsional)
                </label>
                <textarea
                  id="judge-notes"
                  rows={2}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="Tuliskan apresiasi atau rekomendasi penguatan untuk peserta ini..."
                  className="w-full rounded-xl bg-white/95 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition resize-none"
                />
              </div>

              {saveFeedback && (
                <div
                  role="status"
                  className={`rounded-xl px-4 py-3 text-xs font-medium break-words ${
                    saveFeedback.type === 'success'
                      ? 'bg-[#0C7A89]/10 text-[#07525E] border border-[#0C7A89]/25'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {saveFeedback.message}
                </div>
              )}

              {/* Live Summary & Submit Bar */}
              <div className="rounded-2xl bg-gradient-to-r from-[#07525E] via-[#096472] to-[#0C7A89] text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
                <div>
                  <div className="text-xs font-medium text-white/80">
                    Total Nilai Terbobot ({activeJudge.label} ·{' '}
                    {getAwardCategoryLabel(selectedParticipant.awardCategory)})
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums">
                      {liveTotalWeighted.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono text-white/75">/ 100.00</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#07525E] bg-gradient-to-r from-white to-amber-50 hover:brightness-105 disabled:opacity-60 transition shadow-sm whitespace-nowrap shrink-0"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0C7A89]" />
                  ) : (
                    <Save className="w-4 h-4 text-[#D88B15]" />
                  )}
                  <span>{isSaving ? 'Menyimpan Nilai...' : 'Simpan Penilaian'}</span>
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
