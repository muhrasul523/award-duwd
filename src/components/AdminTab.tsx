import { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Link2,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import type {
  BootstrapResponse,
  EntityType,
  MasterEntity,
  MaterialType,
  ParticipantSubmission,
} from '../shared/types';

interface AdminTabProps {
  entities: MasterEntity[];
  participants: ParticipantSubmission[];
  onDataUpdated: (data: BootstrapResponse) => void;
  onPreviewMaterial: (participant: ParticipantSubmission) => void;
}

export function AdminTab({
  entities,
  participants,
  onDataUpdated,
  onPreviewMaterial,
}: AdminTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entityType, setEntityType] = useState<EntityType>('DPW');
  const [entityId, setEntityId] = useState<string>('');
  const [innovationTitle, setInnovationTitle] = useState<string>('');
  const [materialType, setMaterialType] = useState<MaterialType>('PDF/PPT');
  const [materialUrl, setMaterialUrl] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | undefined>(undefined);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState<string>('');

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // List filters
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState<'ALL' | EntityType>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<ParticipantSubmission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredMasterEntities = useMemo(() => {
    return entities.filter((e) => e.type === entityType);
  }, [entities, entityType]);

  const submittedEntityIds = useMemo(() => {
    return new Set(participants.map((p) => p.entityId));
  }, [participants]);

  const filteredParticipants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return participants.filter((p) => {
      if (listFilter !== 'ALL' && p.entityType !== listFilter) return false;
      if (!q) return true;
      return (
        p.entityName.toLowerCase().includes(q) ||
        p.province.toLowerCase().includes(q) ||
        p.innovationTitle.toLowerCase().includes(q)
      );
    });
  }, [participants, listFilter, searchQuery]);

  const resetForm = (nextType: EntityType = 'DPW') => {
    setEditingId(null);
    setEntityType(nextType);
    setEntityId('');
    setInnovationTitle('');
    setMaterialType('PDF/PPT');
    setMaterialUrl('');
    setUploadedFileName(undefined);
    setUploadedFileSize(undefined);
    setNotes('');
  };

  const handleEntityTypeChange = (nextType: EntityType) => {
    setEntityType(nextType);
    setEntityId('');
    setFeedback(null);
  };

  const handleEditClick = (p: ParticipantSubmission) => {
    setEditingId(p.id);
    setEntityType(p.entityType);
    setEntityId(p.entityId);
    setInnovationTitle(p.innovationTitle);
    setMaterialType(p.materialType);
    setMaterialUrl(p.materialUrl);
    setUploadedFileName(p.uploadedFileName);
    setUploadedFileSize(p.uploadedFileSize);
    setNotes(p.notes);
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json = (await res.json()) as {
        url?: string;
        fileName?: string;
        fileSize?: number;
        error?: string;
      };

      if (!res.ok || !json.url) {
        throw new Error(json.error || 'Gagal mengunggah file.');
      }

      setMaterialUrl(json.url);
      setUploadedFileName(json.fileName);
      setUploadedFileSize(json.fileSize);

      const lower = file.name.toLowerCase();
      if (/\.(mp4|webm|mov)$/i.test(lower)) {
        setMaterialType('Video');
      } else if (/\.(pdf|ppt|pptx|doc|docx)$/i.test(lower)) {
        setMaterialType('PDF/PPT');
      }

      setFeedback({
        type: 'success',
        message: `File "${file.name}" berhasil diunggah dan ditautkan.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan saat unggah file.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!entityId) {
      setFeedback({ type: 'error', message: 'Silakan pilih wilayah DPW/DPD terlebih dahulu.' });
      return;
    }
    if (!innovationTitle.trim()) {
      setFeedback({ type: 'error', message: 'Judul inovasi wajib diisi.' });
      return;
    }
    if (!materialUrl.trim()) {
      setFeedback({
        type: 'error',
        message: 'Masukkan tautan bahan atau unggah file presentasi terlebih dahulu.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = editingId ? `/api/participants/${editingId}` : '/api/participants';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId,
          innovationTitle: innovationTitle.trim(),
          materialType,
          materialUrl: materialUrl.trim(),
          uploadedFileName,
          uploadedFileSize,
          notes: notes.trim(),
        }),
      });

      const json = (await res.json()) as {
        bootstrap?: BootstrapResponse;
        error?: string;
      };

      if (!res.ok || !json.bootstrap) {
        throw new Error(json.error || 'Gagal menyimpan data peserta.');
      }

      onDataUpdated(json.bootstrap);
      const actionLabel = editingId ? 'diperbarui' : 'ditambahkan';
      resetForm(entityType);
      setFeedback({
        type: 'success',
        message: `Bahan inovasi peserta berhasil ${actionLabel} ke dalam database.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal menyimpan data.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/participants/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as {
        bootstrap?: BootstrapResponse;
        error?: string;
      };
      if (!res.ok || !json.bootstrap) {
        throw new Error(json.error || 'Gagal menghapus data peserta.');
      }
      onDataUpdated(json.bootstrap);
      if (editingId === deleteTarget.id) {
        resetForm(entityType);
      }
      setDeleteTarget(null);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal menghapus peserta.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Form Input Bahan Peserta */}
      <section className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3 pb-5 border-b border-slate-200/70">
          <div>
            <h2 className="text-lg font-bold text-[#07525E]">
              {editingId ? 'Perbarui Bahan Peserta' : 'Input Bahan Peserta'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Formulir pendaftaran dan unggah berkas inovasi oleh Admin DPP Wahdah Islamiyah.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={() => resetForm(entityType)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-900/5 transition whitespace-nowrap shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Batal Edit</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Jenis Entitas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Jenis Entitas
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-900/[0.05] border border-slate-200/70">
              <button
                type="button"
                onClick={() => handleEntityTypeChange('DPW')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                  entityType === 'DPW'
                    ? 'bg-white text-[#07525E] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                DPW (Provinsi)
              </button>
              <button
                type="button"
                onClick={() => handleEntityTypeChange('DPD')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                  entityType === 'DPD'
                    ? 'bg-white text-[#07525E] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                DPD (Kab/Kota)
              </button>
            </div>
          </div>

          {/* Dropdown Wilayah Dinamis */}
          <div>
            <label htmlFor="entity-select" className="block text-xs font-semibold text-slate-700 mb-2">
              Wilayah {entityType === 'DPW' ? 'Dewan Pengurus Wilayah (Provinsi)' : 'Dewan Pengurus Daerah (Kab/Kota)'}
            </label>
            <select
              id="entity-select"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="w-full rounded-xl bg-white/90 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
            >
              <option value="">
                -- Pilih {entityType === 'DPW' ? 'DPW Provinsi' : 'DPD Kab/Kota'} ({filteredMasterEntities.length} tersedia) --
              </option>
              {filteredMasterEntities.map((ent) => {
                const hasSubmitted = submittedEntityIds.has(ent.id);
                return (
                  <option key={ent.id} value={ent.id}>
                    {ent.name} ({ent.province}){hasSubmitted ? ' — Sudah Terdaftar' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Judul Inovasi */}
          <div>
            <label htmlFor="innovation-title" className="block text-xs font-semibold text-slate-700 mb-2">
              Judul Inovasi
            </label>
            <input
              id="innovation-title"
              type="text"
              value={innovationTitle}
              onChange={(e) => setInnovationTitle(e.target.value)}
              placeholder="Contoh: Ekosistem Wakaf Produktif & Layanan Ummat"
              className="w-full rounded-xl bg-white/90 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
            />
          </div>

          {/* Tipe Bahan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Tipe Bahan Presentasi
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-900/[0.05] border border-slate-200/70">
              {(['Link', 'Video', 'PDF/PPT'] as MaterialType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMaterialType(type)}
                  className={`inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                    materialType === type
                      ? 'bg-white text-[#07525E] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type === 'Link' && <Link2 className="w-3.5 h-3.5" />}
                  {type === 'Video' && <Video className="w-3.5 h-3.5" />}
                  {type === 'PDF/PPT' && <FileText className="w-3.5 h-3.5" />}
                  <span>{type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tautan / Upload File */}
          <div className="space-y-3">
            <label htmlFor="material-url" className="block text-xs font-semibold text-slate-700">
              Tautan Bahan atau Unggah Berkas
            </label>
            <input
              id="material-url"
              type="text"
              value={materialUrl}
              onChange={(e) => {
                setMaterialUrl(e.target.value);
                if (!e.target.value.startsWith('/uploads/')) {
                  setUploadedFileName(undefined);
                  setUploadedFileSize(undefined);
                }
              }}
              placeholder="https://drive.google.com/... atau unggah file di bawah"
              className="w-full rounded-xl bg-white/90 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
            />

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFileUpload(file);
              }}
              className="rounded-2xl border border-dashed border-[#0C7A89]/35 bg-[#0C7A89]/[0.03] p-4 text-center hover:bg-[#0C7A89]/[0.06] transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.mp4,.webm,.mov,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                }}
                className="hidden"
              />
              <UploadCloud className="w-6 h-6 text-[#0C7A89] mx-auto" />
              <div className="mt-2 text-xs font-medium text-slate-700">
                {isUploading ? (
                  <span className="text-[#0C7A89] font-semibold">Mengunggah berkas...</span>
                ) : (
                  <>
                    Tarik berkas ke sini atau{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="font-semibold text-[#0C7A89] underline underline-offset-2 hover:text-[#07525E]"
                    >
                      pilih file dari perangkat
                    </button>
                  </>
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Mendukung PDF, PPT/PPTX, Video MP4/WebM, Gambar (maks. 25 MB)
              </p>

              {uploadedFileName && (
                <div className="mt-3 pt-3 border-t border-[#0C7A89]/15 flex items-center justify-between gap-2 text-left text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#07525E] truncate">{uploadedFileName}</div>
                    {typeof uploadedFileSize === 'number' && (
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        {(uploadedFileSize / 1024 / 1024).toFixed(2)} MB
                      </div>
                    )}
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-[#0C7A89] shrink-0" />
                </div>
              )}
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label htmlFor="admin-notes" className="block text-xs font-semibold text-slate-700 mb-2">
              Catatan &amp; Ringkasan Program
            </label>
            <textarea
              id="admin-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ringkasan dampak, mitra kolaborasi, atau keterangan tambahan untuk dewan juri..."
              className="w-full rounded-xl bg-white/90 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition resize-none"
            />
          </div>

          {feedback && (
            <div
              role="status"
              className={`rounded-xl px-4 py-3 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'bg-[#0C7A89]/10 text-[#07525E] border border-[#0C7A89]/25'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#0C7A89] to-[#07525E] hover:brightness-110 disabled:opacity-60 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Menyimpan...'
                : editingId
                  ? 'Simpan Perubahan Peserta'
                  : 'Simpan Bahan Peserta'}
            </span>
          </button>
        </form>
      </section>

      {/* Daftar Bahan Peserta Terdaftar */}
      <section className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200/70">
          <div>
            <h2 className="text-lg font-bold text-[#07525E]">
              Daftar Bahan Peserta Terdaftar
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Total {participants.length} entitas telah mengumpulkan berkas inovasi
            </p>
          </div>

          <div className="inline-flex items-center p-1 rounded-xl bg-slate-900/[0.05] border border-slate-200/70 self-start">
            {(['ALL', 'DPW', 'DPD'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setListFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                  listFilter === tab
                    ? 'bg-white text-[#07525E] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'Semua' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama DPW/DPD, provinsi, atau judul inovasi..."
            className="w-full rounded-xl bg-white/90 border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
          />
        </div>

        {/* Participant Cards List */}
        <div className="mt-5 space-y-3">
          {filteredParticipants.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Belum ada peserta yang sesuai dengan filter.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Ubah kata kunci pencarian atau tambahkan bahan peserta baru melalui formulir.
              </p>
            </div>
          ) : (
            filteredParticipants.map((p) => (
              <article
                key={p.id}
                className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 hover:border-[#0C7A89]/40 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                      <span className="font-bold text-[#0C7A89]">{p.entityType}</span>
                      <span aria-hidden="true">·</span>
                      <span>{p.province}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#D88B15] font-semibold">{p.materialType}</span>
                    </div>
                    <h3 className="mt-1 text-base font-bold text-[#07525E] leading-snug">
                      {p.entityName}
                    </h3>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">
                      {p.innovationTitle}
                    </p>
                    {p.notes && (
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {p.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPreviewMaterial(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#07525E] bg-[#0C7A89]/10 hover:bg-[#0C7A89]/20 transition whitespace-nowrap"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Pratinjau</span>
                    </button>
                    <a
                      href={p.materialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-slate-600 hover:text-[#07525E] hover:bg-slate-900/5 transition"
                      title="Buka tautan bahan"
                      aria-label={`Buka tautan bahan ${p.entityName}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleEditClick(p)}
                      className="p-2 rounded-xl text-slate-600 hover:text-[#0C7A89] hover:bg-[#0C7A89]/10 transition"
                      title="Edit bahan peserta"
                      aria-label={`Edit ${p.entityName}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(p)}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                      title="Hapus peserta"
                      aria-label={`Hapus ${p.entityName}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#07525E]/35 backdrop-blur-md p-4"
          onClick={() => !isDeleting && setDeleteTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="glass-panel-strong w-full max-w-md rounded-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900">Hapus Data Peserta?</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Anda akan menghapus pengajuan dari{' '}
              <span className="font-semibold text-slate-900">{deleteTarget.entityName}</span>{' '}
              beserta seluruh nilai juri yang terkait. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-900/5 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleConfirmDelete()}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
