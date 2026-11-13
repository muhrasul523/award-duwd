import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  FileSpreadsheet,
  FolderOpen,
  Link2,
  X,
} from 'lucide-react';
import gasCodeRaw from '../../apps-script/Code.gs?raw';
import {
  getAppsScriptUrl,
  getEnvAppsScriptUrl,
  setAppsScriptUrl,
  testAppsScriptConnection,
} from '../services/api';
import type { BootstrapResponse } from '../shared/types';

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (bootstrap: BootstrapResponse) => void;
}

export function AppsScriptModal({
  isOpen,
  onClose,
  onConnected,
}: AppsScriptModalProps) {
  const [urlInput, setUrlInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrlInput(getAppsScriptUrl());
      setFeedback(null);
      setCopiedCode(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const envUrl = getEnvAppsScriptUrl();

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const clean = urlInput.trim();
    if (!clean) {
      setAppsScriptUrl('');
      setFeedback({
        type: 'success',
        message: 'Koneksi Apps Script dihapus. Aplikasi kembali ke mode server lokal/default.',
      });
      return;
    }

    setIsTesting(true);
    try {
      const bootstrap = await testAppsScriptConnection(clean);
      setAppsScriptUrl(clean);
      onConnected(bootstrap);
      setFeedback({
        type: 'success',
        message: `Terhubung ke Google Spreadsheet (${bootstrap.participants.length} peserta, ${bootstrap.judges.length} juri).`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal terhubung ke Apps Script.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(gasCodeRaw);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      setFeedback({
        type: 'error',
        message: 'Gagal menyalin otomatis. Anda dapat menyalin langsung dari file apps-script/Code.gs.',
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07525E]/40 backdrop-blur-md p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gas-modal-title"
    >
      <div
        className="glass-panel-strong w-full max-w-3xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-200/70 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0C7A89]/12 text-[#0C7A89] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 id="gas-modal-title" className="text-lg font-bold text-[#07525E]">
                Koneksi Backend Google Apps Script &amp; Spreadsheet
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Simpan seluruh Master Juri, Indikator, Peserta, Penilaian, dan Upload Google Drive ke Spreadsheet panitia.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-900/5 transition"
            aria-label="Tutup modal pengaturan Apps Script"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Web App URL Form */}
          <form onSubmit={handleTestAndSave} className="space-y-3">
            <label
              htmlFor="gas-webapp-url"
              className="block text-xs font-semibold text-slate-700"
            >
              URL Web App Google Apps Script (/exec)
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="gas-webapp-url"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full rounded-xl bg-white/95 border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89]"
                />
              </div>
              <button
                type="submit"
                disabled={isTesting}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0C7A89] to-[#07525E] hover:brightness-110 disabled:opacity-60 transition whitespace-nowrap shrink-0"
              >
                {isTesting ? 'Menguji Koneksi...' : 'Uji & Simpan Koneksi'}
              </button>
            </div>
            {envUrl && (
              <p className="text-[11px] text-[#0C7A89] font-medium">
                Terdeteksi bawaan environment VITE_APPS_SCRIPT_URL: {envUrl}
              </p>
            )}
            {feedback && (
              <div
                role="status"
                className={`rounded-xl px-4 py-3 text-xs font-medium flex items-start gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-[#0C7A89]/10 text-[#07525E] border border-[#0C7A89]/25'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {feedback.type === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-[#0C7A89] shrink-0 mt-0.5" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}
          </form>

          {/* 7 Sheets Overview */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#07525E]">
                <Database className="w-4 h-4 text-[#0C7A89]" />
                <span>7 Sheet Otomatis di Google Spreadsheet Anda</span>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyCode()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#07525E] bg-[#0C7A89]/10 hover:bg-[#0C7A89]/20 transition whitespace-nowrap"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Kode Code.gs Tersalin' : 'Salin Kode Code.gs'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <div className="font-bold text-[#07525E]">1. Pengaturan</div>
                <div className="text-slate-600 mt-0.5 flex items-start gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-[#D88B15] shrink-0 mt-0.5" />
                  <span>
                    Menyimpan <code className="font-mono text-[11px]">DRIVE_FOLDER_URL</code> tujuan seluruh unggahan file ke Google Drive.
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <div className="font-bold text-[#07525E]">2. Master_Entitas</div>
                <div className="text-slate-600 mt-0.5">Daftar DPW (Provinsi) dan DPD (Kab/Kota).</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <div className="font-bold text-[#07525E]">3. Master_Juri</div>
                <div className="text-slate-600 mt-0.5">Daftar Juri A, B, C beserta nomor WhatsApp autentikasi.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <div className="font-bold text-[#07525E]">4. Master_Indikator</div>
                <div className="text-slate-600 mt-0.5">3 indikator penilaian lengkap dengan bobot (40%, 35%, 25%).</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <div className="font-bold text-[#07525E]">5. Peserta_Inovasi</div>
                <div className="text-slate-600 mt-0.5">Seluruh input admin beserta tautan file Google Drive.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <div className="font-bold text-[#07525E]">6. Penilaian_Juri &amp; 7. Rekap_Peringkat</div>
                <div className="text-slate-600 mt-0.5">Nilai murni juri &amp; rekap peringkat otomatis dengan tie-breaker.</div>
              </div>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <div className="font-bold text-[#07525E]">Langkah Pemasangan Singkat:</div>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                Buat 1 Google Spreadsheet baru, lalu buka menu{' '}
                <span className="font-semibold text-slate-800">Extensions &gt; Apps Script</span>.
              </li>
              <li>
                Klik tombol <span className="font-semibold text-slate-800">Salin Kode Code.gs</span> di atas, tempelkan menggantikan isi editor, lalu simpan.
              </li>
              <li>
                Pilih fungsi <code className="font-mono text-[#07525E]">setupSpreadsheet</code> di toolbar atas lalu klik <span className="font-semibold text-slate-800">Run</span> untuk membuat seluruh 7 sheet otomatis.
              </li>
              <li>
                Buka sheet <span className="font-semibold text-slate-800">Pengaturan</span> dan tempelkan link Folder Google Drive tujuan pada sel <code className="font-mono text-[#07525E]">B2</code>.
              </li>
              <li>
                Klik <span className="font-semibold text-slate-800">Deploy &gt; New deployment &gt; Web app</span> (<em>Execute as: Me</em>, <em>Who has access: Anyone</em>), lalu tempelkan URL <code className="font-mono">/exec</code> ke kolom di atas.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
