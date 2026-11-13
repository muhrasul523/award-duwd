/**
 * ============================================================================
 * BACKEND GOOGLE APPS SCRIPT — AWARD KOLABORASI DAN INOVASI MANDIRI 2026
 * Dewan Pengurus Pusat Wahdah Islamiyah
 * ============================================================================
 *
 * CARA PASANG:
 * 1. Buka Google Spreadsheet baru (atau yang sudah disiapkan).
 * 2. Klik menu: Extensions (Ekstensi) > Apps Script.
 * 3. Hapus seluruh isi Code.gs bawaan, lalu tempelkan seluruh kode ini.
 * 4. Simpan (Ctrl+S).
 * 5. Pilih fungsi "setupSpreadsheet" pada toolbar atas lalu klik "Run" (Jalankan).
 *    Berikan izin akses Spreadsheet & Google Drive saat diminta.
 * 6. Buka sheet "Pengaturan" di Spreadsheet Anda, lalu tempelkan Link Folder
 *    Google Drive tujuan pada baris DRIVE_FOLDER_URL (kolom B).
 * 7. Kembali ke editor Apps Script, klik "Deploy" > "New deployment" (Deployment baru):
 *    - Type: Web app
 *    - Execute as: Me (Saya)
 *    - Who has access: Anyone (Siapa saja)
 * 8. Salin Web App URL (akhiran /exec) dan tempelkan ke menu "Koneksi Apps Script"
 *    di bagian bawah aplikasi web (atau ke VITE_APPS_SCRIPT_URL).
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
  return SpreadsheetApp.getActiveSpreadsheet();
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

function roundToTwo_(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

function roundToFour_(num) {
  return Math.round((Number(num) + Number.EPSILON) * 10000) / 10000;
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
      ['INSTITUTION', 'Dewan Pengurus Pusat Wahdah Islamiyah', 'Nama lembaga penyelenggara'],
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
  judgesSheet.getRange('F:F').setNumberFormat('@');
  if (judgesSheet.getLastRow() <= 1) {
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

  // 4. Master_Indikator
  var indicatorsSheet = ensureSheet_(ss, SHEET_NAMES.INDICATORS, [
    'id',
    'order',
    'name',
    'description',
    'weight',
  ]);
  if (indicatorsSheet.getLastRow() <= 1) {
    writeRows_(indicatorsSheet, [
      [
        'ind-1',
        1,
        'Kolaborasi Strategis & Lintas Lembaga',
        'Tingkat sinergi program bersama pemerintah daerah, lembaga mitra, masjid, serta unit amal usaha Wahdah Islamiyah.',
        40,
      ],
      [
        'ind-2',
        2,
        'Orisinalitas, Dampak & Kemandirian Inovasi',
        'Kebaruan gagasan, manfaat terukur bagi masyarakat dan kader, serta kemandirian pendanaan dan operasional.',
        35,
      ],
      [
        'ind-3',
        3,
        'Replikasi, Keberlanjutan & Tata Kelola',
        'Kesiapan SOP, dokumentasi digital, serta potensi duplikasi oleh DPW/DPD lain di seluruh Indonesia.',
        25,
      ],
    ]);
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
        'Menghubungkan 24 DPD kabupaten/kota dalam satu dashboard aset wakaf produktif dan layanan kesehatan gratis.',
        '2026-11-08T08:15:00.000Z',
        now,
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
        'Kolaborasi aktif 42 masjid binaan, Baznas Kota, dan koperasi syariah berbasis QRIS terpusat.',
        '2026-11-08T10:30:00.000Z',
        now,
      ],
      [
        'part-3',
        'dpw-jakarta',
        'DPW',
        'DPW Wahdah Islamiyah DKI Jakarta',
        'DKI Jakarta',
        'Hub Kolaborasi Dakwah Digital & Inkubator Ekonomi Pemuda',
        'Video',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        '',
        '',
        '',
        'Inkubasi 120 UMKM binaan dan produksi konten dakwah multi-platform dengan jangkauan nasional.',
        '2026-11-08T13:20:00.000Z',
        now,
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
      ],
      [
        'part-5',
        'dpw-kaltim',
        'DPW',
        'DPW Wahdah Islamiyah Kalimantan Timur',
        'Kalimantan Timur',
        'Sistem Pendidikan Karakter Terpadu & Beasiswa Yatim Nusantara',
        'Link',
        'https://kaltim.wahdah.or.id/beasiswa-nusantara',
        '',
        '',
        '',
        'Menjangkau wilayah penyangga IKN melalui kemitraan sekolah Islam terpadu dan donatur korporasi.',
        '2026-11-09T11:10:00.000Z',
        now,
      ],
      [
        'part-6',
        'dpd-balikpapan',
        'DPD',
        'DPD Wahdah Islamiyah Kota Balikpapan',
        'Kalimantan Timur',
        'Sinergi Logistik Kemanusiaan & Respon Cepat Bencana Regional',
        'Video',
        'https://drive.google.com/file/d/balikpapan-logistik-2026/view',
        '',
        '',
        '',
        'Gudang logistik relawan siaga bencana dengan pelacakan distribusi bantuan secara terbuka.',
        '2026-11-09T15:00:00.000Z',
        now,
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
  ]);
  if (scoresSheet.getLastRow() <= 1) {
    writeRows_(scoresSheet, [
      ['score-p1-ja', 'part-1', 'judge-a', 'Juri A', 'DPW Wahdah Islamiyah Sulawesi Selatan', JSON.stringify({ 'ind-1': 94, 'ind-2': 91, 'ind-3': 90 }), 94, 91, 90, 91.95, 'Sinergi lintas 24 daerah sangat solid dan terukur dampaknya.', now],
      ['score-p1-jb', 'part-1', 'judge-b', 'Juri B', 'DPW Wahdah Islamiyah Sulawesi Selatan', JSON.stringify({ 'ind-1': 92, 'ind-2': 93, 'ind-3': 92 }), 92, 93, 92, 92.35, 'Model wakaf produktif sudah mandiri secara arus kas.', now],
      ['score-p1-jc', 'part-1', 'judge-c', 'Juri C', 'DPW Wahdah Islamiyah Sulawesi Selatan', JSON.stringify({ 'ind-1': 95, 'ind-2': 90, 'ind-3': 91 }), 95, 90, 91, 92.25, 'Dokumentasi SOP sangat siap direplikasi secara nasional.', now],

      ['score-p2-ja', 'part-2', 'judge-a', 'Juri A', 'DPD Wahdah Islamiyah Kota Makassar', JSON.stringify({ 'ind-1': 92, 'ind-2': 84, 'ind-3': 86 }), 92, 84, 86, 87.7, 'Kolaborasi 42 masjid dan otoritas zakat kota sangat menonjol.', now],
      ['score-p2-jb', 'part-2', 'judge-b', 'Juri B', 'DPD Wahdah Islamiyah Kota Makassar', JSON.stringify({ 'ind-1': 90, 'ind-2': 86, 'ind-3': 88 }), 90, 86, 88, 88.1, 'Digitalisasi ZISWAF mempermudah transparansi laporan.', now],
      ['score-p2-jc', 'part-2', 'judge-c', 'Juri C', 'DPD Wahdah Islamiyah Kota Makassar', JSON.stringify({ 'ind-1': 94, 'ind-2': 82, 'ind-3': 86 }), 94, 82, 86, 87.8, 'Kemitraan eksternal kuat dan menjadi percontohan DPD.', now],

      ['score-p3-ja', 'part-3', 'judge-a', 'Juri A', 'DPW Wahdah Islamiyah DKI Jakarta', JSON.stringify({ 'ind-1': 85, 'ind-2': 92, 'ind-3': 86 }), 85, 92, 86, 87.7, 'Inovasi digital sangat kreatif dengan jangkauan dakwah luas.', now],
      ['score-p3-jb', 'part-3', 'judge-b', 'Juri B', 'DPW Wahdah Islamiyah DKI Jakarta', JSON.stringify({ 'ind-1': 87, 'ind-2': 90, 'ind-3': 87 }), 87, 90, 87, 88.05, 'Inkubator UMKM pemuda memberikan dampak ekonomi nyata.', now],
      ['score-p3-jc', 'part-3', 'judge-c', 'Juri C', 'DPW Wahdah Islamiyah DKI Jakarta', JSON.stringify({ 'ind-1': 86, 'ind-2': 92, 'ind-3': 85 }), 86, 92, 85, 87.85, 'Perlu penguatan kolaborasi lintas lembaga pemerintah provinsi.', now],

      ['score-p4-ja', 'part-4', 'judge-a', 'Juri A', 'DPD Wahdah Islamiyah Kabupaten Gowa', JSON.stringify({ 'ind-1': 86, 'ind-2': 85, 'ind-3': 84 }), 86, 85, 84, 85.15, 'Sinergi pesantren dan kelompok tani lokal berjalan baik.', now],
      ['score-p4-jb', 'part-4', 'judge-b', 'Juri B', 'DPD Wahdah Islamiyah Kabupaten Gowa', JSON.stringify({ 'ind-1': 85, 'ind-2': 84, 'ind-3': 86 }), 85, 84, 86, 84.9, 'Kemandirian pangan pesantren mulai terasa hasilnya.', now],
      ['score-p4-jc', 'part-4', 'judge-c', 'Juri C', 'DPD Wahdah Islamiyah Kabupaten Gowa', JSON.stringify({ 'ind-1': 87, 'ind-2': 86, 'ind-3': 84 }), 87, 86, 84, 85.9, 'Cocok direplikasi oleh pesantren binaan di wilayah lain.', now],

      ['score-p5-ja', 'part-5', 'judge-a', 'Juri A', 'DPW Wahdah Islamiyah Kalimantan Timur', JSON.stringify({ 'ind-1': 84, 'ind-2': 82, 'ind-3': 85 }), 84, 82, 85, 83.55, 'Program beasiswa yatim terstruktur rapi dengan mitra sekolah.', now],
      ['score-p5-jb', 'part-5', 'judge-b', 'Juri B', 'DPW Wahdah Islamiyah Kalimantan Timur', JSON.stringify({ 'ind-1': 83, 'ind-2': 84, 'ind-3': 84 }), 83, 84, 84, 83.6, 'Dampak sosial di wilayah penyangga IKN cukup signifikan.', now],

      ['score-p6-ja', 'part-6', 'judge-a', 'Juri A', 'DPD Wahdah Islamiyah Kota Balikpapan', JSON.stringify({ 'ind-1': 82, 'ind-2': 80, 'ind-3': 82 }), 82, 80, 82, 81.3, 'Sistem logistik tanggap bencana sudah teruji di lapangan.', now],
    ]);
  }

  // 7. Rekap_Peringkat
  ensureSheet_(ss, SHEET_NAMES.LEADERBOARD, [
    'Peringkat',
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
  syncLeaderboardSheet_(ss);
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setBackground('#07525E')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function writeRows_(sheet, rows) {
  if (!rows || rows.length === 0) return;
  sheet
    .getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
    .setValues(rows);
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
      whatsapp: normalizeWhatsApp_(String(r.whatsapp)),
    };
  });

  var indicators = readRecords_(ss.getSheetByName(SHEET_NAMES.INDICATORS)).map(function (r) {
    return {
      id: String(r.id),
      order: Number(r.order),
      name: String(r.name),
      description: String(r.description),
      weight: Number(r.weight),
    };
  });

  var participants = readRecords_(ss.getSheetByName(SHEET_NAMES.PARTICIPANTS)).map(function (r) {
    return {
      id: String(r.id),
      entityId: String(r.entityId),
      entityType: String(r.entityType),
      entityName: String(r.entityName),
      province: String(r.province),
      innovationTitle: String(r.innovationTitle),
      materialType: String(r.materialType),
      materialUrl: String(r.materialUrl),
      uploadedFileName: r.uploadedFileName ? String(r.uploadedFileName) : undefined,
      uploadedFileSize: r.uploadedFileSize !== '' ? Number(r.uploadedFileSize) : undefined,
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
        'ind-1': Number(r.ind_1_raw || 0),
        'ind-2': Number(r.ind_2_raw || 0),
        'ind-3': Number(r.ind_3_raw || 0),
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

function computeLeaderboard_(participants, judges, indicators, scores) {
  var sortedIndicators = indicators.slice().sort(function (a, b) {
    return a.order - b.order;
  });
  var highestIndicator =
    sortedIndicators.slice().sort(function (a, b) {
      return b.weight - a.weight || a.order - b.order;
    })[0] || sortedIndicators[0];

  var entries = participants.map(function (participant) {
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
      var higherPeer = samePeers.find(function (p) {
        return p.rank < item.rank;
      });
      var lowerPeer = samePeers.find(function (p) {
        return p.rank > item.rank;
      });
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

function syncLeaderboardSheet_(ss) {
  var sheet = ss.getSheetByName(SHEET_NAMES.LEADERBOARD);
  if (!sheet) return;
  var data = buildBootstrapData_(ss);

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).clearContent();
  }
  if (data.leaderboard.length === 0) return;

  var rows = data.leaderboard.map(function (entry) {
    return [
      entry.rank,
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
  sheet.getRange(2, 1, rows.length, 12).setValues(rows);
}

/**
 * HTTP GET handler
 */
