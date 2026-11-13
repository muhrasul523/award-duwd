import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { createSeedDatabase } from './src/shared/seedData';
import { computeLeaderboard, normalizeWhatsApp } from './src/shared/scoring';
import type {
  AwardDatabase,
  BootstrapResponse,
  MaterialType,
  ParticipantSubmission,
} from './src/shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'award-db.json');
const UPLOAD_DIR = path.resolve(__dirname, 'uploads');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function readDatabase(): AwardDatabase {
  ensureDirectories();
  if (!fs.existsSync(DB_PATH)) {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as AwardDatabase;
    if (
      !Array.isArray(parsed.entities) ||
      !Array.isArray(parsed.judges) ||
      !Array.isArray(parsed.indicators) ||
      !Array.isArray(parsed.participants) ||
      !Array.isArray(parsed.scores)
    ) {
      throw new Error('Invalid DB structure');
    }
    return parsed;
  } catch {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

function writeDatabase(db: AwardDatabase) {
  ensureDirectories();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function buildBootstrapPayload(db: AwardDatabase): BootstrapResponse {
  const leaderboard = computeLeaderboard(
    db.participants,
    db.judges,
    db.indicators,
    db.scores
  );
  return {
    ...db,
    leaderboard,
  };
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDirectories();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    cb(null, `${base || 'bahan'}-${stamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
});

async function startServer() {
  ensureDirectories();
  readDatabase();

  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/uploads', express.static(UPLOAD_DIR));

  // Bootstrap all master data, participants, scores, and computed leaderboard
  app.get('/api/bootstrap', (_req, res) => {
    const db = readDatabase();
    res.json(buildBootstrapPayload(db));
  });

  // Upload file bahan inovasi
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'File tidak ditemukan pada permintaan unggah.' });
      return;
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({
      url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });
  });

  // Create participant submission
  app.post('/api/participants', (req, res) => {
    const {
      entityId,
      innovationTitle,
      materialType,
      materialUrl,
      uploadedFileName,
      uploadedFileSize,
      notes,
    } = req.body as {
      entityId?: string;
      innovationTitle?: string;
      materialType?: MaterialType;
      materialUrl?: string;
      uploadedFileName?: string;
      uploadedFileSize?: number;
      notes?: string;
    };

    const db = readDatabase();
    const entity = db.entities.find((e) => e.id === entityId);
    if (!entity) {
      res.status(400).json({ error: 'Entitas DPW/DPD tidak valid atau belum dipilih.' });
      return;
    }

    const cleanTitle = (innovationTitle || '').trim();
    if (!cleanTitle) {
      res.status(400).json({ error: 'Judul inovasi wajib diisi.' });
      return;
    }

    const validTypes: MaterialType[] = ['Link', 'Video', 'PDF/PPT'];
    if (!materialType || !validTypes.includes(materialType)) {
      res.status(400).json({ error: 'Tipe bahan tidak valid.' });
      return;
    }

    const cleanUrl = (materialUrl || '').trim();
    if (!cleanUrl) {
      res.status(400).json({ error: 'Tautan bahan atau unggahan file wajib diisi.' });
      return;
    }

    const now = new Date().toISOString();
    const newParticipant: ParticipantSubmission = {
      id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entityId: entity.id,
      entityType: entity.type,
      entityName: entity.name,
      province: entity.province,
      innovationTitle: cleanTitle,
      materialType,
      materialUrl: cleanUrl,
      uploadedFileName: uploadedFileName || undefined,
      uploadedFileSize: typeof uploadedFileSize === 'number' ? uploadedFileSize : undefined,
      notes: (notes || '').trim(),
      submittedAt: now,
      updatedAt: now,
    };

    db.participants.push(newParticipant);
    writeDatabase(db);

    res.status(201).json({
      participant: newParticipant,
      bootstrap: buildBootstrapPayload(db),
    });
  });

  // Update participant submission
  app.put('/api/participants/:id', (req, res) => {
    const { id } = req.params;
    const {
      entityId,
      innovationTitle,
      materialType,
      materialUrl,
      uploadedFileName,
      uploadedFileSize,
      notes,
    } = req.body as {
      entityId?: string;
      innovationTitle?: string;
      materialType?: MaterialType;
      materialUrl?: string;
      uploadedFileName?: string;
      uploadedFileSize?: number;
      notes?: string;
    };

    const db = readDatabase();
    const index = db.participants.findIndex((p) => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Data peserta tidak ditemukan.' });
      return;
    }

    const entity = db.entities.find((e) => e.id === entityId);
    if (!entity) {
      res.status(400).json({ error: 'Entitas DPW/DPD tidak valid.' });
      return;
    }

    const cleanTitle = (innovationTitle || '').trim();
    const cleanUrl = (materialUrl || '').trim();
    if (!cleanTitle || !cleanUrl) {
      res.status(400).json({ error: 'Judul inovasi dan tautan/file bahan wajib diisi.' });
      return;
    }

    const validTypes: MaterialType[] = ['Link', 'Video', 'PDF/PPT'];
    const safeType = materialType && validTypes.includes(materialType) ? materialType : 'Link';

    const existing = db.participants[index];
    db.participants[index] = {
      ...existing,
      entityId: entity.id,
      entityType: entity.type,
      entityName: entity.name,
      province: entity.province,
      innovationTitle: cleanTitle,
      materialType: safeType,
      materialUrl: cleanUrl,
      uploadedFileName: uploadedFileName ?? existing.uploadedFileName,
      uploadedFileSize: uploadedFileSize ?? existing.uploadedFileSize,
      notes: (notes ?? '').trim(),
      updatedAt: new Date().toISOString(),
    };

    writeDatabase(db);
    res.json({
      participant: db.participants[index],
      bootstrap: buildBootstrapPayload(db),
    });
  });

  // Delete participant submission
  app.delete('/api/participants/:id', (req, res) => {
    const { id } = req.params;
    const db = readDatabase();
    const exists = db.participants.some((p) => p.id === id);
    if (!exists) {
      res.status(404).json({ error: 'Data peserta tidak ditemukan.' });
      return;
    }

    db.participants = db.participants.filter((p) => p.id !== id);
    db.scores = db.scores.filter((s) => s.participantId !== id);
    writeDatabase(db);

    res.json({
      deletedId: id,
      bootstrap: buildBootstrapPayload(db),
    });
  });

  // Judge authentication via WhatsApp number matched with Master Judges
  app.post('/api/judges/auth', (req, res) => {
    const { whatsapp } = req.body as { whatsapp?: string };
    const normalizedInput = normalizeWhatsApp(whatsapp || '');
    if (!normalizedInput || normalizedInput.length < 9) {
      res.status(400).json({
        error: 'Masukkan nomor WhatsApp yang valid (contoh: 08114401001).',
      });
      return;
    }

    const db = readDatabase();
    const matchedJudge = db.judges.find(
      (j) => normalizeWhatsApp(j.whatsapp) === normalizedInput
    );

    if (!matchedJudge) {
      res.status(401).json({
        error: 'Nomor WhatsApp tidak terdaftar dalam Master Dewan Juri Award 2026.',
      });
      return;
    }

    res.json({ judge: matchedJudge });
  });

  // Submit or update judge raw scores (0-100) for a participant
  app.post('/api/scores', (req, res) => {
    const { participantId, judgeId, scores, notes } = req.body as {
      participantId?: string;
      judgeId?: string;
      scores?: Record<string, number>;
      notes?: string;
    };

    const db = readDatabase();
    const participant = db.participants.find((p) => p.id === participantId);
    if (!participant) {
      res.status(404).json({ error: 'Peserta tidak ditemukan.' });
      return;
    }

    const judge = db.judges.find((j) => j.id === judgeId);
    if (!judge) {
      res.status(401).json({ error: 'Identitas juri tidak valid.' });
      return;
    }

    if (!scores || typeof scores !== 'object') {
      res.status(400).json({ error: 'Format nilai indikator tidak valid.' });
      return;
    }

    const validatedScores: Record<string, number> = {};
    for (const ind of db.indicators) {
      const raw = Number(scores[ind.id]);
      if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
        res.status(400).json({
          error: `Nilai untuk "${ind.name}" harus berada di rentang 0 sampai 100.`,
        });
        return;
      }
      validatedScores[ind.id] = Math.round(raw * 100) / 100;
    }

    const now = new Date().toISOString();
    const existingIndex = db.scores.findIndex(
      (s) => s.participantId === participant.id && s.judgeId === judge.id
    );

    if (existingIndex >= 0) {
      db.scores[existingIndex] = {
        ...db.scores[existingIndex],
        scores: validatedScores,
        notes: (notes || '').trim(),
        updatedAt: now,
      };
    } else {
      db.scores.push({
        id: `score-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        participantId: participant.id,
        judgeId: judge.id,
        scores: validatedScores,
        notes: (notes || '').trim(),
        updatedAt: now,
      });
    }

    writeDatabase(db);
    res.json({
      bootstrap: buildBootstrapPayload(db),
    });
  });

  // Reset to initial seed data
  app.post('/api/reset-demo', (_req, res) => {
    const seed = createSeedDatabase();
    writeDatabase(seed);
    res.json({
      bootstrap: buildBootstrapPayload(seed),
    });
  });

  // Error handler for multer / JSON parsing
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      res.status(400).json({ error: err.message || 'Terjadi kesalahan pada server.' });
    }
  );

  // Vite middleware in dev, static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Award Kolaborasi & Inovasi Mandiri 2026 running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
