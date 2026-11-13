/**
 * ============================================================================
 * BACKEND GOOGLE APPS SCRIPT — AWARD KOLABORASI DAN INOVASI MANDIRI 2026
 * Dewan Pimpinan Pusat Wahdah Islamiyah (2 Kategori: Kolaborasi & Inovasi Mandiri)
 * ============================================================================
 *
 * CARA PASANG / PERBARUI:
 * 1. Buka Google Spreadsheet Anda.
 * 2. Klik menu: Extensions (Ekstensi) > Apps Script.
 * 3. Hapus seluruh isi Code.gs lama, lalu tempelkan seluruh kode ini.
 * 4. Simpan (Ctrl+S).
 * 5. Pilih fungsi "setupSpreadsheet" (untuk sheet baru) atau "upgradeDuaKategori"
 *    (jika Spreadsheet sebelumnya sudah berisi data 1 kategori) pada toolbar atas
 *    lalu klik "Run" (Jalankan). Berikan izin akses Spreadsheet & Drive saat diminta.
 * 6. Pastikan sel B2 (DRIVE_FOLDER_URL) pada sheet "Pengaturan" sudah berisi link
 *    folder Google Drive tujuan unggahan berkas peserta.
 * 7. Klik "Deploy" > "Manage deployments" > Edit (ikon pensil) > Version: "New version"
 *    > "Deploy" (atau "New deployment" jika baru pertama kali).
 */

var SHEET_NAMES = {
  SETTINGS: 'Pengaturan',
  ENTITIES: 'Master_Entitas',
  JUDGES: 'Master_Juri',
  INDICATORS: 'Master_Indikator',
  PARTICIPANTS: 'Peserta_Inovasi',
  SCORES: 'Penilaian_Juri',
  LEADERBOARD: 'Rekap_Peringkat',
};

function getSpreadsheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      'Spreadsheet aktif tidak ditemukan. Pastikan Apps Script dibuka dari menu Extensions > Apps Script di dalam Google Spreadsheet.'
    );
  }
  return ss;
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function normalizeWhatsApp_(input) {
  var digits = String(input || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.indexOf('62') === 0) return '0' + digits.slice(2);
  if (digits.indexOf('8') === 0) return '0' + digits;
  return digits;
}

function normalizeAwardCategory_(input) {
  var raw = String(input || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (raw === 'INOVASI_MANDIRI' || raw === 'INOVASI' || raw === 'MANDIRI') {
    return 'INOVASI_MANDIRI';
  }
  return 'KOLABORASI';
}

function getAwardCategoryLabel_(category) {
  return normalizeAwardCategory_(category) === 'INOVASI_MANDIRI'
    ? 'Inovasi Mandiri'
    : 'Kolaborasi';
}

function roundToTwo_(num) {
  return Math.round((Number(num) + 1e-12) * 100) / 100;
}

function roundToFour_(num) {
  return Math.round((Number(num) + 1e-12) * 10000) / 10000;
}

function findById_(list, idValue) {
  var target = String(idValue || '');
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].id) === target) {
      return list[i];
    }
  }
  return null;
}

function extractDriveFolderId_(urlOrId) {
  var raw = String(urlOrId || '').trim();
  if (!raw || raw.indexOf('GANTI_DENGAN') !== -1) {
    return '';
  }
  var folderMatch = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) return folderMatch[1];

  var idParamMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  if (/^[a-zA-Z0-9_-]{15,}$/.test(raw)) return raw;
  return '';
}

function getDefaultIndicatorsRows_() {
  return [
    [
      'kol-1',
      1,
      'Sinergi Lintas Lembaga & Pemerintah',
      'Tingkat kolaborasi strategis bersama pemerintah daerah, lembaga mitra, masjid, serta unit amal usaha Wahdah Islamiyah.',
      40,
      'KOLABORASI',
    ],
    [
      'kol-2',
      2,
      'Dampak & Jangkauan Program Bersama',
      'Manfaat terukur bagi masyarakat dan kader hasil sinergi multipihak serta efektivitas pemanfaatan sumber daya bersama.',
      35,
      'KOLABORASI',
    ],
    [
      'kol-3',
      3,
      'Tata Kelola Kemitraan & Keberlanjutan',
      'Kejelasan MoU/SOP kolaborasi, pelaporan transparan, serta potensi replikasi kemitraan oleh DPW/DPD lain.',
      25,
      'KOLABORASI',
    ],
    [
      'ino-1',
      1,
      'Orisinalitas & Kebaruan Solusi',
      'Tingkat kreativitas, keunikan pendekatan atau teknologi, dan terobosan baru dalam menjawab tantangan dakwah dan ummat.',
      45,
      'INOVASI_MANDIRI',
    ],
    [
      'ino-2',
      2,
      'Kemandirian Operasional & Pendanaan',
      'Kemampuan entitas menopang program inovasi secara swadaya, berkelanjutan secara finansial, dan mandiri secara ekosistem.',
      30,
      'INOVASI_MANDIRI',
    ],
    [
      'ino-3',
      3,
      'Efektivitas Implementasi & Replikasi',
      'Hasil nyata di lapangan, kelengkapan dokumentasi SOP digital, serta kemudahan adopsi oleh DPW/DPD lain.',
      25,
      'INOVASI_MANDIRI',
    ],
  ];
}

/**
 * Jalankan fungsi ini jika Spreadsheet sebelumnya sudah terisi struktur 1 kategori,
 * untuk memperbarui header & Master_Indikator ke 2 kategori tanpa menghapus
 * Pengaturan (DRIVE_FOLDER_URL), Master_Entitas, dan Master_Juri.
 */
function upgradeDuaKategori() {
  var ss = getSpreadsheet_();

  // 1. Pastikan header Master_Indikator memiliki kolom awardCategory
  var indSheet = ensureSheet_(ss, SHEET_NAMES.INDICATORS, [
    'id',
    'order',
    'name',
    'description',
    'weight',
    'awardCategory',
  ]);
  var existingInds = readRecords_(indSheet);
  var hasInovasi = false;
  for (var i = 0; i < existingInds.length; i++) {
    if (normalizeAwardCategory_(existingInds[i].awardCategory) === 'INOVASI_MANDIRI') {
      hasInovasi = true;
      break;
    }
  }
  if (!hasInovasi) {
    if (indSheet.getLastRow() > 1) {
      indSheet.getRange(2, 1, indSheet.getLastRow() - 1, indSheet.getLastColumn()).clearContent();
    }
    writeRows_(indSheet, getDefaultIndicatorsRows_());
  }

  // 2. Pastikan Peserta_Inovasi memiliki kolom materialsJson (kolom 15) & awardCategory (kolom 16)
  var pSheet = ensureSheet_(ss, SHEET_NAMES.PARTICIPANTS, [
    'id',
    'entityId',
    'entityType',
    'entityName',
    'province',
    'innovationTitle',
    'materialType',
    'materialUrl',
    'driveFileId',
    'uploadedFileName',
    'uploadedFileSize',
    'notes',
    'submittedAt',
    'updatedAt',
    'materialsJson',
    'awardCategory',
  ]);
  if (pSheet.getLastRow() > 1) {
    var pRange = pSheet.getRange(2, 16, pSheet.getLastRow() - 1, 1);
    var pVals = pRange.getValues();
    var pChanged = false;
    for (var pr = 0; pr < pVals.length; pr++) {
      if (String(pVals[pr][0] || '').trim() === '') {
        pVals[pr][0] = 'KOLABORASI';
        pChanged = true;
      }
    }
    if (pChanged) {
      pRange.setValues(pVals);
    }
  }

  // 3. Pastikan Penilaian_Juri memiliki kolom awardCategory (kolom 13)
  ensureSheet_(ss, SHEET_NAMES.SCORES, [
    'id',
    'participantId',
    'judgeId',
    'judgeLabel',
    'entityName',
    'scoresJson',
    'ind_1_raw',
    'ind_2_raw',
    'ind_3_raw',
    'totalWeighted',
    'notes',
    'updatedAt',
    'awardCategory',
  ]);

  // 4. Perbarui header Rekap_Peringkat agar memuat Kategori Award
  var lbSheet = ss.getSheetByName(SHEET_NAMES.LEADERBOARD);
  if (lbSheet) {
    var lbHeaders = [
      'Peringkat',
      'Kategori Award',
      'Jenis',
      'Entitas',
      'Provinsi',
      'Judul Inovasi',
      'Tipe Bahan',
      'Tautan Bahan',
      'Progress Juri',
      'Nilai Akhir',
      'Indikator Bobot Tertinggi',
      'Rata-rata Murni Juri',
      'Keterangan Tie-Breaker',
    ];
    lbSheet.getRange(1, 1, 1, lbHeaders.length).setValues([lbHeaders]);
    lbSheet
      .getRange(1, 1, 1, lbHeaders.length)
      .setBackground('#07525E')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
  }
  syncLeaderboardSheet_(ss);
}