function doGet(e) {
  try {
    var ss = getSpreadsheet_();
    var action = (e && e.parameter && e.parameter.action) || 'bootstrap';
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
      var entity = entities.find(function (item) {
        return String(item.id) === String(body.entityId);
      });
      if (!entity) return jsonOutput_({ error: 'Entitas DPW/DPD tidak valid.' });

      var now = new Date().toISOString();
      var newId = 'part-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      var pSheet = ss.getSheetByName(SHEET_NAMES.PARTICIPANTS);
      pSheet.appendRow([
        newId,
        String(entity.id),
        String(entity.type),
        String(entity.name),
        String(entity.province),
        String(body.innovationTitle || '').trim(),
        String(body.materialType || 'Link'),
        String(body.materialUrl || '').trim(),
        String(body.driveFileId || ''),
        String(body.uploadedFileName || ''),
        body.uploadedFileSize || '',
        String(body.notes || '').trim(),
        now,
        now,
      ]);
      syncLeaderboardSheet_(ss);
      return jsonOutput_({ bootstrap: buildBootstrapData_(ss) });
    }

    if (action === 'updateParticipant') {
      var entities2 = readRecords_(ss.getSheetByName(SHEET_NAMES.ENTITIES));
      var entity2 = entities2.find(function (item) {
        return String(item.id) === String(body.entityId);
      });
      if (!entity2) return jsonOutput_({ error: 'Entitas DPW/DPD tidak valid.' });

      var pSheet2 = ss.getSheetByName(SHEET_NAMES.PARTICIPANTS);
      var rows2 = pSheet2.getDataRange().getValues();
      var updated = false;
      for (var r = 1; r < rows2.length; r++) {
        if (String(rows2[r][0]) === String(body.id)) {
          var submittedAt = rows2[r][12] || new Date().toISOString();
          pSheet2.getRange(r + 1, 1, 1, 14).setValues([
            [
              String(body.id),
              String(entity2.id),
              String(entity2.type),
              String(entity2.name),
              String(entity2.province),
              String(body.innovationTitle || '').trim(),
              String(body.materialType || 'Link'),
              String(body.materialUrl || '').trim(),
              String(body.driveFileId || rows2[r][8] || ''),
              String(body.uploadedFileName || rows2[r][9] || ''),
              body.uploadedFileSize || rows2[r][10] || '',
              String(body.notes || '').trim(),
              submittedAt,
              new Date().toISOString(),
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
      var norm = normalizeWhatsApp_(body.whatsapp);
      if (!norm || norm.length < 9) {
        return jsonOutput_({
          error: 'Masukkan nomor WhatsApp yang valid (contoh: 08114401001).',
        });
      }
      var judges = readRecords_(ss.getSheetByName(SHEET_NAMES.JUDGES));
      var matched = null;
      for (var j = 0; j < judges.length; j++) {
        if (normalizeWhatsApp_(judges[j].whatsapp) === norm) {
          matched = {
            id: String(judges[j].id),
            code: String(judges[j].code),
            label: String(judges[j].label),
            name: String(judges[j].name),
            title: String(judges[j].title),
            whatsapp: normalizeWhatsApp_(judges[j].whatsapp),
          };
          break;
        }
      }
      if (!matched) {
        return jsonOutput_({
          error: 'Nomor WhatsApp tidak terdaftar dalam sheet Master_Juri.',
        });
      }
      return jsonOutput_({ judge: matched });
    }

    if (action === 'saveScores') {
      var sSheet = ss.getSheetByName(SHEET_NAMES.SCORES);
      var allScores = sSheet.getDataRange().getValues();
      var participants = readRecords_(ss.getSheetByName(SHEET_NAMES.PARTICIPANTS));
      var judgesList = readRecords_(ss.getSheetByName(SHEET_NAMES.JUDGES));
      var indicatorsList = readRecords_(ss.getSheetByName(SHEET_NAMES.INDICATORS));

      var partObj = participants.find(function (p) {
        return String(p.id) === String(body.participantId);
      });
      var judgeObj = judgesList.find(function (jg) {
        return String(jg.id) === String(body.judgeId);
      });
      if (!partObj || !judgeObj) {
        return jsonOutput_({ error: 'Peserta atau Juri tidak ditemukan di spreadsheet.' });
      }

      var rawScores = body.scores || {};
      var totalWeighted = 0;
      for (var ii = 0; ii < indicatorsList.length; ii++) {
        var indDef = indicatorsList[ii];
        totalWeighted +=
          Math.max(0, Math.min(100, Number(rawScores[indDef.id] || 0))) *
          (Number(indDef.weight) / 100);
      }
      totalWeighted = roundToTwo_(totalWeighted);

      var nowScore = new Date().toISOString();
      var rowPayload = [
        'score-' + body.participantId + '-' + body.judgeId,
        String(body.participantId),
        String(body.judgeId),
        String(judgeObj.label),
        String(partObj.entityName),
        JSON.stringify(rawScores),
        Number(rawScores['ind-1'] || 0),
        Number(rawScores['ind-2'] || 0),
        Number(rawScores['ind-3'] || 0),
        totalWeighted,
        String(body.notes || '').trim(),
        nowScore,
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
        sSheet.getRange(foundRow, 1, 1, 12).setValues([rowPayload]);
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
