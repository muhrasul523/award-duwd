import type { AwardDatabase } from './types.ts';

export function createSeedDatabase(): AwardDatabase {
  const now = new Date('2026-11-10T09:00:00.000Z').toISOString();

  return {
    entities: [
      // Master DPW (Provinsi)
      { id: 'dpw-sulsel', code: 'DPW-01', type: 'DPW', name: 'DPW Wahdah Islamiyah Sulawesi Selatan', province: 'Sulawesi Selatan' },
      { id: 'dpw-jakarta', code: 'DPW-02', type: 'DPW', name: 'DPW Wahdah Islamiyah DKI Jakarta', province: 'DKI Jakarta' },
      { id: 'dpw-jabar', code: 'DPW-03', type: 'DPW', name: 'DPW Wahdah Islamiyah Jawa Barat', province: 'Jawa Barat' },
      { id: 'dpw-jatim', code: 'DPW-04', type: 'DPW', name: 'DPW Wahdah Islamiyah Jawa Timur', province: 'Jawa Timur' },
      { id: 'dpw-kaltim', code: 'DPW-05', type: 'DPW', name: 'DPW Wahdah Islamiyah Kalimantan Timur', province: 'Kalimantan Timur' },
      { id: 'dpw-sultra', code: 'DPW-06', type: 'DPW', name: 'DPW Wahdah Islamiyah Sulawesi Tenggara', province: 'Sulawesi Tenggara' },
      { id: 'dpw-sulteng', code: 'DPW-07', type: 'DPW', name: 'DPW Wahdah Islamiyah Sulawesi Tengah', province: 'Sulawesi Tengah' },
      { id: 'dpw-sumut', code: 'DPW-08', type: 'DPW', name: 'DPW Wahdah Islamiyah Sumatera Utara', province: 'Sumatera Utara' },
      { id: 'dpw-diy', code: 'DPW-09', type: 'DPW', name: 'DPW Wahdah Islamiyah DI Yogyakarta', province: 'DI Yogyakarta' },
      { id: 'dpw-riau', code: 'DPW-10', type: 'DPW', name: 'DPW Wahdah Islamiyah Riau', province: 'Riau' },
      { id: 'dpw-gorontalo', code: 'DPW-11', type: 'DPW', name: 'DPW Wahdah Islamiyah Gorontalo', province: 'Gorontalo' },
      { id: 'dpw-papua', code: 'DPW-12', type: 'DPW', name: 'DPW Wahdah Islamiyah Papua', province: 'Papua' },

      // Master DPD (Kabupaten/Kota)
      { id: 'dpd-makassar', code: 'DPD-01', type: 'DPD', name: 'DPD Wahdah Islamiyah Kota Makassar', province: 'Sulawesi Selatan' },
      { id: 'dpd-gowa', code: 'DPD-02', type: 'DPD', name: 'DPD Wahdah Islamiyah Kabupaten Gowa', province: 'Sulawesi Selatan' },
      { id: 'dpd-maros', code: 'DPD-03', type: 'DPD', name: 'DPD Wahdah Islamiyah Kabupaten Maros', province: 'Sulawesi Selatan' },
      { id: 'dpd-parepare', code: 'DPD-04', type: 'DPD', name: 'DPD Wahdah Islamiyah Kota Parepare', province: 'Sulawesi Selatan' },
      { id: 'dpd-jaktim', code: 'DPD-05', type: 'DPD', name: 'DPD Wahdah Islamiyah Jakarta Timur', province: 'DKI Jakarta' },
      { id: 'dpd-jaksel', code: 'DPD-06', type: 'DPD', name: 'DPD Wahdah Islamiyah Jakarta Selatan', province: 'DKI Jakarta' },
      { id: 'dpd-bandung', code: 'DPD-07', type: 'DPD', name: 'DPD Wahdah Islamiyah Kota Bandung', province: 'Jawa Barat' },
      { id: 'dpd-bogor', code: 'DPD-08', type: 'DPD', name: 'DPD Wahdah Islamiyah Kabupaten Bogor', province: 'Jawa Barat' },
      { id: 'dpd-bekasi', code: 'DPD-09', type: 'DPD', name: 'DPD Wahdah Islamiyah Kota Bekasi', province: 'Jawa Barat' },
      { id: 'dpd-surabaya', code: 'DPD-10', type: 'DPD', name: 'DPD Wahdah Islamiyah Kota Surabaya', province: 'Jawa Timur' },
      { id: 'dpd-malang', code: 'DPD-11', type: 'DPD', name: 'DPD Wahdah Islamiyah Kota Malang', province: 'Jawa Timur' },
      { id: 'dpd-balikpapan', code: 'DPD-12', type: 'DPD', name: 'DPD Wahdah Islamiyah Kota Balikpapan', province: 'Kalimantan Timur' },
      { id: 'dpd-samarinda', code: 'DPD-13', type: 'DPD', name: 'DPD Wahdah Islamiyah Kota Samarinda', province: 'Kalimantan Timur' },
      { id: 'dpd-kendari', code: 'DPD-14', type: 'DPD', name: 'DPD Wahdah Islamiyah Kota Kendari', province: 'Sulawesi Tenggara' },
      { id: 'dpd-palu', code: 'DPD-15', type: 'DPD', name: 'DPD Wahdah Islamiyah Kota Palu', province: 'Sulawesi Tengah' },
      { id: 'dpd-medan', code: 'DPD-16', type: 'DPD', name: 'DPD Wahdah Islamiyah Kota Medan', province: 'Sumatera Utara' },
      { id: 'dpd-sleman', code: 'DPD-17', type: 'DPD', name: 'DPD Wahdah Islamiyah Kabupaten Sleman', province: 'DI Yogyakarta' },
      { id: 'dpd-pekanbaru', code: 'DPD-18', type: 'DPD', name: 'DPD Wahdah Islamiyah Kota Pekanbaru', province: 'Riau' },
    ],

    judges: [
      {
        id: 'judge-a',
        code: 'A',
        label: 'Juri A',
        name: 'Ust. Dr. H. Muhammad Qasim Saguni, M.A.',
        title: 'Dewan Juri A · Bidang Kolaborasi & Kebijakan Organisasi',
        whatsapp: '08114401001',
      },
      {
        id: 'judge-b',
        code: 'B',
        label: 'Juri B',
        name: 'Ust. Ir. H. Iskandar Kato, M.Si.',
        title: 'Dewan Juri B · Bidang Inovasi & Kemandirian Ekosistem',
        whatsapp: '08124402002',
      },
      {
        id: 'judge-c',
        code: 'C',
        label: 'Juri C',
        name: 'Ust. H. Syaibani Mujiono, S.Pd.I., M.M.',
        title: 'Dewan Juri C · Bidang Tata Kelola & Replikasi Nasional',
        whatsapp: '08134403003',
      },
    ],

    indicators: [
      // Kategori 1: Award Kolaborasi (Bobot: 40% + 35% + 25% = 100%)
      {
        id: 'kol-1',
        awardCategory: 'KOLABORASI',
        order: 1,
        name: 'Sinergi Lintas Lembaga & Pemerintah',
        description:
          'Tingkat kolaborasi strategis bersama pemerintah daerah, lembaga mitra, masjid, serta unit amal usaha Wahdah Islamiyah.',
        weight: 40,
      },
      {
        id: 'kol-2',
        awardCategory: 'KOLABORASI',
        order: 2,
        name: 'Dampak & Jangkauan Program Bersama',
        description:
          'Manfaat terukur bagi masyarakat dan kader hasil sinergi multipihak serta efektivitas pemanfaatan sumber daya bersama.',
        weight: 35,
      },
      {
        id: 'kol-3',
        awardCategory: 'KOLABORASI',
        order: 3,
        name: 'Tata Kelola Kemitraan & Keberlanjutan',
        description:
          'Kejelasan MoU/SOP kolaborasi, pelaporan transparan, serta potensi replikasi kemitraan oleh DPW/DPD lain.',
        weight: 25,
      },

      // Kategori 2: Award Inovasi Mandiri (Bobot: 45% + 30% + 25% = 100%)
      {
        id: 'ino-1',
        awardCategory: 'INOVASI_MANDIRI',
        order: 1,
        name: 'Orisinalitas & Kebaruan Solusi',
        description:
          'Tingkat kreativitas, keunikan pendekatan atau teknologi, dan terobosan baru dalam menjawab tantangan dakwah dan ummat.',
        weight: 45,
      },
      {
        id: 'ino-2',
        awardCategory: 'INOVASI_MANDIRI',
        order: 2,
        name: 'Kemandirian Operasional & Pendanaan',
        description:
          'Kemampuan entitas menopang program inovasi secara swadaya, berkelanjutan secara finansial, dan mandiri secara ekosistem.',
        weight: 30,
      },
      {
        id: 'ino-3',
        awardCategory: 'INOVASI_MANDIRI',
        order: 3,
        name: 'Efektivitas Implementasi & Replikasi',
        description:
          'Hasil nyata di lapangan, kelengkapan dokumentasi SOP digital, serta kemudahan adopsi oleh DPW/DPD lain.',
        weight: 25,
      },
    ],

    participants: [
      // === KATEGORI 1: KOLABORASI ===
      {
        id: 'part-1',
        awardCategory: 'KOLABORASI',
        entityId: 'dpw-sulsel',
        entityType: 'DPW',
        entityName: 'DPW Wahdah Islamiyah Sulawesi Selatan',
        province: 'Sulawesi Selatan',
        innovationTitle: 'Ekosistem Wakaf Produktif & Klinik Pemberdayaan Ummat Terpadu',
        materialType: 'PDF/PPT',
        materialUrl: 'https://wahdah.or.id/award-2026/ekosistem-wakaf-sulsel.pdf',
        materials: [
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
        ],
        notes: 'Menghubungkan 24 DPD kabupaten/kota dan dinas kesehatan daerah dalam satu ekosistem layanan ummat.',
        submittedAt: '2026-11-08T08:15:00.000Z',
        updatedAt: now,
      },
      {
        id: 'part-2',
        awardCategory: 'KOLABORASI',
        entityId: 'dpd-makassar',
        entityType: 'DPD',
        entityName: 'DPD Wahdah Islamiyah Kota Makassar',
        province: 'Sulawesi Selatan',
        innovationTitle: 'Gerakan Masjid Mandiri & Manajemen ZISWAF Digital Terintegrasi',
        materialType: 'Link',
        materialUrl: 'https://inovasi.wahdahmakassar.org/masjid-mandiri-2026',
        notes: 'Kolaborasi aktif 42 masjid binaan, Baznas Kota Makassar, dan koperasi syariah berbasis QRIS terpusat.',
        submittedAt: '2026-11-08T10:30:00.000Z',
        updatedAt: now,
      },
      {
        id: 'part-5',
        awardCategory: 'KOLABORASI',
        entityId: 'dpw-kaltim',
        entityType: 'DPW',
        entityName: 'DPW Wahdah Islamiyah Kalimantan Timur',
        province: 'Kalimantan Timur',
        innovationTitle: 'Sinergi Pendidikan Karakter Terpadu & Beasiswa Yatim Nusantara',
        materialType: 'Link',
        materialUrl: 'https://kaltim.wahdah.or.id/beasiswa-nusantara',
        notes: 'Menjangkau wilayah penyangga IKN melalui kemitraan sekolah Islam terpadu dan donatur korporasi.',
        submittedAt: '2026-11-09T11:10:00.000Z',
        updatedAt: now,
      },

      // === KATEGORI 2: INOVASI MANDIRI ===
      {
        id: 'part-3',
        awardCategory: 'INOVASI_MANDIRI',
        entityId: 'dpw-jakarta',
        entityType: 'DPW',
        entityName: 'DPW Wahdah Islamiyah DKI Jakarta',
        province: 'DKI Jakarta',
        innovationTitle: 'Hub Dakwah Digital & Inkubator Kemandirian Ekonomi Pemuda',
        materialType: 'Video',
        materialUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        materials: [
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
        ],
        notes: 'Inkubasi 120 UMKM binaan mandiri dan produksi konten dakwah multi-platform dengan pembiayaan swadaya.',
        submittedAt: '2026-11-08T13:20:00.000Z',
        updatedAt: now,
      },
      {
        id: 'part-4',
        awardCategory: 'INOVASI_MANDIRI',
        entityId: 'dpd-gowa',
        entityType: 'DPD',
        entityName: 'DPD Wahdah Islamiyah Kabupaten Gowa',
        province: 'Sulawesi Selatan',
        innovationTitle: 'Pesantren Agroteknologi & Kemandirian Pangan Berkelanjutan',
        materialType: 'PDF/PPT',
        materialUrl: 'https://wahdah.or.id/award-2026/agroteknologi-gowa-deck.pdf',
        notes: 'Budidaya hidroponik skala komersial untuk menopang biaya operasional pondok tahfiz dan beasiswa santri.',
        submittedAt: '2026-11-09T07:45:00.000Z',
        updatedAt: now,
      },
      {
        id: 'part-6',
        awardCategory: 'INOVASI_MANDIRI',
        entityId: 'dpd-balikpapan',
        entityType: 'DPD',
        entityName: 'DPD Wahdah Islamiyah Kota Balikpapan',
        province: 'Kalimantan Timur',
        innovationTitle: 'Sistem Logistik Kemanusiaan & Respon Cepat Bencana Regional',
        materialType: 'Video',
        materialUrl: 'https://drive.google.com/file/d/balikpapan-logistik-2026/view',
        notes: 'Gudang logistik relawan siaga bencana dengan pelacakan distribusi bantuan secara mandiri dan terbuka.',
        submittedAt: '2026-11-09T15:00:00.000Z',
        updatedAt: now,
      },
    ],

    scores: [
      // === NILAI KOLABORASI ===
      // part-1: DPW Sulsel (Rank #1 Kolaborasi, ~92.18)
      {
        id: 'score-p1-ja',
        participantId: 'part-1',
        judgeId: 'judge-a',
        scores: { 'kol-1': 94, 'kol-2': 91, 'kol-3': 90 },
        notes: 'Sinergi lintas 24 daerah sangat solid dan terukur dampaknya.',
        updatedAt: now,
      },
      {
        id: 'score-p1-jb',
        participantId: 'part-1',
        judgeId: 'judge-b',
        scores: { 'kol-1': 92, 'kol-2': 93, 'kol-3': 92 },
        notes: 'Model wakaf kolaboratif sudah mandiri secara arus kas.',
        updatedAt: now,
      },
      {
        id: 'score-p1-jc',
        participantId: 'part-1',
        judgeId: 'judge-c',
        scores: { 'kol-1': 95, 'kol-2': 90, 'kol-3': 91 },
        notes: 'Dokumentasi MoU dan SOP sangat siap direplikasi secara nasional.',
        updatedAt: now,
      },

      // part-2: DPD Makassar (Kolaborasi: Final Score = 87.87, Ind 40% = 36.80 -> Rank #2 via Tie-Breaker)
      {
        id: 'score-p2-ja',
        participantId: 'part-2',
        judgeId: 'judge-a',
        scores: { 'kol-1': 92, 'kol-2': 84, 'kol-3': 86 },
        notes: 'Kolaborasi 42 masjid dan otoritas zakat kota sangat menonjol.',
        updatedAt: now,
      },
      {
        id: 'score-p2-jb',
        participantId: 'part-2',
        judgeId: 'judge-b',
        scores: { 'kol-1': 90, 'kol-2': 86, 'kol-3': 88 },
        notes: 'Digitalisasi ZISWAF mempermudah transparansi laporan mitra.',
        updatedAt: now,
      },
      {
        id: 'score-p2-jc',
        participantId: 'part-2',
        judgeId: 'judge-c',
        scores: { 'kol-1': 94, 'kol-2': 82, 'kol-3': 86 },
        notes: 'Kemitraan eksternal kuat dan menjadi percontohan DPD.',
        updatedAt: now,
      },

      // part-5: DPW Kaltim (Kolaborasi: Final Score = 87.87, Ind 40% = 34.40 -> Rank #3 via Tie-Breaker)
      {
        id: 'score-p5-ja',
        participantId: 'part-5',
        judgeId: 'judge-a',
        scores: { 'kol-1': 85, 'kol-2': 92, 'kol-3': 86 },
        notes: 'Dampak program beasiswa yatim sangat luas di wilayah penyangga IKN.',
        updatedAt: now,
      },
      {
        id: 'score-p5-jb',
        participantId: 'part-5',
        judgeId: 'judge-b',
        scores: { 'kol-1': 87, 'kol-2': 90, 'kol-3': 87 },
        notes: 'Keterlibatan mitra korporasi dan sekolah sangat terukur.',
        updatedAt: now,
      },
      {
        id: 'score-p5-jc',
        participantId: 'part-5',
        judgeId: 'judge-c',
        scores: { 'kol-1': 86, 'kol-2': 92, 'kol-3': 85 },
        notes: 'Perlu penguatan MoU lintas instansi pemerintah provinsi.',
        updatedAt: now,
      },

      // === NILAI INOVASI MANDIRI ===
      // part-3: DPW DKI Jakarta (Rank #1 Inovasi Mandiri, 90.10)
      {
        id: 'score-p3-ja',
        participantId: 'part-3',
        judgeId: 'judge-a',
        scores: { 'ino-1': 91, 'ino-2': 90, 'ino-3': 89 },
        notes: 'Terobosan inkubator pemuda sangat orisinal dan berdaya saing.',
        updatedAt: now,
      },
      {
        id: 'score-p3-jb',
        participantId: 'part-3',
        judgeId: 'judge-b',
        scores: { 'ino-1': 92, 'ino-2': 88, 'ino-3': 90 },
        notes: 'Pendanaan unit UMKM binaan telah berputar mandiri.',
        updatedAt: now,
      },
      {
        id: 'score-p3-jc',
        participantId: 'part-3',
        judgeId: 'judge-c',
        scores: { 'ino-1': 90, 'ino-2': 91, 'ino-3': 88 },
        notes: 'Mudah diadaptasi DPW kota besar lainnya.',
        updatedAt: now,
      },

      // part-4: DPD Gowa (Inovasi Mandiri, 2/3 Juri — awaiting Juri C)
      {
        id: 'score-p4-ja',
        participantId: 'part-4',
        judgeId: 'judge-a',
        scores: { 'ino-1': 86, 'ino-2': 85, 'ino-3': 84 },
        notes: 'Inovasi hidroponik pesantren memberikan kemandirian nyata.',
        updatedAt: now,
      },
      {
        id: 'score-p4-jb',
        participantId: 'part-4',
        judgeId: 'judge-b',
        scores: { 'ino-1': 88, 'ino-2': 84, 'ino-3': 86 },
        notes: 'Produksi pangan pesantren mulai menopang biaya operasional santri.',
        updatedAt: now,
      },

      // part-6: DPD Balikpapan (Inovasi Mandiri, 1/3 Juri — awaiting Juri B & C)
      {
        id: 'score-p6-ja',
        participantId: 'part-6',
        judgeId: 'judge-a',
        scores: { 'ino-1': 84, 'ino-2': 82, 'ino-3': 80 },
        notes: 'Aplikasi pelacakan logistik mandiri sudah teruji di lapangan.',
        updatedAt: now,
      },
    ],
  };
}