/**
 * Jalankan fungsi ini SEKALI dari editor Apps Script untuk membuat
 * seluruh sheet beserta header, format Wahdah Islamiyah, dan data awal.
 */
function setupSpreadsheet() {
  var ss = getSpreadsheet_();
  var now = '2026-11-10T09:00:00.000Z';

  // 1. Pengaturan
  var settingsSheet = ensureSheet_(ss, SHEET_NAMES.SETTINGS, ['Key', 'Value', 'Keterangan']);
  if (settingsSheet.getLastRow() <= 1) {
    writeRows_(settingsSheet, [
      [
        'DRIVE_FOLDER_URL',
        'https://drive.google.com/drive/folders/GANTI_DENGAN_ID_FOLDER_ANDA',
        'Tempelkan link folder Google Drive tempat seluruh file upload peserta akan disimpan.',
      ],
      ['EVENT_NAME', 'Award Kolaborasi dan Inovasi Mandiri 2026', 'Nama program penghargaan'],
      ['INSTITUTION', 'Dewan Pimpinan Pusat Wahdah Islamiyah', 'Nama lembaga penyelenggara'],
    ]);
  }

  // 2. Master_Entitas
  var entitiesSheet = ensureSheet_(ss, SHEET_NAMES.ENTITIES, [
    'id',
    'code',
    'type',
    'name',
    'province',
  ]);
  if (entitiesSheet.getLastRow() <= 1) {
    writeRows_(entitiesSheet, [
      ['dpw-sulsel', 'DPW-01', 'DPW', 'DPW Wahdah Islamiyah Sulawesi Selatan', 'Sulawesi Selatan'],
      ['dpw-jakarta', 'DPW-02', 'DPW', 'DPW Wahdah Islamiyah DKI Jakarta', 'DKI Jakarta'],
      ['dpw-jabar', 'DPW-03', 'DPW', 'DPW Wahdah Islamiyah Jawa Barat', 'Jawa Barat'],
      ['dpw-jatim', 'DPW-04', 'DPW', 'DPW Wahdah Islamiyah Jawa Timur', 'Jawa Timur'],
      ['dpw-kaltim', 'DPW-05', 'DPW', 'DPW Wahdah Islamiyah Kalimantan Timur', 'Kalimantan Timur'],
      ['dpw-sultra', 'DPW-06', 'DPW', 'DPW Wahdah Islamiyah Sulawesi Tenggara', 'Sulawesi Tenggara'],
      ['dpw-sulteng', 'DPW-07', 'DPW', 'DPW Wahdah Islamiyah Sulawesi Tengah', 'Sulawesi Tengah'],
      ['dpw-sumut', 'DPW-08', 'DPW', 'DPW Wahdah Islamiyah Sumatera Utara', 'Sumatera Utara'],
      ['dpw-diy', 'DPW-09', 'DPW', 'DPW Wahdah Islamiyah DI Yogyakarta', 'DI Yogyakarta'],
      ['dpw-riau', 'DPW-10', 'DPW', 'DPW Wahdah Islamiyah Riau', 'Riau'],
      ['dpw-gorontalo', 'DPW-11', 'DPW', 'DPW Wahdah Islamiyah Gorontalo', 'Gorontalo'],
      ['dpw-papua', 'DPW-12', 'DPW', 'DPW Wahdah Islamiyah Papua', 'Papua'],
      ['dpd-makassar', 'DPD-01', 'DPD', 'DPD Wahdah Islamiyah Kota Makassar', 'Sulawesi Selatan'],
      ['dpd-gowa', 'DPD-02', 'DPD', 'DPD Wahdah Islamiyah Kabupaten Gowa', 'Sulawesi Selatan'],
      ['dpd-maros', 'DPD-03', 'DPD', 'DPD Wahdah Islamiyah Kabupaten Maros', 'Sulawesi Selatan'],
      ['dpd-parepare', 'DPD-04', 'DPD', 'DPD Wahdah Islamiyah Kota Parepare', 'Sulawesi Selatan'],
      ['dpd-jaktim', 'DPD-05', 'DPD', 'DPD Wahdah Islamiyah Jakarta Timur', 'DKI Jakarta'],
      ['dpd-jaksel', 'DPD-06', 'DPD', 'DPD Wahdah Islamiyah Jakarta Selatan', 'DKI Jakarta'],
      ['dpd-bandung', 'DPD-07', 'DPD', 'DPD Wahdah Islamiyah Kota Bandung', 'Jawa Barat'],
      ['dpd-bogor', 'DPD-08', 'DPD', 'DPD Wahdah Islamiyah Kabupaten Bogor', 'Jawa Barat'],
      ['dpd-bekasi', 'DPD-09', 'DPD', 'DPD Wahdah Islamiyah Kota Bekasi', 'Jawa Barat'],
      ['dpd-surabaya', 'DPD-10', 'DPD', 'DPD Wahdah Islamiyah Kota Surabaya', 'Jawa Timur'],
      ['dpd-malang', 'DPD-11', 'DPD', 'DPD Wahdah Islamiyah Kota Malang', 'Jawa Timur'],
      ['dpd-balikpapan', 'DPD-12', 'DPD', 'DPD Wahdah Islamiyah Kota Balikpapan', 'Kalimantan Timur'],
      ['dpd-samarinda', 'DPD-13', 'DPD', 'DPD Wahdah Islamiyah Kota Samarinda', 'Kalimantan Timur'],
      ['dpd-kendari', 'DPD-14', 'DPD', 'DPD Wahdah Islamiyah Kota Kendari', 'Sulawesi Tenggara'],
      ['dpd-palu', 'DPD-15', 'DPD', 'DPD Wahdah Islamiyah Kota Palu', 'Sulawesi Tengah'],
      ['dpd-medan', 'DPD-16', 'DPD', 'DPD Wahdah Islamiyah Kota Medan', 'Sumatera Utara'],
      ['dpd-sleman', 'DPD-17', 'DPD', 'DPD Wahdah Islamiyah Kabupaten Sleman', 'DI Yogyakarta'],
      ['dpd-pekanbaru', 'DPD-18', 'DPD', 'DPD Wahdah Islamiyah Kota Pekanbaru', 'Riau'],
    ]);
  }

  // 3. Master_Juri (pastikan nomor WA bertipe teks agar angka 0 depan tidak hilang)
  var judgesSheet = ensureSheet_(ss, SHEET_NAMES.JUDGES, [
    'id',
    'code',
    'label',
    'name',
    'title',
    'whatsapp',
  ]);
  if (judgesSheet.getLastRow() <= 1) {
    judgesSheet.getRange(2, 6, 50, 1).setNumberFormat('@');
    writeRows_(judgesSheet, [
      [
        'judge-a',
        'A',
        'Juri A',
        'Ust. Dr. H. Muhammad Qasim Saguni, M.A.',
        'Dewan Juri A · Bidang Kolaborasi & Kebijakan Organisasi',
        '08114401001',
      ],
      [
        'judge-b',
        'B',
        'Juri B',
        'Ust. Ir. H. Iskandar Kato, M.Si.',
        'Dewan Juri B · Bidang Inovasi & Kemandirian Ekosistem',
        '08124402002',
      ],
      [
        'judge-c',
        'C',
        'Juri C',
        'Ust. H. Syaibani Mujiono, S.Pd.I., M.M.',
        'Dewan Juri C · Bidang Tata Kelola & Replikasi Nasional',
        '08134403003',
      ],
    ]);
  }

  // 4. Master_Indikator (2 Kategori dengan indikator & bobot terpisah)
  var indicatorsSheet = ensureSheet_(ss, SHEET_NAMES.INDICATORS, [
    'id',
    'order',
    'name',
    'description',
    'weight',
    'awardCategory',
  ]);
  if (indicatorsSheet.getLastRow() <= 1) {
    writeRows_(indicatorsSheet, getDefaultIndicatorsRows_());
  }

  // 5. Peserta_Inovasi
  var participantsSheet = ensureSheet_(ss, SHEET_NAMES.PARTICIPANTS, [
    'id',
    'entityId',
    'entityType',
    'entityName',
    'province',
    'innovationTitle',
    'materialType',
    'materialUrl',
    'driveFileId',
    'uploadedFileName',
    'uploadedFileSize',
    'notes',
    'submittedAt',
    'updatedAt',
    'materialsJson',
    'awardCategory',
  ]);
  if (participantsSheet.getLastRow() <= 1) {
    writeRows_(participantsSheet, [
      [
        'part-1',
        'dpw-sulsel',
        'DPW',
        'DPW Wahdah Islamiyah Sulawesi Selatan',
        'Sulawesi Selatan',
        'Ekosistem Wakaf Produktif & Klinik Pemberdayaan Ummat Terpadu',
        'PDF/PPT',
        'https://wahdah.or.id/award-2026/ekosistem-wakaf-sulsel.pdf',
        '',
        '',
        '',
        'Menghubungkan 24 DPD kabupaten/kota dan dinas kesehatan daerah dalam satu ekosistem layanan ummat.',
        '2026-11-08T08:15:00.000Z',
        now,
        JSON.stringify([
          {
            id: 'mat-p1-1',
            type: 'PDF/PPT',
            title: 'Deck Presentasi Ekosistem Wakaf Sulsel.pdf',
            url: 'https://wahdah.or.id/award-2026/ekosistem-wakaf-sulsel.pdf',
          },
          {
            id: 'mat-p1-2',
            type: 'Video',
            title: 'Video Dokumentasi Klinik Pemberdayaan Ummat',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          },
        ]),
        'KOLABORASI',
      ],
      [
        'part-2',
        'dpd-makassar',
        'DPD',
        'DPD Wahdah Islamiyah Kota Makassar',
        'Sulawesi Selatan',
        'Gerakan Masjid Mandiri & Manajemen ZISWAF Digital Terintegrasi',
        'Link',
        'https://inovasi.wahdahmakassar.org/masjid-mandiri-2026',
        '',
        '',
        '',
        'Kolaborasi aktif 42 masjid binaan, Baznas Kota Makassar, dan koperasi syariah berbasis QRIS terpusat.',
        '2026-11-08T10:30:00.000Z',
        now,
        '',
        'KOLABORASI',
      ],
      [
        'part-5',
        'dpw-kaltim',
        'DPW',
        'DPW Wahdah Islamiyah Kalimantan Timur',
        'Kalimantan Timur',
        'Sinergi Pendidikan Karakter Terpadu & Beasiswa Yatim Nusantara',
        'Link',
        'https://kaltim.wahdah.or.id/beasiswa-nusantara',
        '',
        '',
        '',
        'Menjangkau wilayah penyangga IKN melalui kemitraan sekolah Islam terpadu dan donatur korporasi.',
        '2026-11-09T11:10:00.000Z',
        now,
        '',
        'KOLABORASI',
      ],
      [
        'part-3',
        'dpw-jakarta',
        'DPW',
        'DPW Wahdah Islamiyah DKI Jakarta',
        'DKI Jakarta',
        'Hub Dakwah Digital & Inkubator Kemandirian Ekonomi Pemuda',
        'Video',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        '',
        '',
        '',
        'Inkubasi 120 UMKM binaan mandiri dan produksi konten dakwah multi-platform dengan pembiayaan swadaya.',
        '2026-11-08T13:20:00.000Z',
        now,
        JSON.stringify([
          {
            id: 'mat-p3-1',
            type: 'Video',
            title: 'Video Profil Inkubator Pemuda DKI Jakarta',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          },
          {
            id: 'mat-p3-2',
            type: 'Link',
            title: 'Portal Katalog UMKM Pemuda Wahdah Jakarta',
            url: 'https://jakarta.wahdah.or.id/inkubator-pemuda',
          },
        ]),
        'INOVASI_MANDIRI',
      ],
      [
        'part-4',
        'dpd-gowa',
        'DPD',
        'DPD Wahdah Islamiyah Kabupaten Gowa',
        'Sulawesi Selatan',
        'Pesantren Agroteknologi & Kemandirian Pangan Berkelanjutan',
        'PDF/PPT',
        'https://wahdah.or.id/award-2026/agroteknologi-gowa-deck.pdf',
        '',
        '',
        '',
        'Budidaya hidroponik skala komersial untuk menopang biaya operasional pondok tahfiz dan beasiswa santri.',
        '2026-11-09T07:45:00.000Z',
        now,
        '',
        'INOVASI_MANDIRI',
      ],
      [
        'part-6',
        'dpd-balikpapan',
        'DPD',
        'DPD Wahdah Islamiyah Kota Balikpapan',
        'Kalimantan Timur',
        'Sistem Logistik Kemanusiaan & Respon Cepat Bencana Regional',
        'Video',
        'https://drive.google.com/file/d/balikpapan-logistik-2026/view',
        '',
        '',
        '',
        'Gudang logistik relawan siaga bencana dengan pelacakan distribusi bantuan secara mandiri dan terbuka.',
        '2026-11-09T15:00:00.000Z',
        now,
        '',
        'INOVASI_MANDIRI',
      ],
    ]);
  }

  // 6. Penilaian_Juri
  var scoresSheet = ensureSheet_(ss, SHEET_NAMES.SCORES, [
    'id',
    'participantId',
    'judgeId',
    'judgeLabel',
    'entityName',
    'scoresJson',
    'ind_1_raw',
    'ind_2_raw',
    'ind_3_raw',
    'totalWeighted',
    'notes',
    'updatedAt',
    'awardCategory',
  ]);
  if (scoresSheet.getLastRow() <= 1) {
    writeRows_(scoresSheet, [
      ['score-p1-ja', 'part-1', 'judge-a', 'Juri A', 'DPW Wahdah Islamiyah Sulawesi Selatan', JSON.stringify({ 'kol-1': 94, 'kol-2': 91, 'kol-3': 90 }), 94, 91, 90, 91.95, 'Sinergi lintas 24 daerah sangat solid dan terukur dampaknya.', now, 'KOLABORASI'],
      ['score-p1-jb', 'part-1', 'judge-b', 'Juri B', 'DPW Wahdah Islamiyah Sulawesi Selatan', JSON.stringify({ 'kol-1': 92, 'kol-2': 93, 'kol-3': 92 }), 92, 93, 92, 92.35, 'Model wakaf kolaboratif sudah mandiri secara arus kas.', now, 'KOLABORASI'],
      ['score-p1-jc', 'part-1', 'judge-c', 'Juri C', 'DPW Wahdah Islamiyah Sulawesi Selatan', JSON.stringify({ 'kol-1': 95, 'kol-2': 90, 'kol-3': 91 }), 95, 90, 91, 92.25, 'Dokumentasi MoU dan SOP sangat siap direplikasi secara nasional.', now, 'KOLABORASI'],

      ['score-p2-ja', 'part-2', 'judge-a', 'Juri A', 'DPD Wahdah Islamiyah Kota Makassar', JSON.stringify({ 'kol-1': 92, 'kol-2': 84, 'kol-3': 86 }), 92, 84, 86, 87.7, 'Kolaborasi 42 masjid dan otoritas zakat kota sangat menonjol.', now, 'KOLABORASI'],
      ['score-p2-jb', 'part-2', 'judge-b', 'Juri B', 'DPD Wahdah Islamiyah Kota Makassar', JSON.stringify({ 'kol-1': 90, 'kol-2': 86, 'kol-3': 88 }), 90, 86, 88, 88.1, 'Digitalisasi ZISWAF mempermudah transparansi laporan mitra.', now, 'KOLABORASI'],
      ['score-p2-jc', 'part-2', 'judge-c', 'Juri C', 'DPD Wahdah Islamiyah Kota Makassar', JSON.stringify({ 'kol-1': 94, 'kol-2': 82, 'kol-3': 86 }), 94, 82, 86, 87.8, 'Kemitraan eksternal kuat dan menjadi percontohan DPD.', now, 'KOLABORASI'],

      ['score-p5-ja', 'part-5', 'judge-a', 'Juri A', 'DPW Wahdah Islamiyah Kalimantan Timur', JSON.stringify({ 'kol-1': 85, 'kol-2': 92, 'kol-3': 86 }), 85, 92, 86, 87.7, 'Dampak program beasiswa yatim sangat luas di wilayah penyangga IKN.', now, 'KOLABORASI'],
      ['score-p5-jb', 'part-5', 'judge-b', 'Juri B', 'DPW Wahdah Islamiyah Kalimantan Timur', JSON.stringify({ 'kol-1': 87, 'kol-2': 90, 'kol-3': 87 }), 87, 90, 87, 88.05, 'Keterlibatan mitra korporasi dan sekolah sangat terukur.', now, 'KOLABORASI'],
      ['score-p5-jc', 'part-5', 'judge-c', 'Juri C', 'DPW Wahdah Islamiyah Kalimantan Timur', JSON.stringify({ 'kol-1': 86, 'kol-2': 92, 'kol-3': 85 }), 86, 92, 85, 87.85, 'Perlu penguatan MoU lintas instansi pemerintah provinsi.', now, 'KOLABORASI'],

      ['score-p3-ja', 'part-3', 'judge-a', 'Juri A', 'DPW Wahdah Islamiyah DKI Jakarta', JSON.stringify({ 'ino-1': 91, 'ino-2': 90, 'ino-3': 89 }), 91, 90, 89, 90.2, 'Terobosan inkubator pemuda sangat orisinal dan berdaya saing.', now, 'INOVASI_MANDIRI'],
      ['score-p3-jb', 'part-3', 'judge-b', 'Juri B', 'DPW Wahdah Islamiyah DKI Jakarta', JSON.stringify({ 'ino-1': 92, 'ino-2': 88, 'ino-3': 90 }), 92, 88, 90, 90.3, 'Pendanaan unit UMKM binaan telah berputar mandiri.', now, 'INOVASI_MANDIRI'],
      ['score-p3-jc', 'part-3', 'judge-c', 'Juri C', 'DPW Wahdah Islamiyah DKI Jakarta', JSON.stringify({ 'ino-1': 90, 'ino-2': 91, 'ino-3': 88 }), 90, 91, 88, 89.8, 'Mudah diadaptasi DPW kota besar lainnya.', now, 'INOVASI_MANDIRI'],

      ['score-p4-ja', 'part-4', 'judge-a', 'Juri A', 'DPD Wahdah Islamiyah Kabupaten Gowa', JSON.stringify({ 'ino-1': 86, 'ino-2': 85, 'ino-3': 84 }), 86, 85, 84, 85.2, 'Inovasi hidroponik pesantren memberikan kemandirian nyata.', now, 'INOVASI_MANDIRI'],
      ['score-p4-jb', 'part-4', 'judge-b', 'Juri B', 'DPD Wahdah Islamiyah Kabupaten Gowa', JSON.stringify({ 'ino-1': 88, 'ino-2': 84, 'ino-3': 86 }), 88, 84, 86, 86.3, 'Produksi pangan pesantren mulai menopang biaya operasional santri.', now, 'INOVASI_MANDIRI'],

      ['score-p6-ja', 'part-6', 'judge-a', 'Juri A', 'DPD Wahdah Islamiyah Kota Balikpapan', JSON.stringify({ 'ino-1': 84, 'ino-2': 82, 'ino-3': 80 }), 84, 82, 80, 82.4, 'Aplikasi pelacakan logistik mandiri sudah teruji di lapangan.', now, 'INOVASI_MANDIRI'],
    ]);
  }

  // 7. Rekap_Peringkat
  ensureSheet_(ss, SHEET_NAMES.LEADERBOARD, [
    'Peringkat',
    'Kategori Award',
    'Jenis',
    'Entitas',
    'Provinsi',
    'Judul Inovasi',
    'Tipe Bahan',
    'Tautan Bahan',
    'Progress Juri',
    'Nilai Akhir',
    'Indikator Bobot Tertinggi',
    'Rata-rata Murni Juri',
    'Keterangan Tie-Breaker',
  ]);

  // Pastikan skema lama ter-upgrade otomatis jika sudah ada sheet sebelumnya
  upgradeDuaKategori();
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    SpreadsheetApp.flush();
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setBackground('#07525E')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    try {
      sheet.setFrozenRows(1);
    } catch (freezeErr) {
      // Abaikan jika ukuran baris belum siap dibekukan
    }
  } else if (sheet.getLastColumn() < headers.length) {
    for (var col = sheet.getLastColumn() + 1; col <= headers.length; col++) {
      var cell = sheet.getRange(1, col);
      cell.setValue(headers[col - 1]);
      cell.setBackground('#07525E').setFontColor('#FFFFFF').setFontWeight('bold');
    }
    SpreadsheetApp.flush();
  }
  return sheet;
}

