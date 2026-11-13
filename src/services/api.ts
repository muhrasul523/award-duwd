import {
  computeLeaderboard,
  extractJudgeAccessCode,
  getParticipantMaterials,
  normalizeAwardCategory,
  normalizeWhatsApp,
} from '../shared/scoring.ts';
import { createSeedDatabase } from '../shared/seedData.ts';
import type {
  AwardCategory,
  AwardDatabase,
  BootstrapResponse,
  MasterJudge,
  MaterialItem,
  MaterialType,
  ParticipantSubmission,
} from '../shared/types.ts';

const LOCAL_DB_KEY = 'wahdah_award_2026_local_db_v2';
const GAS_URL_KEY = 'wahdah_award_2026_gas_url_v1';

export function getEnvAppsScriptUrl(): string {
  const envUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
  return typeof envUrl === 'string' ? envUrl.trim() : '';
}

export function getAppsScriptUrl(): string {
  try {
    const saved = localStorage.getItem(GAS_URL_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // ignore storage errors
  }
  return getEnvAppsScriptUrl();
}

export function setAppsScriptUrl(url: string) {
  const clean = url.trim();
  try {
    if (clean) {
      localStorage.setItem(GAS_URL_KEY, clean);
    } else {
      localStorage.removeItem(GAS_URL_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function isUsingAppsScript(): boolean {
  return Boolean(getAppsScriptUrl());
}

function readLocalDb(): AwardDatabase {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AwardDatabase;
      if (
        Array.isArray(parsed.entities) &&
        Array.isArray(parsed.judges) &&
        Array.isArray(parsed.indicators) &&
        Array.isArray(parsed.participants) &&
        Array.isArray(parsed.scores)
      ) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  const seed = createSeedDatabase();
  writeLocalDb(seed);
  return seed;
}

function writeLocalDb(db: AwardDatabase) {
  try {
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
  } catch {
    // ignore quota errors
  }
}

function normalizeBootstrapPayload(data: BootstrapResponse): BootstrapResponse {
  const indicators = (data.indicators || []).map((ind) => ({
    ...ind,
    awardCategory: normalizeAwardCategory(ind.awardCategory),
  }));
  const participants = (data.participants || []).map((p) => ({
    ...p,
    awardCategory: normalizeAwardCategory(p.awardCategory),
    materials: getParticipantMaterials(p),
  }));
  const judges = (data.judges || []).map((j) => ({ ...j, whatsapp: '' }));
  const leaderboard = computeLeaderboard(
    participants,
    judges,
    indicators,
    data.scores || []
  );
  return {
    ...data,
    indicators,
    participants,
    judges,
    leaderboard,
  };
}

function buildLocalBootstrap(db: AwardDatabase): BootstrapResponse {
  return normalizeBootstrapPayload({
    ...db,
    leaderboard: [],
  });
}

async function callAppsScriptGet<T>(url: string, action: string): Promise<T> {
  const separator = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${separator}action=${encodeURIComponent(action)}`, {
    method: 'GET',
    redirect: 'follow',
  });
  const text = await res.text();
  let json: T & { error?: string };
  try {
    json = JSON.parse(text) as T & { error?: string };
  } catch {
    throw new Error(
      'Respons Apps Script bukan JSON valid. Pastikan Deployment disetel "Who has access: Anyone".'
    );
  }
  if (json.error) {
    throw new Error(json.error);
  }
  return json;
}

async function callAppsScriptPost<T>(
  url: string,
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  // Menggunakan text/plain agar bebas CORS preflight saat browser memanggil Google Apps Script
  const res = await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const text = await res.text();
  let json: T & { error?: string };
  try {
    json = JSON.parse(text) as T & { error?: string };
  } catch {
    throw new Error(
      'Respons Apps Script tidak valid. Periksa izin akses Web App ("Anyone") dan jalankan setupSpreadsheet() terlebih dahulu.'
    );
  }
  if (json.error) {
    throw new Error(json.error);
  }
  return json;
}

export async function testAppsScriptConnection(url: string): Promise<BootstrapResponse> {
  const clean = url.trim();
  if (!clean || !clean.startsWith('https://script.google.com/')) {
    throw new Error(
      'URL harus berupa Web App Google Apps Script (dimulai dengan https://script.google.com/...).'
    );
  }
  return callAppsScriptGet<BootstrapResponse>(clean, 'bootstrap');
}

export async function apiSetupSpreadsheet(url: string): Promise<BootstrapResponse> {
  const clean = url.trim();
  if (!clean || !clean.startsWith('https://script.google.com/')) {
    throw new Error(
      'URL harus berupa Web App Google Apps Script (dimulai dengan https://script.google.com/...).'
    );
  }
  const res = await callAppsScriptPost<{ bootstrap: BootstrapResponse }>(
    clean,
    'setupSpreadsheet',
    {}
  );
  return normalizeBootstrapPayload(res.bootstrap);
}

async function tryJsonFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<
  | { ok: true; status: number; data: T }
  | { ok: false; unavailable: boolean; status: number; error: string }
> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        unavailable: true,
        status: res.status,
        error: 'Backend API tidak tersedia pada hosting statis.',
      };
    }
    const json = (await res.json()) as T & { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        unavailable: false,
        status: res.status,
        error: json.error || 'Permintaan ke server gagal.',
      };
    }
    return { ok: true, status: res.status, data: json };
  } catch {
    return {
      ok: false,
      unavailable: true,
      status: 0,
      error: 'Tidak dapat menjangkau server.',
    };
  }
}

export async function apiBootstrap(): Promise<BootstrapResponse> {
  const gasUrl = getAppsScriptUrl();
  if (gasUrl) {
    const res = await callAppsScriptGet<BootstrapResponse>(gasUrl, 'bootstrap');
    return normalizeBootstrapPayload(res);
  }

  const remote = await tryJsonFetch<BootstrapResponse>('./api/bootstrap');
  if (remote.ok) {
    return normalizeBootstrapPayload(remote.data);
  }
  if (remote.unavailable) {
    return buildLocalBootstrap(readLocalDb());
  }
  throw new Error(remote.error);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Gagal membaca file dari perangkat.'));
    reader.readAsDataURL(file);
  });
}

export async function apiUploadFile(file: File): Promise<{
  url: string;
  driveFileId?: string;
  fileName: string;
  fileSize: number;
}> {
  const gasUrl = getAppsScriptUrl();
  if (gasUrl) {
    if (file.size > 20 * 1024 * 1024) {
      throw new Error(
        'Ukuran maksimal unggahan langsung ke Google Drive via Apps Script adalah 20 MB. Untuk file video besar, unggah ke Drive secara manual lalu tempelkan tautannya.'
      );
    }
    const base64Data = await readFileAsBase64(file);
    return callAppsScriptPost<{
      url: string;
      driveFileId?: string;
      fileName: string;
      fileSize: number;
    }>(gasUrl, 'uploadFile', {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      base64Data,
    });
  }

  const formData = new FormData();
  formData.append('file', file);

  const remote = await tryJsonFetch<{
    url: string;
    fileName: string;
    fileSize: number;
  }>('./api/upload', {
    method: 'POST',
    body: formData,
  });

  if (remote.ok) {
    return remote.data;
  }

  if (remote.unavailable) {
    const url = await new Promise<string>((resolve) => {
      if (file.size <= 3 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve(URL.createObjectURL(file));
        reader.readAsDataURL(file);
      } else {
        resolve(URL.createObjectURL(file));
      }
    });
    return {
      url,
      fileName: file.name,
      fileSize: file.size,
    };
  }

  throw new Error(remote.error);
}

export interface ParticipantPayload {
  awardCategory: AwardCategory;
  entityId: string;
  innovationTitle: string;
  materialType: MaterialType;
  materialUrl: string;
  driveFileId?: string;
  uploadedFileName?: string;
  uploadedFileSize?: number;
  materials?: MaterialItem[];
  notes: string;
}

export async function apiCreateParticipant(
  payload: ParticipantPayload
): Promise<BootstrapResponse> {
  const gasUrl = getAppsScriptUrl();
  if (gasUrl) {
    const res = await callAppsScriptPost<{ bootstrap: BootstrapResponse }>(
      gasUrl,
      'createParticipant',
      { ...payload }
    );
    return normalizeBootstrapPayload(res.bootstrap);
  }

  const remote = await tryJsonFetch<{ bootstrap: BootstrapResponse }>(
    './api/participants',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  if (remote.ok) {
    return normalizeBootstrapPayload(remote.data.bootstrap);
  }
  if (!remote.unavailable) {
    throw new Error(remote.error);
  }

  const db = readLocalDb();
  const entity = db.entities.find((e) => e.id === payload.entityId);
  if (!entity) throw new Error('Entitas DPW/DPD tidak valid.');
  const now = new Date().toISOString();
  const materials =
    Array.isArray(payload.materials) && payload.materials.length > 0
      ? payload.materials
      : [
          {
            id: `mat-${Date.now()}-0`,
            type: payload.materialType,
            title: payload.uploadedFileName || `Bahan ${payload.materialType}`,
            url: payload.materialUrl.trim(),
            driveFileId: payload.driveFileId,
            uploadedFileName: payload.uploadedFileName,
            uploadedFileSize: payload.uploadedFileSize,
          },
        ];
  const primary = materials[0];

  const next: ParticipantSubmission = {
    id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    awardCategory: normalizeAwardCategory(payload.awardCategory),
    entityId: entity.id,
    entityType: entity.type,
    entityName: entity.name,
    province: entity.province,
    innovationTitle: payload.innovationTitle.trim(),
    materialType: primary.type,
    materialUrl: primary.url,
    uploadedFileName: primary.uploadedFileName,
    uploadedFileSize: primary.uploadedFileSize,
    materials,
    notes: payload.notes.trim(),
    submittedAt: now,
    updatedAt: now,
  };
  db.participants.push(next);
  writeLocalDb(db);
  return buildLocalBootstrap(db);
}

export async function apiUpdateParticipant(
  id: string,
  payload: ParticipantPayload
): Promise<BootstrapResponse> {
  const gasUrl = getAppsScriptUrl();
  if (gasUrl) {
    const res = await callAppsScriptPost<{ bootstrap: BootstrapResponse }>(
      gasUrl,
      'updateParticipant',
      { id, ...payload }
    );
    return normalizeBootstrapPayload(res.bootstrap);
  }

  const remote = await tryJsonFetch<{ bootstrap: BootstrapResponse }>(
    `./api/participants/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  if (remote.ok) {
    return normalizeBootstrapPayload(remote.data.bootstrap);
  }
  if (!remote.unavailable) {
    throw new Error(remote.error);
  }

  const db = readLocalDb();
  const idx = db.participants.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error('Data peserta tidak ditemukan.');
  const entity = db.entities.find((e) => e.id === payload.entityId);
  if (!entity) throw new Error('Entitas DPW/DPD tidak valid.');

  const existing = db.participants[idx];
  const materials =
    Array.isArray(payload.materials) && payload.materials.length > 0
      ? payload.materials
      : [
          {
            id: `mat-${Date.now()}-0`,
            type: payload.materialType,
            title: payload.uploadedFileName || `Bahan ${payload.materialType}`,
            url: payload.materialUrl.trim(),
            driveFileId: payload.driveFileId,
            uploadedFileName: payload.uploadedFileName,
            uploadedFileSize: payload.uploadedFileSize,
          },
        ];
  const primary = materials[0];

  db.participants[idx] = {
    ...existing,
    awardCategory: normalizeAwardCategory(payload.awardCategory ?? existing.awardCategory),
    entityId: entity.id,
    entityType: entity.type,
    entityName: entity.name,
    province: entity.province,
    innovationTitle: payload.innovationTitle.trim(),
    materialType: primary.type,
    materialUrl: primary.url,
    uploadedFileName: primary.uploadedFileName,
    uploadedFileSize: primary.uploadedFileSize,
    materials,
    notes: payload.notes.trim(),
    updatedAt: new Date().toISOString(),
  };
  writeLocalDb(db);
  return buildLocalBootstrap(db);
}

export async function apiDeleteParticipant(id: string): Promise<BootstrapResponse> {
  const gasUrl = getAppsScriptUrl();
  if (gasUrl) {
    const res = await callAppsScriptPost<{ bootstrap: BootstrapResponse }>(
      gasUrl,
      'deleteParticipant',
      { id }
    );
    return normalizeBootstrapPayload(res.bootstrap);
  }

  const remote = await tryJsonFetch<{ bootstrap: BootstrapResponse }>(
    `./api/participants/${id}`,
    { method: 'DELETE' }
  );
  if (remote.ok) {
    return normalizeBootstrapPayload(remote.data.bootstrap);
  }
  if (!remote.unavailable) {
    throw new Error(remote.error);
  }

  const db = readLocalDb();
  db.participants = db.participants.filter((p) => p.id !== id);
  db.scores = db.scores.filter((s) => s.participantId !== id);
  writeLocalDb(db);
  return buildLocalBootstrap(db);
}

export async function apiAuthJudge(accessCode: string): Promise<MasterJudge> {
  const cleanCode = String(accessCode || '').replace(/\D/g, '');
  if (cleanCode.length !== 6) {
    throw new Error('Masukkan tepat 6 angka terakhir dari nomor WhatsApp Anda yang terdaftar.');
  }

  const gasUrl = getAppsScriptUrl();
  if (gasUrl) {
    const res = await callAppsScriptPost<{ judge: MasterJudge }>(gasUrl, 'authJudge', {
      accessCode: cleanCode,
      whatsapp: cleanCode,
    });
    return res.judge;
  }

  const remote = await tryJsonFetch<{ judge: MasterJudge }>('./api/judges/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessCode: cleanCode }),
  });
  if (remote.ok) {
    return remote.data.judge;
  }
  if (!remote.unavailable) {
    throw new Error(remote.error);
  }

  const db = readLocalDb();
  const judge = db.judges.find(
    (j) =>
      extractJudgeAccessCode(j.whatsapp) === cleanCode ||
      normalizeWhatsApp(j.whatsapp).slice(-6) === cleanCode
  );
  if (!judge) {
    throw new Error('Kode akses tidak cocok dengan Master Dewan Juri Award 2026.');
  }
  return { ...judge, whatsapp: '' };
}

export async function apiSaveScores(payload: {
  participantId: string;
  judgeId: string;
  scores: Record<string, number>;
  notes: string;
}): Promise<BootstrapResponse> {
  const gasUrl = getAppsScriptUrl();
  if (gasUrl) {
    const res = await callAppsScriptPost<{ bootstrap: BootstrapResponse }>(
      gasUrl,
      'saveScores',
      payload
    );
    return normalizeBootstrapPayload(res.bootstrap);
  }

  const remote = await tryJsonFetch<{ bootstrap: BootstrapResponse }>('./api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (remote.ok) {
    return normalizeBootstrapPayload(remote.data.bootstrap);
  }
  if (!remote.unavailable) {
    throw new Error(remote.error);
  }

  const db = readLocalDb();
  const now = new Date().toISOString();
  const idx = db.scores.findIndex(
    (s) => s.participantId === payload.participantId && s.judgeId === payload.judgeId
  );
  if (idx >= 0) {
    db.scores[idx] = {
      ...db.scores[idx],
      scores: payload.scores,
      notes: payload.notes.trim(),
      updatedAt: now,
    };
  } else {
    db.scores.push({
      id: `score-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      participantId: payload.participantId,
      judgeId: payload.judgeId,
      scores: payload.scores,
      notes: payload.notes.trim(),
      updatedAt: now,
    });
  }
  writeLocalDb(db);
  return buildLocalBootstrap(db);
}

export async function apiResetDemo(): Promise<BootstrapResponse> {
  const gasUrl = getAppsScriptUrl();
  if (gasUrl) {
    const res = await callAppsScriptPost<{ bootstrap: BootstrapResponse }>(
      gasUrl,
      'resetDemo',
      {}
    );
    return normalizeBootstrapPayload(res.bootstrap);
  }

  const remote = await tryJsonFetch<{ bootstrap: BootstrapResponse }>('./api/reset-demo', {
    method: 'POST',
  });
  if (remote.ok) {
    return normalizeBootstrapPayload(remote.data.bootstrap);
  }
  if (!remote.unavailable) {
    throw new Error(remote.error);
  }

  const seed = createSeedDatabase();
  writeLocalDb(seed);
  return buildLocalBootstrap(seed);
}
