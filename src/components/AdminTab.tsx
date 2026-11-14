import { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Handshake,
  Lightbulb,
  Link2,
  Loader2,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import {
  apiCreateParticipant,
  apiDeleteParticipant,
  apiUpdateParticipant,
  apiUploadFile,
} from '../services/api';
import {
  getAwardCategoryLabel,
  getParticipantMaterials,
  normalizeAwardCategory,
} from '../shared/scoring';
import { AWARD_CATEGORY_LIST } from '../shared/types';
import type {
  AwardCategory,
  BootstrapResponse,
  EntityType,
  MasterEntity,
  MaterialItem,
  MaterialType,
  ParticipantSubmission,
} from '../shared/types';
import { EntityCombobox } from './EntityCombobox';
import { SaveSuccessModal, type SaveSuccessPayload } from './SaveSuccessModal';

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
  const [awardCategory, setAwardCategory] = useState<AwardCategory>('KOLABORASI');
  const [entityType, setEntityType] = useState<EntityType>('DPW');
  const [entityId, setEntityId] = useState<string>('');
  const [innovationTitle, setInnovationTitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Dynamic multi-materials list
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [draftType, setDraftType] = useState<MaterialType>('Link');
  const [draftTitle, setDraftTitle] = useState<string>('');
  const [draftUrl, setDraftUrl] = useState<string>('');

  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [successPopup, setSuccessPopup] = useState<SaveSuccessPayload | null>(null);

  // List filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AwardCategory>('ALL');
  const [listFilter, setListFilter] = useState<'ALL' | EntityType>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<ParticipantSubmission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredMasterEntities = useMemo(() => {
    return entities.filter((e) => e.type === entityType);
  }, [entities, entityType]);

  // Entities already registered within the selected award category
  const submittedEntityIds = useMemo(() => {
    return new Set(
      participants
        .filter(
          (p) =>
            normalizeAwardCategory(p.awardCategory) === awardCategory && p.id !== editingId
        )
        .map((p) => p.entityId)
    );
  }, [participants, awardCategory, editingId]);

  const filteredParticipants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return participants.filter((p) => {
      if (
        categoryFilter !== 'ALL' &&
        normalizeAwardCategory(p.awardCategory) !== categoryFilter
      ) {
        return false;
      }
      if (listFilter !== 'ALL' && p.entityType !== listFilter) return false;
      if (!q) return true;
      return (
        p.entityName.toLowerCase().includes(q) ||
        p.province.toLowerCase().includes(q) ||
        p.innovationTitle.toLowerCase().includes(q)
      );
    });
  }, [participants, categoryFilter, listFilter, searchQuery]);

  const resetForm = (
    nextCategory: AwardCategory = awardCategory,
    nextType: EntityType = 'DPW'
  ) => {
    setEditingId(null);
    setAwardCategory(nextCategory);
    setEntityType(nextType);
    setEntityId('');
    setInnovationTitle('');
    setMaterials([]);
    setDraftType('Link');
    setDraftTitle('');
    setDraftUrl('');
    setNotes('');
  };

  const handleEntityTypeChange = (nextType: EntityType) => {
    setEntityType(nextType);
    setEntityId('');
    setFeedback(null);
  };

  const handleEditClick = (p: ParticipantSubmission) => {
    setEditingId(p.id);
    setAwardCategory(normalizeAwardCategory(p.awardCategory));
    setEntityType(p.entityType);
    setEntityId(p.entityId);
    setInnovationTitle(p.innovationTitle);
    setMaterials(getParticipantMaterials(p));
    setDraftType('Link');
    setDraftTitle('');
    setDraftUrl('');
    setNotes(p.notes);
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const detectTypeFromUrl = (url: string, fallback: MaterialType): MaterialType => {
    const lower = url.toLowerCase();
    if (/youtube\.com|youtu\.be|vimeo\.com|\.(mp4|webm|mov)$/i.test(lower)) {
      return 'Video';
    }
    if (/\.(pdf|ppt|pptx|doc|docx)$/i.test(lower)) {
      return 'PDF/PPT';
    }
    return fallback;
  };

  const handleAddLinkMaterial = () => {
    const cleanUrl = draftUrl.trim();
    if (!cleanUrl) {
      setFeedback({ type: 'error', message: 'Masukkan tautan URL bahan terlebih dahulu.' });
      return;
    }
    const inferredType = detectTypeFromUrl(cleanUrl, draftType);
    const nextItem: MaterialItem = {
      id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: draftType,
      title: draftTitle.trim() || `Bahan ${inferredType} #${materials.length + 1}`,
      url: cleanUrl,
    };
    setMaterials((prev) => [...prev, nextItem]);
    setDraftUrl('');
    setDraftTitle('');
    setFeedback(null);
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((item) => item.id !== id));
  };

  const handleFilesUpload = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setFeedback(null);
    setUploadProgress({ current: 0, total: files.length });

    const uploadedItems: MaterialItem[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ current: i + 1, total: files.length });
      try {
        const json = await apiUploadFile(file);
        const lower = file.name.toLowerCase();
        let fileMatType: MaterialType = 'PDF/PPT';
        if (/\.(mp4|webm|mov)$/i.test(lower)) {
          fileMatType = 'Video';
        } else if (/\.(png|jpe?g|webp|gif)$/i.test(lower)) {
          fileMatType = 'Link';
        }

        uploadedItems.push({
          id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: fileMatType,
          title: json.fileName || file.name,
          url: json.url,
          driveFileId: json.driveFileId,
          uploadedFileName: json.fileName || file.name,
          uploadedFileSize: json.fileSize || file.size,
        });
      } catch (err) {
        errors.push(
          `${file.name}: ${err instanceof Error ? err.message : 'Gagal mengunggah berkas.'}`
        );
      }
    }

    if (uploadedItems.length > 0) {
      setMaterials((prev) => [...prev, ...uploadedItems]);
    }

    if (errors.length > 0) {
      setFeedback({ type: 'error', message: errors.join(' · ') });
    } else if (uploadedItems.length > 0) {
      setFeedback({
        type: 'success',
        message: `${uploadedItems.length} berkas berhasil diunggah dan ditambahkan ke daftar bahan.`,
      });
    }

    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      setFeedback({ type: 'error', message: 'Judul karya / inovasi wajib diisi.' });
      return;
    }

    // Sertakan link yang sedang diketik namun belum sempat diklik "+ Tambah"
    const finalMaterials = [...materials];
    if (draftUrl.trim()) {
      finalMaterials.push({
        id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: draftType,
        title: draftTitle.trim() || `Bahan ${draftType} #${finalMaterials.length + 1}`,
        url: draftUrl.trim(),
      });
    }

    if (finalMaterials.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Tambahkan minimal 1 tautan bahan atau unggah file presentasi terlebih dahulu.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const primary = finalMaterials[0];
      const payload = {
        awardCategory,
        entityId,
        innovationTitle: innovationTitle.trim(),
        materialType: primary.type,
        materialUrl: primary.url,
        driveFileId: primary.driveFileId,
        uploadedFileName: primary.uploadedFileName,
        uploadedFileSize: primary.uploadedFileSize,
        materials: finalMaterials,
        notes: notes.trim(),
      };

      const savedEntityName =
        entities.find((ent) => ent.id === entityId)?.name || 'Entitas DPW/DPD';
      const savedTitle = innovationTitle.trim();
      const wasEditing = Boolean(editingId);
      const nextBootstrap = editingId
        ? await apiUpdateParticipant(editingId, payload)
        : await apiCreateParticipant(payload);

      onDataUpdated(nextBootstrap);
      const actionLabel = wasEditing ? 'diperbarui' : 'ditambahkan';
      const catName = getAwardCategoryLabel(awardCategory);
      resetForm(awardCategory, entityType);
      const successMsg = `Bahan Award ${catName} untuk ${savedEntityName} (${finalMaterials.length} bahan) berhasil ${actionLabel}.`;
      setFeedback({
        type: 'success',
        message: successMsg,
      });
      setSuccessPopup({
        variant: 'participant',
        title: wasEditing ? 'Perubahan Bahan Berhasil Disimpan!' : 'Bahan Peserta Berhasil Disimpan!',
        subtitle:
          'Data karya inovasi beserta tautan/berkas lampiran telah tercatat pada sistem dan langsung tersedia di Portal Penilaian Dewan Juri.',
        highlightLabel: 'Kategori Award',
        highlightValue: catName,
        details: [
          { label: 'Entitas', value: savedEntityName },
          { label: 'Judul Karya', value: savedTitle },
          { label: 'Lampiran', value: `${finalMaterials.length} bahan presentasi` },
          { label: 'Status Data', value: wasEditing ? 'Diperbarui' : 'Baru Didaftarkan' },
        ],
        savedAt: new Date().toLocaleString('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
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
      const nextBootstrap = await apiDeleteParticipant(deleteTarget.id);
      onDataUpdated(nextBootstrap);
      if (editingId === deleteTarget.id) {
        resetForm(awardCategory, entityType);
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

  const isUploading = uploadProgress !== null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
      {/* Form Input Bahan Peserta */}
      <section className="lg:col-span-5 glass-panel rounded-3xl p-4 sm:p-7">
        <div className="flex items-start justify-between gap-3 pb-4 sm:pb-5 border-b border-slate-200/70">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-[#07525E]">
              {editingId ? 'Perbarui Bahan Peserta' : 'Input Bahan Peserta'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Formulir pendaftaran dan unggah berkas oleh Admin Dewan Pimpinan Pusat Wahdah Islamiyah.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={() => resetForm(awardCategory, entityType)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-900/5 transition whitespace-nowrap shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Batal Edit</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Jenis Kategori Award */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Kategori Award yang Diikuti
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-gradient-to-r from-[#07525E]/[0.06] via-[#0C7A89]/[0.06] to-[#D88B15]/[0.08] border border-slate-200/70">
              {AWARD_CATEGORY_LIST.map((cat) => {
                const isSelected = awardCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setAwardCategory(cat.id);
                      setFeedback(null);
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#D88B15] to-[#B6720B] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat.id === 'KOLABORASI' ? (
                      <Handshake className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{cat.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Jenis Entitas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Jenis Entitas
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-gradient-to-r from-[#07525E]/[0.06] to-[#0C7A89]/[0.06] border border-slate-200/70">
              <button
                type="button"
                onClick={() => handleEntityTypeChange('DPW')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                  entityType === 'DPW'
                    ? 'bg-gradient-to-r from-[#0C7A89] to-[#07525E] text-white shadow-sm'
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
                    ? 'bg-gradient-to-r from-[#0C7A89] to-[#07525E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                DPD (Kab/Kota)
              </button>
            </div>
          </div>

          {/* Searchable Combobox Wilayah */}
          <EntityCombobox
            entityType={entityType}
            entities={filteredMasterEntities}
            value={entityId}
            submittedEntityIds={submittedEntityIds}
            onChange={(id) => setEntityId(id)}
          />

          {/* Judul Inovasi */}
          <div>
            <label htmlFor="innovation-title" className="block text-xs font-semibold text-slate-700 mb-2">
              Judul Karya / Program {getAwardCategoryLabel(awardCategory)}
            </label>
            <input
              id="innovation-title"
              type="text"
              value={innovationTitle}
              onChange={(e) => setInnovationTitle(e.target.value)}
              placeholder={
                awardCategory === 'KOLABORASI'
                  ? 'Contoh: Sinergi Wakaf Produktif Lintas Lembaga'
                  : 'Contoh: Inkubator Kemandirian Ekonomi Pemuda'
              }
              className="w-full rounded-xl bg-white/95 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
            />
          </div>

          {/* Multi-Bahan Builder */}
          <div className="space-y-3 rounded-2xl border border-[#0C7A89]/15 bg-gradient-to-br from-[#0C7A89]/[0.04] via-white/70 to-[#D88B15]/[0.04] p-4">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-bold text-[#07525E]">
                Daftar Bahan Presentasi ({materials.length} ditambahkan)
              </label>
              <span className="text-[11px] text-slate-500">Bisa lebih dari 1 file / tautan</span>
            </div>

            {/* Added Materials List */}
            {materials.length > 0 && (
              <div className="space-y-2">
                {materials.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-white/95 border border-slate-200/80 px-3 py-2.5 flex items-start justify-between gap-2.5 shadow-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0C7A89]/15 to-[#07525E]/10 text-[#07525E] flex items-center justify-center shrink-0 mt-0.5">
                        {item.type === 'PDF/PPT' && <FileText className="w-3.5 h-3.5" />}
                        {item.type === 'Video' && <Video className="w-3.5 h-3.5" />}
                        {item.type === 'Link' && <Link2 className="w-3.5 h-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 break-words">
                          {idx + 1}. {item.title}
                        </div>
                        <div className="text-[11px] text-[#0C7A89] font-medium mt-0.5">
                          {item.type}
                          {typeof item.uploadedFileSize === 'number' &&
                            ` · ${(item.uploadedFileSize / 1024 / 1024).toFixed(2)} MB`}
                        </div>
                        <div className="text-[11px] text-slate-500 break-all line-clamp-1 mt-0.5">
                          {item.url}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition shrink-0"
                      aria-label={`Hapus bahan ${item.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Link Form Row */}
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-900/[0.05] border border-slate-200/70">
                {(['Link', 'Video', 'PDF/PPT'] as MaterialType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDraftType(type)}
                    className={`inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition whitespace-nowrap ${
                      draftType === type
                        ? 'bg-white text-[#07525E] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {type === 'Link' && <Link2 className="w-3 h-3" />}
                    {type === 'Video' && <Video className="w-3 h-3" />}
                    {type === 'PDF/PPT' && <FileText className="w-3 h-3" />}
                    <span>{type}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Judul/Label bahan (opsional, mis: Video YouTube / Deck PDF)"
                className="w-full rounded-xl bg-white/95 border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
              />

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  placeholder="https://youtube.com/... atau https://drive.google.com/..."
                  className="flex-1 min-w-0 rounded-xl bg-white/95 border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
                />
                <button
                  type="button"
                  onClick={handleAddLinkMaterial}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#D88B15] to-[#B97209] hover:brightness-105 transition whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Tautan</span>
                </button>
              </div>
            </div>

            {/* Multi-File Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  void handleFilesUpload(e.dataTransfer.files);
                }
              }}
              className="rounded-xl border border-dashed border-[#0C7A89]/35 bg-white/75 p-3.5 text-center hover:bg-white/95 transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.ppt,.pptx,.doc,.docx,.mp4,.webm,.mov,.png,.jpg,.jpeg"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    void handleFilesUpload(e.target.files);
                  }
                }}
                className="hidden"
              />
              {isUploading && uploadProgress ? (
                <div className="py-1 flex items-center justify-center gap-2 text-xs font-semibold text-[#0C7A89]">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>
                    Mengunggah berkas {uploadProgress.current} dari {uploadProgress.total}...
                  </span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-5 h-5 text-[#0C7A89] mx-auto" />
                  <div className="mt-1.5 text-xs font-medium text-slate-700">
                    Tarik banyak berkas ke sini atau{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="font-semibold text-[#0C7A89] underline underline-offset-2 hover:text-[#07525E]"
                    >
                      pilih file dari perangkat
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Bisa pilih lebih dari 1 file sekaligus (PDF, PPT, Video, Gambar)
                  </p>
                </>
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
              className="w-full rounded-xl bg-white/95 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition resize-none"
            />
          </div>

          {feedback && (
            <div
              role="status"
              className={`rounded-2xl px-4 py-3.5 text-xs font-semibold break-words flex items-start gap-2.5 shadow-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {feedback.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#0C7A89] via-[#096472] to-[#07525E] hover:brightness-110 disabled:opacity-60 transition shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>
              {isSubmitting
                ? 'Menyimpan Data...'
                : editingId
                  ? 'Simpan Perubahan Peserta'
                  : 'Simpan Bahan Peserta'}
            </span>
          </button>
        </form>
      </section>

      {/* Daftar Bahan Peserta Terdaftar */}
      <section className="lg:col-span-7 glass-panel rounded-3xl p-4 sm:p-7">
        <div className="flex flex-col gap-3.5 pb-4 sm:pb-5 border-b border-slate-200/70">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#07525E]">
                Daftar Bahan Peserta Terdaftar
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                Total {participants.length} karya terdaftar di kedua kategori
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
                      ? 'bg-gradient-to-r from-[#0C7A89] to-[#07525E] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'ALL' ? 'Semua' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900/[0.04] border border-slate-200/70 self-start">
            {(
              [
                { id: 'ALL', label: 'Semua Kategori' },
                { id: 'KOLABORASI', label: 'Award Kolaborasi' },
                { id: 'INOVASI_MANDIRI', label: 'Award Inovasi Mandiri' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                  categoryFilter === cat.id
                    ? 'bg-gradient-to-r from-[#D88B15] to-[#B6720B] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
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
            className="w-full rounded-xl bg-white/95 border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
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
            filteredParticipants.map((p) => {
              const mats = getParticipantMaterials(p);
              const catLabel = getAwardCategoryLabel(p.awardCategory);
              return (
                <article
                  key={p.id}
                  className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white/95 via-white/90 to-[#F6FAFB]/90 p-4 sm:p-5 hover:border-[#0C7A89]/40 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 font-medium">
                        <span className="font-bold text-[#07525E]">{catLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-bold text-[#0C7A89]">{p.entityType}</span>
                        <span aria-hidden="true">·</span>
                        <span>{p.province}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#D88B15] font-semibold">
                          {mats.length} Bahan ({Array.from(new Set(mats.map((m) => m.type))).join(', ')})
                        </span>
                      </div>
                      <h3 className="mt-1 text-sm sm:text-base font-bold text-[#07525E] leading-snug break-words">
                        {p.entityName}
                      </h3>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-800 break-words">
                        {p.innovationTitle}
                      </p>
                      {p.notes && (
                        <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {p.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onPreviewMaterial(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#07525E] bg-[#0C7A89]/10 hover:bg-[#0C7A89]/20 transition whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Pratinjau ({mats.length})</span>
                      </button>
                      <a
                        href={p.materialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl text-slate-600 hover:text-[#07525E] hover:bg-slate-900/5 transition"
                        title="Buka tautan bahan utama"
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
              );
            })
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
              (Kategori {getAwardCategoryLabel(deleteTarget.awardCategory)}) beserta seluruh nilai juri yang terkait. Tindakan ini tidak dapat dibatalkan.
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Save Success Pop-up */}
      <SaveSuccessModal
        payload={successPopup}
        onClose={() => setSuccessPopup(null)}
      />
    </div>
  );
}