function writeRows_(sheet, rows) {
  if (!rows || rows.length === 0) return;
  sheet
    .getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
    .setValues(rows);
  SpreadsheetApp.flush();
}

function readRecords_(sheet) {
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (String(row[0] || '').trim() === '') continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[String(headers[j])] = row[j];
    }
    out.push(obj);
  }
  return out;
}

function getSettingsMap_(ss) {
  var rows = readRecords_(ss.getSheetByName(SHEET_NAMES.SETTINGS));
  var map = {};
  for (var i = 0; i < rows.length; i++) {
    map[String(rows[i].Key)] = String(rows[i].Value || '');
  }
  return map;
}

function getIndicatorsForCategory_(indicators, category) {
  var norm = normalizeAwardCategory_(category);
  return indicators
    .filter(function (ind) {
      return normalizeAwardCategory_(ind.awardCategory) === norm;
    })
    .sort(function (a, b) {
      return a.order - b.order;
    });
}

function buildBootstrapData_(ss) {
  var entities = readRecords_(ss.getSheetByName(SHEET_NAMES.ENTITIES)).map(function (r) {
    return {
      id: String(r.id),
      code: String(r.code),
      type: String(r.type),
      name: String(r.name),
      province: String(r.province),
    };
  });

  var judges = readRecords_(ss.getSheetByName(SHEET_NAMES.JUDGES)).map(function (r) {
    return {
      id: String(r.id),
      code: String(r.code),
      label: String(r.label),
      name: String(r.name),
      title: String(r.title),
      whatsapp: '',
    };
  });

  var indicators = readRecords_(ss.getSheetByName(SHEET_NAMES.INDICATORS)).map(function (r) {
    return {
      id: String(r.id),
      awardCategory: normalizeAwardCategory_(r.awardCategory),
      order: Number(r.order),
      name: String(r.name),
      description: String(r.description),
      weight: Number(r.weight),
    };
  });

  var participants = readRecords_(ss.getSheetByName(SHEET_NAMES.PARTICIPANTS)).map(function (r) {
    var parsedMaterials = undefined;
    if (r.materialsJson && String(r.materialsJson).trim() !== '') {
      try {
        var arr = JSON.parse(String(r.materialsJson));
        if (arr && arr.length > 0) {
          parsedMaterials = arr;
        }
      } catch (matErr) {
        parsedMaterials = undefined;
      }
    }
    return {
      id: String(r.id),
      awardCategory: normalizeAwardCategory_(r.awardCategory),
      entityId: String(r.entityId),
      entityType: String(r.entityType),
      entityName: String(r.entityName),
      province: String(r.province),
      innovationTitle: String(r.innovationTitle),
      materialType: String(r.materialType),
      materialUrl: String(r.materialUrl),
      uploadedFileName: r.uploadedFileName ? String(r.uploadedFileName) : undefined,
      uploadedFileSize: r.uploadedFileSize !== '' ? Number(r.uploadedFileSize) : undefined,
      materials: parsedMaterials,
      notes: String(r.notes || ''),
      submittedAt: String(r.submittedAt || ''),
      updatedAt: String(r.updatedAt || ''),
    };
  });

  var scores = readRecords_(ss.getSheetByName(SHEET_NAMES.SCORES)).map(function (r) {
    var parsedScores = {};
    try {
      parsedScores = JSON.parse(String(r.scoresJson || '{}'));
    } catch (err) {
      parsedScores = {
        'kol-1': Number(r.ind_1_raw || 0),
        'kol-2': Number(r.ind_2_raw || 0),
        'kol-3': Number(r.ind_3_raw || 0),
      };
    }
    return {
      id: String(r.id),
      participantId: String(r.participantId),
      judgeId: String(r.judgeId),
      scores: parsedScores,
      notes: String(r.notes || ''),
      updatedAt: String(r.updatedAt || ''),
    };
  });

  var leaderboard = computeLeaderboard_(participants, judges, indicators, scores);
  var settings = getSettingsMap_(ss);

  return {
    entities: entities,
    judges: judges,
    indicators: indicators,
    participants: participants,
    scores: scores,
    leaderboard: leaderboard,
    driveFolderConfigured: Boolean(extractDriveFolderId_(settings.DRIVE_FOLDER_URL)),
  };
}

