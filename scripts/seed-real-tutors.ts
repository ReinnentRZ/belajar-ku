import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs';

const isDocker = fs.existsSync('/.dockerenv');
let dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/belajarku?schema=public';
if (!isDocker && dbUrl.includes('@postgres:')) {
  dbUrl = dbUrl.replace('@postgres:', '@localhost:');
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl },
  },
});

async function main() {
  console.log('🌱 ==============================================================================');
  console.log('🚀 SEEDING 7 REAL TUTOR PROFILES, SERVICES & AVAILABILITIES FOR BELAJAR-KU');
  console.log('================================================================================');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Ensure required Categories exist
  console.log('\n📚 1. Verifying & Upserting Categories...');
  const categoryDefs = [
    {
      name: 'Bahasa Arab Dasar SD & SMP',
      targetGrade: 'SD' as const,
      categoryGroup: 'ACADEMIC' as const,
      slug: 'bahasa-arab-sd',
    },
    {
      name: "Baca Tulis Al-Qur'an (BTQ) & Iqro Anak SD",
      targetGrade: 'SD' as const,
      categoryGroup: 'BACA_TULIS_QURAN' as const,
      slug: 'btq-sd',
    },
    {
      name: "Kelas Muroja'ah & Tahfidz Al-Qur'an",
      targetGrade: 'SMP' as const,
      categoryGroup: 'MUROJAAH' as const,
      slug: 'murojaah-smp',
    },
    {
      name: 'IPS Terpadu & Geografi SMP',
      targetGrade: 'SMP' as const,
      categoryGroup: 'ACADEMIC' as const,
      slug: 'ips-smp',
    },
    {
      name: 'Calistung (Baca, Tulis, Hitung) PAUD',
      targetGrade: 'PAUD' as const,
      categoryGroup: 'ACADEMIC' as const,
      slug: 'calistung-paud',
    },
    {
      name: 'Matematika SMP',
      targetGrade: 'SMP' as const,
      categoryGroup: 'ACADEMIC' as const,
      slug: 'matematika-smp',
    },
    {
      name: 'Modul Ajar & RPP Kurikulum Merdeka',
      targetGrade: 'SD' as const,
      categoryGroup: 'ADMINISTRASI_GURU' as const,
      slug: 'modul-ajar-merdeka',
    },
    {
      name: 'Pendampingan LPJ Dana BOS & Keuangan Sekolah',
      targetGrade: 'SMP' as const,
      categoryGroup: 'ADMINISTRASI_GURU' as const,
      slug: 'lpj-bos-sekolah',
    },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoryDefs) {
    const upserted = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        targetGrade: cat.targetGrade,
        categoryGroup: cat.categoryGroup,
      },
      create: {
        name: cat.name,
        targetGrade: cat.targetGrade,
        categoryGroup: cat.categoryGroup,
        slug: cat.slug,
      },
    });
    categoryMap.set(cat.slug, upserted.id);
    console.log(`  ✔ Category: ${cat.name} (${cat.slug}) -> ID: ${upserted.id}`);
  }

  // 2. Data Definitions for 7 Tutors
  const realTutors = [
    // -------------------------------------------------------------------------
    // Tutor 1: Ainun Fauzi, S.Pd
    // -------------------------------------------------------------------------
    {
      name: 'Ainun Fauzi, S.Pd',
      email: 'ainun.fauzi@belajarku.com',
      phone: '081234560001',
      education: 'S1 Pendidikan Bahasa Arab',
      bio: 'Guru lulusan Pendidikan Bahasa Arab dengan pengalaman 5 tahun mengajar nahwu shorof, mufrodat, dan muhadatsah interaktif ramah anak untuk siswa SD dan SMP.',
      address: 'Jakarta Timur, DKI Jakarta',
      teachingCredentials: 'S.Pd Pendidikan Bahasa Arab, Sertifikasi Pendidik Bahasa Arab Terpadu',
      specialAccommodations: 'Tersedia kartu mufrodat bergambar dan tabel tashrif praktis',
      availabilities: [
        { dayOfWeek: 1, startTime: '15:30', endTime: '17:00' }, // Senin
        { dayOfWeek: 3, startTime: '15:30', endTime: '17:00' }, // Rabu
      ],
      services: [
        {
          categorySlug: 'bahasa-arab-sd',
          title: 'Les Privat Bahasa Arab Dasar, Nahwu Shorof & Percakapan',
          serviceType: 'SESSION_BASED' as const,
          teachingMode: 'OFFLINE_VISIT' as const,
          sessionCount: 4,
          durationMinutes: 90,
          price: 380000,
          description:
            'Bimbingan intensif penguasaan kaidah dasar bahasa Arab, nahwu shorof aplikatif, pengayaan mufrodat kosakata harian, serta latihan percakapan (muhadatsah) praktis untuk siswa SD dan SMP.',
          syllabusHighlights: [
            'Pengenalan Huruf Hijaiyah & Kaidah Penulisan Sambung',
            "Kaidah Nahwu Dasar: Isim, Fi'il, Huruf & Tanda I'rob",
            'Shorof Pemula: Tashrif Lughowi & Istilahi Kata Kerja',
            'Latihan Percakapan Harian (Muhadatsah Yaumiyyah) & Mufrodat',
          ],
          specialAccommodations: 'Modul rangkuman ringkas tabel nahwu shorof dan kartu latihan hafalan kosakata.',
          deliverableFormats: [],
          maxRevisions: 2,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Tutor 2: Nurul Khofifatul Molika, S.Ag
    // -------------------------------------------------------------------------
    {
      name: 'Nurul Khofifatul Molika, S.Ag',
      email: 'nurul.molika@belajarku.com',
      phone: '081234560002',
      education: "S1 Ilmu Al-Qur'an / Guru Ngaji",
      bio: "Guru ngaji lulusan Ilmu Al-Qur'an bersanad tajwid ramah anak, berdedikasi membimbing baca tulis Al-Qur'an dari nol hingga lancar dan berakhlak mulia.",
      address: 'Jakarta Selatan, DKI Jakarta',
      teachingCredentials: "S.Ag Ilmu Al-Qur'an dan Tafsir, Syahadah Metode Qiroati & Iqro",
      specialAccommodations: 'Kartu visual organ makhraj huruf dan lembar mewarnai huruf hijaiyah',
      availabilities: [
        { dayOfWeek: 2, startTime: '16:00', endTime: '17:00' }, // Selasa
        { dayOfWeek: 4, startTime: '16:00', endTime: '17:00' }, // Kamis
      ],
      services: [
        {
          categorySlug: 'btq-sd',
          title: 'Bimbingan Mengaji Iqro, BTQ & Makharijul Huruf Anak',
          serviceType: 'SESSION_BASED' as const,
          teachingMode: 'OFFLINE_VISIT' as const,
          sessionCount: 4,
          durationMinutes: 60,
          price: 320000,
          description:
            "Pendampingan belajar membaca Al-Qur'an dengan metode Iqro bertahap, pembiasaan makharijul huruf yang fasih, kaidah tajwid dasar, dan adab membaca Al-Qur'an untuk anak usia sekolah dasar.",
          syllabusHighlights: [
            'Pengenalan & Pemantapan Makhorijul Huruf Hijaiyah',
            'Metode Pembacaan Iqro Jilid 1-6 dengan Ketukan Ritmis',
            'Pengenalan Tanda Baca Panjang (Mad Asli) & Tanwin',
            "Latihan Menulis Huruf Hijaiyah Mandiri & Adab Qur'ani",
          ],
          specialAccommodations: "Tersedia kartu visual makhraj organ mulut dan buku pemantau mutaba'ah mengaji harian.",
          deliverableFormats: [],
          maxRevisions: 2,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Tutor 3: Risda Alfi Fat Hanna, S.Ag
    // -------------------------------------------------------------------------
    {
      name: 'Risda Alfi Fat Hanna, S.Ag',
      email: 'risda.hanna@belajarku.com',
      phone: '081234560003',
      education: "S1 Ilmu Al-Qur'an / Guru Ngaji Spesialis Murojaah",
      bio: "Hafizhah Al-Qur'an 30 Juz dan pengajar spesialis muroja'ah serta tahfidz bersanad dengan metode repetisi menyenangkan dan penjagaan hafalan jangka panjang mutqin.",
      address: 'Depok, Jawa Barat',
      teachingCredentials: "S.Ag Ilmu Al-Qur'an, Sanad Tahfidz 30 Juz Mutqin, Sertifikasi Muallim Qur'an",
      specialAccommodations: 'Buku jurnal mutabaah digital dan audio rekaman tilawah pembimbing',
      availabilities: [
        { dayOfWeek: 3, startTime: '16:00', endTime: '17:00' }, // Rabu
        { dayOfWeek: 5, startTime: '16:00', endTime: '17:00' }, // Jumat
      ],
      services: [
        {
          categorySlug: 'murojaah-smp',
          title: "Pendampingan Murojaah & Tahfidz Al-Qur'an Juz 30 Terpadu",
          serviceType: 'SESSION_BASED' as const,
          teachingMode: 'ONLINE' as const,
          sessionCount: 4,
          durationMinutes: 60,
          price: 350000,
          description:
            "Program pendampingan privat talaqqi hafalan baru dan muroja'ah harian Juz 30 (Juz 'Amma) terstruktur via tatap muka daring dengan evaluasi tajwid dan kefasihan tilawah berkala.",
          syllabusHighlights: [
            'Metode Talaqqi & Tikror Pengulangan Hafalan Terstruktur',
            'Pemeriksaan Tajwid Makhraj pada Bacaan Hafalan Surat Pendek',
            'Teknik Kuat Hafalan (Mutqin) Tanpa Beban Berlebih',
            "Pemberian Target Hafalan Mingguan & Laporan Mutaba'ah Berkala",
          ],
          specialAccommodations: 'Buku jurnal tahfidz digital dan rekaman panduan audio murottal tartil.',
          deliverableFormats: [],
          maxRevisions: 2,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Tutor 4: Hanum Nur Sakinah, S.Si.
    // -------------------------------------------------------------------------
    {
      name: 'Hanum Nur Sakinah, S.Si.',
      email: 'hanum.sakinah@belajarku.com',
      phone: '081234560004',
      education: 'S1 Pendidikan Geografi & Sains Kebumian',
      bio: 'Lulusan Geografi dan Sains Kebumian yang berfokus mendampingi siswa memahami fenomena geosfer, peta, dan dinamika sosial-lingkungan secara kontekstual dan analitis.',
      address: 'Jakarta Pusat, DKI Jakarta',
      teachingCredentials: 'S.Si Geografi, Asosiasi Pendidik Geografi dan Kebumian Indonesia',
      specialAccommodations: 'Penggunaan peta digital GIS interaktif dan citra satelit',
      availabilities: [
        { dayOfWeek: 2, startTime: '15:00', endTime: '16:30' }, // Selasa
        { dayOfWeek: 4, startTime: '15:00', endTime: '16:30' }, // Kamis
      ],
      services: [
        {
          categorySlug: 'ips-smp',
          title: 'Les Privat IPS Terpadu, Geografi & Pemetaan Dasar SMP',
          serviceType: 'SESSION_BASED' as const,
          teachingMode: 'ONLINE' as const,
          sessionCount: 4,
          durationMinutes: 90,
          price: 420000,
          description:
            'Pendalaman materi IPS terpadu kurikulum SMP, konsep spasial geografi, litosfer, hidrosfer, atmosfer, pembacaan peta topografi, serta dinamika kependudukan dan ekonomi masyarakat.',
          syllabusHighlights: [
            'Pemahaman Ruang & Interaksi Antarruang di Indonesia dan ASEAN',
            'Dasar-Dasar Kartografi, Simbol Peta & Skala Geografis',
            'Dinamika Planet Bumi, Lapisan Atmosfer & Mitigasi Bencana',
            'Analisis Kegiatan Ekonomi, Pasar & Interaksi Sosial Budaya',
          ],
          specialAccommodations: 'Penggunaan media simulasi peta digital interaktif Google Earth dan GIS dasar.',
          deliverableFormats: [],
          maxRevisions: 2,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Tutor 5: Sudarti, S.Pd
    // -------------------------------------------------------------------------
    {
      name: 'Sudarti, S.Pd',
      email: 'sudarti.paud@belajarku.com',
      phone: '081234560005',
      education: 'S1 Pendidikan Guru PAUD (PGPAUD)',
      bio: 'Pendidik anak usia dini berlisensi PGPAUD dengan pengalaman lebih dari 7 tahun membimbing anak usia prasekolah mengenal literasi dan numerasi awal tanpa paksaan melalui pendekatan bermain sambil belajar.',
      address: 'Bekasi, Jawa Barat',
      teachingCredentials: 'S.Pd PGPAUD, Sertifikasi Perkembangan Motorik Anak Usia Dini',
      specialAccommodations: 'Playdough edukasi ramah anak, kartu sensory raba, dan lembar aktivitas kreatif',
      availabilities: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }, // Senin
        { dayOfWeek: 4, startTime: '09:00', endTime: '10:00' }, // Kamis
      ],
      services: [
        {
          categorySlug: 'calistung-paud',
          title: 'Les Privat Calistung Ceria & Stimulasi Motorik Anak PAUD-TK',
          serviceType: 'SESSION_BASED' as const,
          teachingMode: 'OFFLINE_VISIT' as const,
          sessionCount: 4,
          durationMinutes: 60,
          price: 360000,
          description:
            'Bimbingan bermain edukatif berfokus pada kesiapan pra-membaca, pra-menulis, pengenalan simbol angka konkret, stimulasi motorik halus, dan pembentukan konsentrasi fokus belajar anak usia 3-6 tahun.',
          syllabusHighlights: [
            'Stimulasi Motorik Halus (Memegang Pensil, Meronce, Menggunting)',
            'Pengenalan Bunyi Huruf Awal Melalui Cerita Bergambar & Lagu',
            'Konsep Angka Kuantitas 1-10 dengan Alat Peraga Warna-Warni',
            'Latihan Konsentrasi & Kesiapan Mental Menghadapi Sekolah Dasar',
          ],
          specialAccommodations:
            'Peralatan sensory play, playdough buatan rumah aman anak, dan lembar aktivitas kreatif disediakan guru.',
          deliverableFormats: [],
          maxRevisions: 2,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Tutor 6: Chalimatur Rofingah, S.Si
    // -------------------------------------------------------------------------
    {
      name: 'Chalimatur Rofingah, S.Si',
      email: 'chalimatur.math@belajarku.com',
      phone: '081234560006',
      education: 'S1 Pendidikan Matematika',
      bio: 'Lulusan Matematika Sains yang spesialis membongkar konsep matematika rumit menjadi analogi sederhana, melatih kemampuan berpikir kritis dan pemecahan masalah olimpiade serta ujian sekolah.',
      address: 'Jakarta Barat, DKI Jakarta',
      teachingCredentials: 'S.Si Matematika, Pembina Klub Olimpiade Matematika Sains Nasional',
      specialAccommodations: 'Trik cepat hitung rumus dan lembar asesmen HOTS terpadu',
      availabilities: [
        { dayOfWeek: 3, startTime: '15:00', endTime: '16:30' }, // Rabu
        { dayOfWeek: 6, startTime: '09:00', endTime: '10:30' }, // Sabtu
      ],
      services: [
        {
          categorySlug: 'matematika-smp',
          title: 'Les Privat Matematika Penalaran Logika & Persiapan Ujian SD-SMP',
          serviceType: 'SESSION_BASED' as const,
          teachingMode: 'OFFLINE_VISIT' as const,
          sessionCount: 4,
          durationMinutes: 90,
          price: 450000,
          description:
            'Program pendalaman materi matematika tingkat lanjut, aljabar, geometri, statistika, penalaran logis, dan pembahasan trik cepat soal-soal HOTS asesmen nasional maupun ujian sekolah.',
          syllabusHighlights: [
            'Fondasi Aritmatika Cepat & Pola Bilangan Logis',
            'Penguasaan Aljabar, Persamaan Linier & Pemfaktoran Terpadu',
            'Geometri Dimensi Dua/Tiga, Teorema Phytagoras & Lingkaran',
            'Penyelesaian Soal Penalaran Matematika HOTS Tingkat SMP',
          ],
          specialAccommodations: 'Kumpulan bank soal berkas ujian terupdate dan modul rumus saku matematis.',
          deliverableFormats: [],
          maxRevisions: 2,
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Tutor 7: Shofia Himayatulloh, S.Pd., M.Pd. (B2B Deliverable Specialist)
    // -------------------------------------------------------------------------
    {
      name: 'Shofia Himayatulloh, S.Pd., M.Pd.',
      email: 'shofia.manajemen@belajarku.com',
      phone: '081234560007',
      education: 'S2 Manajemen Pendidikan (Konsultan Kurikulum & Tata Kelola Sekolah)',
      bio: 'Master Manajemen Pendidikan dan Konsultan Tata Kelola Satuan Pendidikan dengan rekam jejak 8 tahun mendampingi akreditasi, penyusunan KOSP, modul ajar kurikulum merdeka, serta pelaporan keuangan BOS sekolah.',
      address: 'Jakarta Pusat, DKI Jakarta',
      teachingCredentials: 'M.Pd Manajemen Pendidikan, Sertifikasi Asesor Penjaminan Mutu Pendidikan Nasional',
      specialAccommodations: 'Dokumen master editable (.docx, .xlsx, .pdf) lengkap dengan pendampingan revisi.',
      availabilities: [
        { dayOfWeek: 1, startTime: '10:00', endTime: '12:00' }, // Senin
        { dayOfWeek: 5, startTime: '14:00', endTime: '16:00' }, // Jumat
      ],
      services: [
        {
          categorySlug: 'modul-ajar-merdeka',
          title: 'Penyusunan Dokumen Kurikulum Merdeka, Modul Ajar & RPP Sekolah',
          serviceType: 'DELIVERABLE_BASED' as const,
          teachingMode: 'ONLINE' as const,
          sessionCount: 1,
          durationMinutes: 60,
          price: 650000,
          estimatedDays: 5,
          maxRevisions: 2,
          deliverableFormats: ['DOCX', 'PDF'],
          description:
            'Paket penyusunan dokumen Kurikulum Operasional Satuan Pendidikan (KOSP), Capaian Pembelajaran (CP), Alur Tujuan Pembelajaran (ATP), Modul Ajar berdiferensiasi, serta rubrik instrumen asesmen formatif dan sumatif siap pakai untuk sekolah penggerak.',
          syllabusHighlights: [
            'Penyusunan KOSP & Analisis Capaian Pembelajaran Sesuai Fase',
            'Pengembangan Modul Ajar Pembelajaran Berdiferensiasi',
            'Penyusunan Rubrik Penilaian Asesmen Diagnostik, Formatif & Sumatif',
            'Integrasi Dimensi Penguatan Profil Pelajar Pancasila (P5)',
          ],
          specialAccommodations:
            'File master format DOCX siap edit lengkap dengan panduan kustomisasi identitas sekolah.',
        },
        {
          categorySlug: 'lpj-bos-sekolah',
          title: 'Konsultasi Manajemen Pendidikan & Penyusunan Berkas LPJ Dana BOS',
          serviceType: 'DELIVERABLE_BASED' as const,
          teachingMode: 'ONLINE' as const,
          sessionCount: 1,
          durationMinutes: 60,
          price: 850000,
          estimatedDays: 7,
          maxRevisions: 2,
          deliverableFormats: ['DOCX', 'PDF', 'XLSX'],
          description:
            'Layanan asistensi dan penyusunan administrasi pertanggungjawaban Dana BOS (Bantuan Operasional Sekolah), Buku Kas Umum (BKU), Buku Pembantu Pajak, Rencana Kegiatan dan Anggaran Sekolah (RKAS/ARKAS), serta rekapitulasi bukti pengeluaran akuntabel siap periksa inspektorat.',
          syllabusHighlights: [
            'Verifikasi & Penataan Dokumen SPJ Belanja Modal dan Operasional',
            'Penyusunan Buku Kas Umum (BKU) & Rekonsiliasi Rekening Koran',
            'Perhitungan & Penyiapan Bukti Setor Pajak (PPN, PPh 21, PPh 23)',
            'Audit Kesiapan Berkas Pelaporan Sistem ARKAS Kemendikbud',
          ],
          specialAccommodations:
            'Template laporan keuangan otomatis berbasis formula Excel (.xlsx) dan format rekapitulasi standar BPKP.',
        },
      ],
    },
  ];

  // 3. Upsert Tutors, Profiles, Availabilities, and Services
  console.log('\n👨‍🏫 2. Seeding 7 Real Tutors...');
  for (const t of realTutors) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {
        name: t.name,
        phone: t.phone,
        passwordHash,
        role: 'TUTOR',
        isActive: true,
      },
      create: {
        name: t.name,
        email: t.email,
        phone: t.phone,
        passwordHash,
        role: 'TUTOR',
        isActive: true,
      },
    });

    const profile = await prisma.tutorProfile.upsert({
      where: { userId: user.id },
      update: {
        bio: t.bio,
        education: t.education,
        address: t.address,
        teachingCredentials: t.teachingCredentials,
        specialAccommodations: t.specialAccommodations,
        isVerified: true,
      },
      create: {
        userId: user.id,
        bio: t.bio,
        education: t.education,
        address: t.address,
        teachingCredentials: t.teachingCredentials,
        specialAccommodations: t.specialAccommodations,
        isVerified: true,
        walletBalance: 0,
      },
    });

    // Availabilities
    await prisma.tutorAvailability.deleteMany({
      where: { tutorId: profile.id },
    });
    if (t.availabilities && t.availabilities.length > 0) {
      await prisma.tutorAvailability.createMany({
        data: t.availabilities.map((av) => ({
          tutorId: profile.id,
          dayOfWeek: av.dayOfWeek,
          startTime: av.startTime,
          endTime: av.endTime,
          isActive: true,
        })),
      });
    }

    // Services
    for (const s of t.services) {
      const categoryId = categoryMap.get(s.categorySlug);
      if (!categoryId) {
        throw new Error(`Category not found for slug: ${s.categorySlug}`);
      }

      let existingService = await prisma.tutorService.findFirst({
        where: {
          tutorId: profile.id,
          title: s.title,
        },
      });

      const serviceData = {
        tutorId: profile.id,
        categoryId,
        title: s.title,
        serviceType: s.serviceType,
        teachingMode: s.teachingMode,
        sessionCount: s.sessionCount,
        durationMinutes: s.durationMinutes,
        price: s.price,
        description: s.description,
        syllabusHighlights: s.syllabusHighlights,
        specialAccommodations: s.specialAccommodations,
        estimatedDays: (s as any).estimatedDays || null,
        deliverableFormats: s.deliverableFormats || [],
        maxRevisions: s.maxRevisions ?? 2,
        isActive: true,
      };

      if (!existingService) {
        existingService = await prisma.tutorService.create({
          data: serviceData,
        });
      } else {
        existingService = await prisma.tutorService.update({
          where: { id: existingService.id },
          data: serviceData,
        });
      }
      console.log(`    📦 Service: "${s.title}" (${s.serviceType} - Rp ${s.price.toLocaleString()})`);
    }

    console.log(`  ✅ Tutor: ${t.name} (${t.email}) -> Status: Verified & Active`);
  }

  console.log('\n✨ ==============================================================================');
  console.log('🎉 7 REAL TUTORS SUCCESSFULLY SEEDED & INTEGRATED INTO BELAJAR-KU DATABASE!');
  console.log('================================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during real tutors seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
