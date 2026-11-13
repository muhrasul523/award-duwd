import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  KeyRound,
  LogOut,
  Phone,
  Save,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  computeJudgeTotalWeighted,
  computeWeightedScore,
  formatWhatsAppDisplay,
} from '../shared/scoring';
import type {
  BootstrapResponse,
  EntityType,
  JudgeScoreRecord,
  MasterIndicator,
  MasterJudge,
  ParticipantSubmission,
} from '../shared/types';

interface JudgePortalTabProps {
  judges: MasterJudge[];
  indicators: MasterIndicator[];
  participants: ParticipantSubmission[];
  scores: JudgeScoreRecord[];
  activeJudge: MasterJudge | null;
  onJudgeAuthenticated: (judge: MasterJudge) => void;
  onJudgeLogout: () => void;
  onDataUpdated: (data: BootstrapResponse) => void;
  onPreviewMaterial: (participant: ParticipantSubmission) => void;
}

export function JudgePortalTab({
  judges,
  indicators,
  participants,
  scores,
  activeJudge,
  onJudgeAuthenticated,
  onJudgeLogout,
  onDataUpdated,
  onPreviewMaterial,
}: JudgePortalTabProps) {
  const [waInput, setWaInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Workspace state
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
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

  const sortedIndicators = useMemo(
    () => [...indicators].sort((a, b) => a.order - b.order),
    [indicators]
  );

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
  }, [participants, entityFilter, statusFilter, searchQuery, judgeScoreMap]);

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

  // Load saved scores or initialize defaults when selected participant or activeJudge changes
  useEffect(() => {
    if (!activeJudge || !selectedParticipant) return;
    const existing = judgeScoreMap.get(selectedParticipant.id);
    const initial: Record<string, number> = {};
    for (const ind of sortedIndicators) {
      initial[ind.id] = existing?.scores[ind.id] ?? 80;
    }
    setDraftScores(initial);
    setDraftNotes(existing?.notes ?? '');
    setSaveFeedback(null);
  }, [activeJudge, selectedParticipant, judgeScoreMap, sortedIndicators]);

  const liveTotalWeighted = useMemo(
    () => computeJudgeTotalWeighted(draftScores, sortedIndicators),
    [draftScores, sortedIndicators]
  );

  const performWhatsAppAuth = async (waNumber: string) => {
    setAuthError(null);
    setIsAuthenticating(true);
    try {
      const res = await fetch('/api/judges/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp: waNumber }),
      });
      const json = (await res.json()) as { judge?: MasterJudge; error?: string };
      if (!res.ok || !json.judge) {
        throw new Error(json.error || 'Autentikasi gagal.');
      }
      onJudgeAuthenticated(json.judge);
      setWaInput('');
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Gagal mencocokkan nomor WhatsApp.'
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void performWhatsAppAuth(waInput);
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
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: selectedParticipant.id,
          judgeId: activeJudge.id,
          scores: draftScores,
          notes: draftNotes,
        }),
      });
      const json = (await res.json()) as {
        bootstrap?: BootstrapResponse;
        error?: string;
      };
      if (!res.ok || !json.bootstrap) {
        throw new Error(json.error || 'Gagal menyimpan penilaian.');
      }
      onDataUpdated(json.bootstrap);
      setSaveFeedback({
        type: 'success',
        message: `Penilaian untuk ${selectedParticipant.entityName} berhasil disimpan (Total Terbobot: ${liveTotalWeighted.toFixed(2)}).`,
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

  // Unauthenticated View: WhatsApp Login Card
  if (!activeJudge) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="glass-panel rounded-3xl p-7 sm:p-9">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0C7A89] to-[#07525E] text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#07525E]">
                Autentikasi Portal Dewan Juri
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Masukkan nomor WhatsApp resmi yang terdaftar pada Master Dewan Juri DPP Wahdah Islamiyah.
              </p>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="judge-wa-input"
                className="block text-xs font-semibold text-slate-700 mb-2"
              >
                Nomor WhatsApp Juri
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="judge-wa-input"
                  type="tel"
                  value={waInput}
                  onChange={(e) => setWaInput(e.target.value)}
                  placeholder="Contoh: 08114401001 atau +628114401001"
                  className="w-full rounded-xl bg-white/95 border border-slate-200 pl-10 pr-4 py-3 text-sm font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
                />
              </div>
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
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#0C7A89] to-[#07525E] hover:brightness-110 disabled:opacity-60 transition shadow-sm"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isAuthenticating ? 'Memverifikasi...' : 'Masuk ke Ruang Penilaian'}</span>
            </button>
          </form>

          {/* Master Judges Quick Reference */}
          <div className="mt-7 pt-6 border-t border-slate-200/70">
            <h3 className="text-xs font-semibold text-slate-500">
              Direktori Master Dewan Juri (Klik untuk Masuk Cepat)
            </h3>
            <div className="mt-3 divide-y divide-slate-200/60 rounded-2xl border border-slate-200/80 bg-white/75 overflow-hidden">
              {judges.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => void performWhatsAppAuth(j.whatsapp)}
                  className="w-full px-4 py-3 text-left hover:bg-[#0C7A89]/[0.06] transition flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#07525E]">
                      {j.label} · {j.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">{j.title}</div>
                  </div>
                  <span className="font-mono tabular-nums text-xs font-semibold text-[#0C7A89] shrink-0">
                    {formatWhatsAppDisplay(j.whatsapp)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Workspace View
  const scoredByActiveCount = participants.filter((p) => judgeScoreMap.has(p.id)).length;

  return (
    <div className="space-y-6">
      {/* Active Judge Session Header */}
      <div className="glass-panel rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="font-bold text-[#0C7A89]">{activeJudge.label}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              WA {formatWhatsAppDisplay(activeJudge.whatsapp)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[#D88B15] font-semibold tabular-nums">
              {scoredByActiveCount} / {participants.length} Peserta Dinilai
            </span>
          </div>
          <div className="text-base font-bold text-[#07525E] mt-0.5 truncate">
            {activeJudge.name}
          </div>
        </div>

        <button
          type="button"
          onClick={onJudgeLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Ganti / Keluar Juri</span>
        </button>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Participant Selector */}
        <aside className="lg:col-span-4 glass-panel rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#07525E]">Daftar Peserta</h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {filteredParticipants.length} entitas
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari wilayah atau inovasi..."
              className="w-full rounded-xl bg-white/90 border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex p-0.5 rounded-lg bg-slate-900/[0.05] text-[11px] font-semibold">
              {(['ALL', 'UNSCORED', 'SCORED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md transition whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-white text-[#07525E] shadow-sm'
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
                      ? 'bg-white text-[#07525E] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {et === 'ALL' ? 'All' : et}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {filteredParticipants.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 rounded-2xl bg-white/60 border border-slate-200/70">
                Tidak ada peserta pada filter ini.
              </div>
            ) : (
              filteredParticipants.map((p) => {
                const record = judgeScoreMap.get(p.id);
                const isSelected = p.id === selectedParticipantId;
                const savedTotal = record
                  ? computeJudgeTotalWeighted(record.scores, sortedIndicators)
                  : null;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedParticipantId(p.id)}
                    className={`w-full text-left rounded-2xl p-3.5 border transition ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#0C7A89]/10 to-[#07525E]/5 border-[#0C7A89] shadow-sm'
                        : 'bg-white/80 border-slate-200/80 hover:border-[#0C7A89]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
                      <span className="text-[#0C7A89] font-bold">
                        {p.entityType} · {p.province}
                      </span>
                      {savedTotal !== null ? (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums font-bold text-[#07525E]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0C7A89]" />
                          {savedTotal.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[#D88B15] font-semibold">Belum Dinilai</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-900 leading-snug">
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
        <section className="lg:col-span-8 glass-panel rounded-3xl p-6 sm:p-7">
          {!selectedParticipant ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Pilih peserta dari daftar di samping untuk mulai menilai.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveScores} className="space-y-6">
              {/* Participant Header & Material Button */}
              <div className="pb-5 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                    <span className="font-bold text-[#0C7A89]">
                      {selectedParticipant.entityType}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedParticipant.province}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-[#D88B15]">
                      Bahan: {selectedParticipant.materialType}
                    </span>
                  </div>
                  <h2 className="mt-1 text-xl font-bold text-[#07525E]">
                    {selectedParticipant.entityName}
                  </h2>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800">
                    {selectedParticipant.innovationTitle}
                  </p>
                  {selectedParticipant.notes && (
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                      {selectedParticipant.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end gap-2 shrink-0">
                  <a
                    href={selectedParticipant.materialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0C7A89] to-[#07525E] hover:brightness-110 transition whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Bahan</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => onPreviewMaterial(selectedParticipant)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#07525E] bg-[#0C7A89]/10 hover:bg-[#0C7A89]/20 transition whitespace-nowrap"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Pratinjau</span>
                  </button>
                </div>
              </div>

              {/* Indicators Scoring Form */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#07525E]">
                    Input Nilai Murni Indikator (Skala 0 – 100)
                  </h3>
                  <span className="text-xs text-slate-500">
                    Konversi terbobot dihitung otomatis
                  </span>
                </div>

                {sortedIndicators.map((ind) => {
                  const raw = draftScores[ind.id] ?? 0;
                  const weighted = computeWeightedScore(raw, ind.weight);

                  return (
                    <div
                      key={ind.id}
                      className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 space-y-3.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
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

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-1">
                        <div className="sm:col-span-6">
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

                        <div className="sm:col-span-3">
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

                        <div className="sm:col-span-3 rounded-xl bg-[#0C7A89]/[0.06] border border-[#0C7A89]/15 px-3.5 py-2 text-right">
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
                  className="w-full rounded-xl bg-white/90 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition resize-none"
                />
              </div>

              {saveFeedback && (
                <div
                  role="status"
                  className={`rounded-xl px-4 py-3 text-xs font-medium ${
                    saveFeedback.type === 'success'
                      ? 'bg-[#0C7A89]/10 text-[#07525E] border border-[#0C7A89]/25'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {saveFeedback.message}
                </div>
              )}

              {/* Live Summary & Submit Bar */}
              <div className="rounded-2xl bg-gradient-to-r from-[#07525E] to-[#0C7A89] text-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-white/80">
                    Total Nilai Terbobot ({activeJudge.label})
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold font-mono tabular-nums">
                      {liveTotalWeighted.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono text-white/75">/ 100.00</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#07525E] bg-white hover:bg-amber-50 disabled:opacity-60 transition shadow-sm whitespace-nowrap shrink-0"
                >
                  <Save className="w-4 h-4 text-[#D88B15]" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Penilaian'}</span>
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