function computeCategoryLeaderboard_(category, catParticipants, judges, catIndicators, scores) {
  var sortedIndicators = catIndicators.slice().sort(function (a, b) {
    return a.order - b.order;
  });
  var highestIndicator =
    sortedIndicators.slice().sort(function (a, b) {
      return b.weight - a.weight || a.order - b.order;
    })[0] || sortedIndicators[0];

  var entries = catParticipants.map(function (participant) {
    var participantScores = scores.filter(function (s) {
      return s.participantId === participant.id;
    });

    var judgeMatrix = judges.map(function (judge) {
      var record = null;
      for (var i = 0; i < participantScores.length; i++) {
        if (participantScores[i].judgeId === judge.id) {
          record = participantScores[i];
          break;
        }
      }

      var rawScores = {};
      var weightedScores = {};
      if (!record) {
        for (var k = 0; k < sortedIndicators.length; k++) {
          rawScores[sortedIndicators[k].id] = null;
          weightedScores[sortedIndicators[k].id] = null;
        }
        return {
          judgeId: judge.id,
          judgeCode: judge.code,
          judgeName: judge.name,
          hasScored: false,
          rawScores: rawScores,
          weightedScores: weightedScores,
          judgeTotalWeighted: null,
          notes: '',
          updatedAt: null,
        };
      }

      var judgeTotalExact = 0;
      for (var m = 0; m < sortedIndicators.length; m++) {
        var ind = sortedIndicators[m];
        var rawVal = Number(record.scores[ind.id] || 0);
        var clamped = Math.max(0, Math.min(100, rawVal));
        var weighted = clamped * (ind.weight / 100);
        rawScores[ind.id] = clamped;
        weightedScores[ind.id] = roundToTwo_(weighted);
        judgeTotalExact += weighted;
      }

      return {
        judgeId: judge.id,
        judgeCode: judge.code,
        judgeName: judge.name,
        hasScored: true,
        rawScores: rawScores,
        weightedScores: weightedScores,
        judgeTotalWeighted: roundToTwo_(judgeTotalExact),
        notes: record.notes || '',
        updatedAt: record.updatedAt,
      };
    });

    var scoredCells = judgeMatrix.filter(function (j) {
      return j.hasScored;
    });
    var judgesScoredCount = scoredCells.length;
    var scoredJudgeCodes = scoredCells.map(function (j) {
      return j.judgeCode;
    });

    var indicatorAveragesRaw = {};
    var indicatorAveragesWeighted = {};

    for (var n = 0; n < sortedIndicators.length; n++) {
      var indItem = sortedIndicators[n];
      if (judgesScoredCount === 0) {
        indicatorAveragesRaw[indItem.id] = null;
        indicatorAveragesWeighted[indItem.id] = null;
      } else {
        var sumRaw = 0;
        for (var c = 0; c < scoredCells.length; c++) {
          sumRaw += Number(scoredCells[c].rawScores[indItem.id] || 0);
        }
        var avgRaw = sumRaw / judgesScoredCount;
        indicatorAveragesRaw[indItem.id] = roundToTwo_(avgRaw);
        indicatorAveragesWeighted[indItem.id] = roundToTwo_(avgRaw * (indItem.weight / 100));
      }
    }

    var finalScore = 0;
    if (judgesScoredCount > 0) {
      var exactTotalAcrossJudges = 0;
      for (var c2 = 0; c2 < scoredCells.length; c2++) {
        for (var k2 = 0; k2 < sortedIndicators.length; k2++) {
          var ind2 = sortedIndicators[k2];
          exactTotalAcrossJudges +=
            Number(scoredCells[c2].rawScores[ind2.id] || 0) * (ind2.weight / 100);
        }
      }
      finalScore = roundToTwo_(exactTotalAcrossJudges / judgesScoredCount);
    }

    var highestIndicatorWeightedScore = 0;
    var highestIndicatorAvgRawAllJudges = 0;
    if (highestIndicator) {
      if (judgesScoredCount > 0) {
        var sumWeightedHigh = 0;
        for (var c3 = 0; c3 < scoredCells.length; c3++) {
          sumWeightedHigh +=
            Number(scoredCells[c3].rawScores[highestIndicator.id] || 0) *
            (highestIndicator.weight / 100);
        }
        highestIndicatorWeightedScore = roundToTwo_(sumWeightedHigh / judgesScoredCount);
      }
      if (judges.length > 0) {
        var sumRawAll = 0;
        for (var c4 = 0; c4 < scoredCells.length; c4++) {
          sumRawAll += Number(scoredCells[c4].rawScores[highestIndicator.id] || 0);
        }
        highestIndicatorAvgRawAllJudges = roundToFour_(sumRawAll / judges.length);
      }
    }

    return {
      rank: 0,
      awardCategory: category,
      isTiedForRank: false,
      tieBreakerRule: 'NONE',
      tieBreakerNote: null,
      participant: participant,
      judgesScoredCount: judgesScoredCount,
      totalJudgesCount: judges.length,
      scoredJudgeCodes: scoredJudgeCodes,
      finalScore: finalScore,
      highestIndicatorId: highestIndicator ? highestIndicator.id : '',
      highestIndicatorName: highestIndicator ? highestIndicator.name : '',
      highestIndicatorWeight: highestIndicator ? highestIndicator.weight : 0,
      highestIndicatorWeightedScore: highestIndicatorWeightedScore,
      highestIndicatorAvgRawAllJudges: highestIndicatorAvgRawAllJudges,
      indicatorAveragesRaw: indicatorAveragesRaw,
      indicatorAveragesWeighted: indicatorAveragesWeighted,
      judgeMatrix: judgeMatrix,
    };
  });

  entries.sort(function (a, b) {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (b.highestIndicatorWeightedScore !== a.highestIndicatorWeightedScore) {
      return b.highestIndicatorWeightedScore - a.highestIndicatorWeightedScore;
    }
    if (b.highestIndicatorAvgRawAllJudges !== a.highestIndicatorAvgRawAllJudges) {
      return b.highestIndicatorAvgRawAllJudges - a.highestIndicatorAvgRawAllJudges;
    }
    return String(a.participant.submittedAt).localeCompare(String(b.participant.submittedAt));
  });

  for (var i = 0; i < entries.length; i++) {
    var curr = entries[i];
    if (i === 0) {
      curr.rank = 1;
    } else {
      var prev = entries[i - 1];
      var exactTieAll =
        curr.finalScore === prev.finalScore &&
        curr.highestIndicatorWeightedScore === prev.highestIndicatorWeightedScore &&
        curr.highestIndicatorAvgRawAllJudges === prev.highestIndicatorAvgRawAllJudges &&
        curr.judgesScoredCount > 0 &&
        prev.judgesScoredCount > 0;
      if (exactTieAll) {
        curr.rank = prev.rank;
        curr.isTiedForRank = true;
        prev.isTiedForRank = true;
        curr.tieBreakerRule = 'DELIBERATION_REQUIRED';
        prev.tieBreakerRule = 'DELIBERATION_REQUIRED';
        curr.tieBreakerNote = 'Seri mutlak · Memerlukan Musyawarah Dewan Juri';
        prev.tieBreakerNote = 'Seri mutlak · Memerlukan Musyawarah Dewan Juri';
      } else {
        curr.rank = i + 1;
      }
    }
  }

  for (var x = 0; x < entries.length; x++) {
    var item = entries[x];
    if (item.finalScore <= 0 || item.tieBreakerRule === 'DELIBERATION_REQUIRED') continue;
    var samePeers = entries.filter(function (e) {
      return e.participant.id !== item.participant.id && e.finalScore === item.finalScore;
    });
    if (samePeers.length > 0) {
      var higherPeer = null;
      var lowerPeer = null;
      for (var sp = 0; sp < samePeers.length; sp++) {
        if (!higherPeer && samePeers[sp].rank < item.rank) {
          higherPeer = samePeers[sp];
        }
        if (!lowerPeer && samePeers[sp].rank > item.rank) {
          lowerPeer = samePeers[sp];
        }
      }
      if (lowerPeer) {
        if (item.highestIndicatorWeightedScore > lowerPeer.highestIndicatorWeightedScore) {
          item.tieBreakerRule = 'HIGHEST_WEIGHT_INDICATOR';
          item.tieBreakerNote =
            'Unggul Tie-Breaker · Nilai Indikator ' +
            item.highestIndicatorWeight +
            '% (' +
            item.highestIndicatorWeightedScore.toFixed(2) +
            ' vs ' +
            lowerPeer.highestIndicatorWeightedScore.toFixed(2) +
            ')';
        } else if (item.highestIndicatorAvgRawAllJudges > lowerPeer.highestIndicatorAvgRawAllJudges) {
          item.tieBreakerRule = 'HIGHEST_WEIGHT_AVG_RAW_ALL_JUDGES';
          item.tieBreakerNote =
            'Unggul Tie-Breaker · Rata-rata Murni Seluruh Juri (' +
            item.highestIndicatorAvgRawAllJudges.toFixed(2) +
            ' vs ' +
            lowerPeer.highestIndicatorAvgRawAllJudges.toFixed(2) +
            ')';
        }
      } else if (higherPeer) {
        if (higherPeer.highestIndicatorWeightedScore > item.highestIndicatorWeightedScore) {
          item.tieBreakerRule = 'HIGHEST_WEIGHT_INDICATOR';
          item.tieBreakerNote =
            'Skor akhir seri (' +
            item.finalScore.toFixed(2) +
            ') · Kalah Tie-Breaker Indikator ' +
            item.highestIndicatorWeight +
            '% (' +
            item.highestIndicatorWeightedScore.toFixed(2) +
            ' vs ' +
            higherPeer.highestIndicatorWeightedScore.toFixed(2) +
            ')';
        } else if (higherPeer.highestIndicatorAvgRawAllJudges > item.highestIndicatorAvgRawAllJudges) {
          item.tieBreakerRule = 'HIGHEST_WEIGHT_AVG_RAW_ALL_JUDGES';
          item.tieBreakerNote =
            'Skor akhir seri (' +
            item.finalScore.toFixed(2) +
            ') · Kalah Tie-Breaker Rata-rata Murni Juri (' +
            item.highestIndicatorAvgRawAllJudges.toFixed(2) +
            ' vs ' +
            higherPeer.highestIndicatorAvgRawAllJudges.toFixed(2) +
            ')';
        }
      }
    }
  }

  return entries;
}

function computeLeaderboard_(participants, judges, indicators, scores) {
  var categories = ['KOLABORASI', 'INOVASI_MANDIRI'];
  var allEntries = [];
  for (var c = 0; c < categories.length; c++) {
    var cat = categories[c];
    var catParticipants = participants.filter(function (p) {
      return normalizeAwardCategory_(p.awardCategory) === cat;
    });
    var catIndicators = getIndicatorsForCategory_(indicators, cat);
    var catEntries = computeCategoryLeaderboard_(
      cat,
      catParticipants,
      judges,
      catIndicators,
      scores
    );
    for (var i = 0; i < catEntries.length; i++) {
      allEntries.push(catEntries[i]);
    }
  }
  return allEntries;
}

function syncLeaderboardSheet_(ss) {
  var sheet = ss.getSheetByName(SHEET_NAMES.LEADERBOARD);
  if (!sheet) return;
  var data = buildBootstrapData_(ss);

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(13, sheet.getLastColumn())).clearContent();
  }
  if (data.leaderboard.length === 0) return;

  var rows = data.leaderboard.map(function (entry) {
    return [
      entry.rank,
      getAwardCategoryLabel_(entry.awardCategory),
      entry.participant.entityType,
      entry.participant.entityName,
      entry.participant.province,
      entry.participant.innovationTitle,
      entry.participant.materialType,
      entry.participant.materialUrl,
      entry.judgesScoredCount + '/' + entry.totalJudgesCount,
      entry.finalScore,
      entry.highestIndicatorWeightedScore,
      entry.highestIndicatorAvgRawAllJudges,
      entry.tieBreakerNote || '-',
    ];
  });
  sheet.getRange(2, 1, rows.length, 13).setValues(rows);
}

/**
 * HTTP GET handler
 */
function doGet(e) {
  try {
    var ss = getSpreadsheet_();
    var action = (e && e.parameter && e.parameter.action) || 'bootstrap';
    if (action === 'setupSpreadsheet') {
      var lock = LockService.getScriptLock();
      lock.waitLock(15000);
      try {
        setupSpreadsheet();
        return jsonOutput_({
          ok: true,
          message: '7 sheet Spreadsheet berhasil diinisialisasi.',
          bootstrap: buildBootstrapData_(ss),
        });
      } finally {
        lock.releaseLock();
      }
    }
    if (action === 'bootstrap') {
      return jsonOutput_(buildBootstrapData_(ss));
    }
    return jsonOutput_({ ok: true, service: 'Award Kolaborasi & Inovasi Mandiri 2026' });
  } catch (err) {
    return jsonOutput_({ error: err.message || 'Terjadi kesalahan pada Apps Script.' });
  }
}

/**
 * HTTP POST handler (menerima text/plain JSON agar bebas CORS preflight)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action;
    var ss = getSpreadsheet_();

    if (action === 'setupSpreadsheet') {
      setupSpreadsheet();
      return jsonOutput_({
        ok: true,
        bootstrap: buildBootstrapData_(ss),
      });
    }

    if (action === 'uploadFile') {
      var settings = getSettingsMap_(ss);
      var folderId = extractDriveFolderId_(settings.DRIVE_FOLDER_URL);
      if (!folderId) {
        return jsonOutput_({
          error:
            'Link folder Google Drive pada sheet "Pengaturan" (DRIVE_FOLDER_URL) belum diisi atau belum valid.',
        });
      }
      var folder = DriveApp.getFolderById(folderId);
      var bytes = Utilities.base64Decode(body.base64Data || '');
      var safeName = String(body.fileName || 'bahan-inovasi').replace(/[^\w.\-]+/g, '_');
      var blob = Utilities.newBlob(
        bytes,
        body.mimeType || 'application/octet-stream',
        safeName
      );
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return jsonOutput_({
        url: file.getUrl(),
        driveFileId: file.getId(),
        fileName: file.getName(),
        fileSize: file.getSize(),
      });
    }

    if (action === 'createParticipant') {
      var entities = readRecords_(ss.getSheetByName(SHEET_NAMES.ENTITIES));
      var entity = findById_(entities, body.entityId);
      if (!entity) return jsonOutput_({ error: 'Entitas DPW/DPD tidak valid.' });

      var awardCat = normalizeAwardCategory_(body.awardCategory);
      var matList = body.materials && body.materials.length ? body.materials : null;
      var primaryMat = matList ? matList[0] : null;
      var matType = primaryMat ? String(primaryMat.type || 'Link') : String(body.materialType || 'Link');
      var matUrl = primaryMat ? String(primaryMat.url || '').trim() : String(body.materialUrl || '').trim();
      var driveId = primaryMat ? String(primaryMat.driveFileId || '') : String(body.driveFileId || '');
      var fileName = primaryMat ? String(primaryMat.uploadedFileName || '') : String(body.uploadedFileName || '');
      var fileSize = primaryMat && primaryMat.uploadedFileSize ? primaryMat.uploadedFileSize : (body.uploadedFileSize || '');

      var now = new Date().toISOString();
      var newId = 'part-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      var pSheet = ensureSheet_(ss, SHEET_NAMES.PARTICIPANTS, [
        'id', 'entityId', 'entityType', 'entityName', 'province', 'innovationTitle',
        'materialType', 'materialUrl', 'driveFileId', 'uploadedFileName', 'uploadedFileSize',
        'notes', 'submittedAt', 'updatedAt', 'materialsJson', 'awardCategory',
      ]);
      pSheet.appendRow([
        newId,
        String(entity.id),
        String(entity.type),
        String(entity.name),
        String(entity.province),
        String(body.innovationTitle || '').trim(),
        matType,
        matUrl,
        driveId,
        fileName,
        fileSize,
        String(body.notes || '').trim(),
        now,
        now,
        matList ? JSON.stringify(matList) : '',
        awardCat,
      ]);
      syncLeaderboardSheet_(ss);
      return jsonOutput_({ bootstrap: buildBootstrapData_(ss) });
    }

    if (action === 'updateParticipant') {
      var entities2 = readRecords_(ss.getSheetByName(SHEET_NAMES.ENTITIES));
      var entity2 = findById_(entities2, body.entityId);
      if (!entity2) return jsonOutput_({ error: 'Entitas DPW/DPD tidak valid.' });

      var awardCat2 = normalizeAwardCategory_(body.awardCategory);
      var pSheet2 = ensureSheet_(ss, SHEET_NAMES.PARTICIPANTS, [
        'id', 'entityId', 'entityType', 'entityName', 'province', 'innovationTitle',
        'materialType', 'materialUrl', 'driveFileId', 'uploadedFileName', 'uploadedFileSize',
        'notes', 'submittedAt', 'updatedAt', 'materialsJson', 'awardCategory',
      ]);
      var matList2 = body.materials && body.materials.length ? body.materials : null;
      var primaryMat2 = matList2 ? matList2[0] : null;
      var rows2 = pSheet2.getDataRange().getValues();
      var updated = false;
      for (var r = 1; r < rows2.length; r++) {
        if (String(rows2[r][0]) === String(body.id)) {
          var submittedAt = rows2[r][12] || new Date().toISOString();
          pSheet2.getRange(r + 1, 1, 1, 16).setValues([
            [
              String(body.id),
              String(entity2.id),
              String(entity2.type),
              String(entity2.name),
              String(entity2.province),
              String(body.innovationTitle || '').trim(),
              primaryMat2 ? String(primaryMat2.type || 'Link') : String(body.materialType || 'Link'),
              primaryMat2 ? String(primaryMat2.url || '').trim() : String(body.materialUrl || '').trim(),
              primaryMat2 ? String(primaryMat2.driveFileId || '') : String(body.driveFileId || rows2[r][8] || ''),
              primaryMat2 ? String(primaryMat2.uploadedFileName || '') : String(body.uploadedFileName || rows2[r][9] || ''),
              primaryMat2 && primaryMat2.uploadedFileSize ? primaryMat2.uploadedFileSize : (body.uploadedFileSize || rows2[r][10] || ''),
              String(body.notes || '').trim(),
              submittedAt,
              new Date().toISOString(),
              matList2 ? JSON.stringify(matList2) : String(rows2[r][14] || ''),
              awardCat2,
            ],
          ]);
          updated = true;
          break;
        }
      }
      if (!updated) return jsonOutput_({ error: 'Data peserta tidak ditemukan.' });
      syncLeaderboardSheet_(ss);
      return jsonOutput_({ bootstrap: buildBootstrapData_(ss) });
    }

    if (action === 'deleteParticipant') {
      var pSheet3 = ss.getSheetByName(SHEET_NAMES.PARTICIPANTS);
      var pRows = pSheet3.getDataRange().getValues();
      for (var d = pRows.length - 1; d >= 1; d--) {
        if (String(pRows[d][0]) === String(body.id)) {
          pSheet3.deleteRow(d + 1);
        }
      }
      var sSheet3 = ss.getSheetByName(SHEET_NAMES.SCORES);
      var sRows = sSheet3.getDataRange().getValues();
      for (var ds = sRows.length - 1; ds >= 1; ds--) {
        if (String(sRows[ds][1]) === String(body.id)) {
          sSheet3.deleteRow(ds + 1);
        }
      }
      syncLeaderboardSheet_(ss);
      return jsonOutput_({ bootstrap: buildBootstrapData_(ss) });
    }

    if (action === 'authJudge') {
      var rawCode = String(body.accessCode || body.whatsapp || '').replace(/\D/g, '');
      if (rawCode.length !== 6) {
        return jsonOutput_({
          error: 'Masukkan tepat 6 angka terakhir dari nomor WhatsApp Anda yang terdaftar.',
        });
      }
      var judges = readRecords_(ss.getSheetByName(SHEET_NAMES.JUDGES));
      var matched = null;
      for (var j = 0; j < judges.length; j++) {
        var judgeDigits = normalizeWhatsApp_(judges[j].whatsapp).replace(/\D/g, '');
        if (judgeDigits.length >= 6 && judgeDigits.slice(-6) === rawCode) {
          matched = {
            id: String(judges[j].id),
            code: String(judges[j].code),
            label: String(judges[j].label),
            name: String(judges[j].name),
            title: String(judges[j].title),
            whatsapp: '',
          };
          break;
        }
      }
      if (!matched) {
        return jsonOutput_({
          error: 'Kode akses tidak cocok dengan daftar pada sheet Master_Juri.',
        });
      }
      return jsonOutput_({ judge: matched });
    }

    if (action === 'saveScores') {
      var sSheet = ensureSheet_(ss, SHEET_NAMES.SCORES, [
        'id', 'participantId', 'judgeId', 'judgeLabel', 'entityName', 'scoresJson',
        'ind_1_raw', 'ind_2_raw', 'ind_3_raw', 'totalWeighted', 'notes', 'updatedAt', 'awardCategory',
      ]);
      var allScores = sSheet.getDataRange().getValues();
      var participants = readRecords_(ss.getSheetByName(SHEET_NAMES.PARTICIPANTS));
      var judgesList = readRecords_(ss.getSheetByName(SHEET_NAMES.JUDGES));
      var indicatorsList = readRecords_(ss.getSheetByName(SHEET_NAMES.INDICATORS)).map(function (r) {
        return {
          id: String(r.id),
          awardCategory: normalizeAwardCategory_(r.awardCategory),
          order: Number(r.order),
          name: String(r.name),
          weight: Number(r.weight),
        };
      });

      var partObj = findById_(participants, body.participantId);
      var judgeObj = findById_(judgesList, body.judgeId);
      if (!partObj || !judgeObj) {
        return jsonOutput_({ error: 'Peserta atau Juri tidak ditemukan di spreadsheet.' });
      }

      var partCategory = normalizeAwardCategory_(partObj.awardCategory);
      var catIndicators = getIndicatorsForCategory_(indicatorsList, partCategory);
      var rawScores = body.scores || {};
      var totalWeighted = 0;
      for (var ii = 0; ii < catIndicators.length; ii++) {
        var indDef = catIndicators[ii];
        totalWeighted +=
          Math.max(0, Math.min(100, Number(rawScores[indDef.id] || 0))) *
          (Number(indDef.weight) / 100);
      }
      totalWeighted = roundToTwo_(totalWeighted);

      var raw1 = catIndicators[0] ? Number(rawScores[catIndicators[0].id] || 0) : 0;
      var raw2 = catIndicators[1] ? Number(rawScores[catIndicators[1].id] || 0) : 0;
      var raw3 = catIndicators[2] ? Number(rawScores[catIndicators[2].id] || 0) : 0;

      var nowScore = new Date().toISOString();
      var rowPayload = [
        'score-' + body.participantId + '-' + body.judgeId,
        String(body.participantId),
        String(body.judgeId),
        String(judgeObj.label),
        String(partObj.entityName),
        JSON.stringify(rawScores),
        raw1,
        raw2,
        raw3,
        totalWeighted,
        String(body.notes || '').trim(),
        nowScore,
        partCategory,
      ];

      var foundRow = -1;
      for (var sr = 1; sr < allScores.length; sr++) {
        if (
          String(allScores[sr][1]) === String(body.participantId) &&
          String(allScores[sr][2]) === String(body.judgeId)
        ) {
          foundRow = sr + 1;
          break;
        }
      }

      if (foundRow > 0) {
        rowPayload[0] = String(allScores[foundRow - 1][0]);
        sSheet.getRange(foundRow, 1, 1, 13).setValues([rowPayload]);
      } else {
        sSheet.appendRow(rowPayload);
      }

      syncLeaderboardSheet_(ss);
      return jsonOutput_({ bootstrap: buildBootstrapData_(ss) });
    }

    if (action === 'resetDemo') {
      var namesToClear = [
        SHEET_NAMES.ENTITIES,
        SHEET_NAMES.JUDGES,
        SHEET_NAMES.INDICATORS,
        SHEET_NAMES.PARTICIPANTS,
        SHEET_NAMES.SCORES,
      ];
      for (var nc = 0; nc < namesToClear.length; nc++) {
        var sh = ss.getSheetByName(namesToClear[nc]);
        if (sh && sh.getLastRow() > 1) {
          sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
        }
      }
      setupSpreadsheet();
      return jsonOutput_({ bootstrap: buildBootstrapData_(ss) });
    }

    return jsonOutput_({ error: 'Aksi tidak dikenali: ' + action });
  } catch (err) {
    return jsonOutput_({ error: err.message || 'Terjadi kesalahan pada server Apps Script.' });
  } finally {
    lock.releaseLock();
  }
}
