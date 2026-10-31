import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive demo seed for Belajar-Ku...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // =========================================================================
  // 1. Subject Categories (PAUD, TK, SD, SMP)
  // =========================================================================
  console.log('📦 Seeding subject categories...');
  const initialCategories = [
    {
      name: 'Calistung (Baca, Tulis, Hitung) PAUD',
      targetGrade: 'PAUD' as const,
      categoryGroup: 'ACADEMIC' as const,
      slug: 'calistung-paud',
    },
    {
      name: 'Pengenalan Huruf & Angka TK',
      targetGrade: 'TK' as const,
      categoryGroup: 'ACADEMIC' as const,
      slug: 'huruf-angka-tk',
    },
    {
      name: 'Matematika SD',
      targetGrade: 'SD' as const,
      categoryGroup: 'ACADEMIC' as const,
      slug: 'matematika-sd',
    },
    {
      name: 'Bahasa Indonesia SD',
      targetGrade: 'SD' as const,
      categoryGroup: 'ACADEMIC' as const,
      slug: 'bahasa-indonesia-sd',
    },
    {
      name: 'IPA Terpadu SD',
      targetGrade: 'SD' as const,
      categoryGroup: 'ACADEMIC' as const,
      slug: 'ipa-sd',
    },
    {
      name: 'Matematika SMP',
      targetGrade: 'SMP' as const,
      categoryGroup: 'ACADEMIC' as const,
      slug: 'matematika-smp',
    },
    {
      name: 'Bahasa Inggris SMP',
      targetGrade: 'SMP' as const,
      categoryGroup: 'ACADEMIC' as const,
      slug: 'bahasa-inggris-smp',
    },
    {
      name: 'IPA Fisika & Biologi SMP',
      targetGrade: 'SMP' as const,
      categoryGroup: 'ACADEMIC' as const,
      slug: 'ipa-smp',
    },
    {
      name: "Baca Tulis Al-Qur'an (BTQ) & Iqro Anak",
      targetGrade: 'PAUD' as const,
      categoryGroup: 'BACA_TULIS_QURAN' as const,
      slug: 'btq-paud',
    },
    {
      name: 'Kelas Tajwid, Makhraj & Tahsin Anak',
      targetGrade: 'SD' as const,
      categoryGroup: 'TAJWID' as const,
      slug: 'tajwid-sd',
    },
    {
      name: "Kelas Muroja'ah & Tahfidz Al-Qur'an",
      targetGrade: 'SMP' as const,
      categoryGroup: 'MUROJAAH' as const,
      slug: 'murojaah-smp',
    },
    {
      name: 'Kelas Khusus Difabel (Autisme & ADHD)',
      targetGrade: 'SD' as const,
      categoryGroup: 'DIFABEL' as const,
      slug: 'difabel-abk',
    },
    {
      name: 'Kelas Inklusif Bahasa Isyarat & Tunarungu',
      targetGrade: 'SMP' as const,
      categoryGroup: 'DIFABEL' as const,
      slug: 'difabel-tunarungu',
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
  for (const cat of initialCategories) {
    const createdCat = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, targetGrade: cat.targetGrade, categoryGroup: cat.categoryGroup },
      create: {
        name: cat.name,
        targetGrade: cat.targetGrade,
        categoryGroup: cat.categoryGroup,
        slug: cat.slug,
      },
    });
    categoryMap.set(cat.slug, createdCat.id);
  }
  console.log(`✅ ${categoryMap.size} categories seeded.`);

  // =========================================================================
  // 2. Demo Parent Account & Children
  // =========================================================================
  console.log('👨‍👩‍👧 Seeding Demo Parent and student profiles...');
  const parentUser = await prisma.user.upsert({
    where: { email: 'parent.demo@belajarku.com' },
    update: {
      name: 'Bunda Dian Pratama',
      phone: '081299887766',
      passwordHash,
      role: 'PARENT',
    },
    create: {
      name: 'Bunda Dian Pratama',
      email: 'parent.demo@belajarku.com',
      phone: '081299887766',
      passwordHash,
      role: 'PARENT',
    },
  });

  // Ensure Parent Cart exists
  await prisma.cart.upsert({
    where: { parentId: parentUser.id },
    update: {},
    create: { parentId: parentUser.id },
  });

  // Child 1: Kenzi Pratama (PAUD)
  let kenzi = await prisma.studentProfile.findFirst({
    where: { parentId: parentUser.id, studentName: 'Kenzi Pratama' },
  });
  if (!kenzi) {
    kenzi = await prisma.studentProfile.create({
      data: {
        parentId: parentUser.id,
        studentName: 'Kenzi Pratama',
        gradeLevel: 'PAUD',
        learningNotes: 'Baru belajar mengenal huruf dan angka, suka metode visual/gambar',
      },
    });
  } else {
    kenzi = await prisma.studentProfile.update({
      where: { id: kenzi.id },
      data: {
        gradeLevel: 'PAUD',
        learningNotes: 'Baru belajar mengenal huruf dan angka, suka metode visual/gambar',
      },
    });
  }

  // Child 2: Aisyah Putri (SMP)
  let aisyah = await prisma.studentProfile.findFirst({
    where: { parentId: parentUser.id, studentName: 'Aisyah Putri' },
  });
  if (!aisyah) {
    aisyah = await prisma.studentProfile.create({
      data: {
        parentId: parentUser.id,
        studentName: 'Aisyah Putri',
        gradeLevel: 'SMP',
        learningNotes: 'Perlu bimbingan intensif persiapan ujian Matematika aljabar',
      },
    });
  } else {
    aisyah = await prisma.studentProfile.update({
      where: { id: aisyah.id },
      data: {
        gradeLevel: 'SMP',
        learningNotes: 'Perlu bimbingan intensif persiapan ujian Matematika aljabar',
      },
    });
  }
  console.log(`✅ Demo Parent and 2 children (Kenzi & Aisyah) seeded.`);

  // =========================================================================
  // 3. Demo Tutor 1: Kak Sarah, S.Pd (PAUD Specialist)
  // =========================================================================
  console.log('👩‍🏫 Seeding Tutor 1: Kak Sarah (PAUD Calistung)...');
  const sarahUser = await prisma.user.upsert({
    where: { email: 'tutor.paud@belajarku.com' },
    update: {
      name: 'Kak Sarah, S.Pd',
      phone: '081234567891',
      passwordHash,
      role: 'TUTOR',
    },
    create: {
      name: 'Kak Sarah, S.Pd',
      email: 'tutor.paud@belajarku.com',
      phone: '081234567891',
      passwordHash,
      role: 'TUTOR',
    },
  });

  const sarahProfile = await prisma.tutorProfile.upsert({
    where: { userId: sarahUser.id },
    update: {
      bio: 'Guru lulusan PGPAUD berpengalaman 4 tahun mengajar calistung ramah anak',
      education: 'S.Pd Pendidikan Guru PAUD, Universitas Negeri Jakarta',
      address: 'Cilandak, Jakarta Selatan',
      teachingCredentials: 'S.Pd PGPAUD, Sertifikasi Montessori Early Childhood Level 1',
      specialAccommodations: 'Kartu fonik sentuh bergambar, pasir kinetik, lagu edukatif motorik halus',
      isVerified: true,
      walletBalance: 74375, // Reflects 1 completed session net payout (Rp 87.500 gross - 15% platform fee Rp 13.125)
    },
    create: {
      userId: sarahUser.id,
      bio: 'Guru lulusan PGPAUD berpengalaman 4 tahun mengajar calistung ramah anak',
      education: 'S.Pd Pendidikan Guru PAUD, Universitas Negeri Jakarta',
      address: 'Cilandak, Jakarta Selatan',
      teachingCredentials: 'S.Pd PGPAUD, Sertifikasi Montessori Early Childhood Level 1',
      specialAccommodations: 'Kartu fonik sentuh bergambar, pasir kinetik, lagu edukatif motorik halus',
      isVerified: true,
      walletBalance: 74375,
    },
  });

  // Sarah Availabilities (Senin & Rabu 15:30 - 16:30)
  await prisma.tutorAvailability.deleteMany({
    where: { tutorId: sarahProfile.id },
  });
  await prisma.tutorAvailability.createMany({
    data: [
      { tutorId: sarahProfile.id, dayOfWeek: 1, startTime: '15:30', endTime: '16:30', isActive: true },
      { tutorId: sarahProfile.id, dayOfWeek: 3, startTime: '15:30', endTime: '16:30', isActive: true },
    ],
  });

  // Sarah Service: Calistung PAUD
  const calistungCatId = categoryMap.get('calistung-paud')!;
  let sarahService = await prisma.tutorService.findFirst({
    where: { tutorId: sarahProfile.id, title: 'Les Privat Calistung PAUD Metode Montessori & Fonik' },
  });
  if (!sarahService) {
    sarahService = await prisma.tutorService.create({
      data: {
        tutorId: sarahProfile.id,
        categoryId: calistungCatId,
        title: 'Les Privat Calistung PAUD Metode Montessori & Fonik',
        teachingMode: 'OFFLINE_VISIT',
        durationMinutes: 60,
        sessionCount: 4,
        price: 350000,
        description: 'Bimbingan membaca, menulis, dan berhitung dengan kartu huruf fonik bergambar, stimulasi sensori motorik halus, dan lagu edukasi ramah anak.',
        syllabusHighlights: [
          'Pengenalan Fonik Bunyi Huruf Vokal & Konsonan',
          'Latihan Sensori Motorik Menulis di Media Pasir & Kartu Raba',
          'Mengenal Konsep Bilangan 1-20 dengan Benda Konkret',
          'Membaca Suku Kata Terbuka (ba-bi-bu, ca-ci-cu)',
        ],
        specialAccommodations: 'Semua alat peraga montessori dan modul lembar mewarnai disediakan oleh pengajar.',
        isActive: true,
      },
    });
  } else {
    sarahService = await prisma.tutorService.update({
      where: { id: sarahService.id },
      data: {
        price: 350000,
        sessionCount: 4,
        durationMinutes: 60,
        teachingMode: 'OFFLINE_VISIT',
        syllabusHighlights: [
          'Pengenalan Fonik Bunyi Huruf Vokal & Konsonan',
          'Latihan Sensori Motorik Menulis di Media Pasir & Kartu Raba',
          'Mengenal Konsep Bilangan 1-20 dengan Benda Konkret',
          'Membaca Suku Kata Terbuka (ba-bi-bu, ca-ci-cu)',
        ],
        specialAccommodations: 'Semua alat peraga montessori dan modul lembar mewarnai disediakan oleh pengajar.',
      },
    });
  }
  console.log(`✅ Tutor 1 (Kak Sarah) seeded with availability & Calistung service.`);

  // =========================================================================
  // 4. Demo Tutor 2: Kak Dimas, S.Si (SMP Math Specialist)
  // =========================================================================
  console.log('👨‍🏫 Seeding Tutor 2: Kak Dimas (SMP Matematika)...');
  const dimasUser = await prisma.user.upsert({
    where: { email: 'tutor.smp@belajarku.com' },
    update: {
      name: 'Kak Dimas, S.Si',
      phone: '081234567892',
      passwordHash,
      role: 'TUTOR',
    },
    create: {
      name: 'Kak Dimas, S.Si',
      email: 'tutor.smp@belajarku.com',
      phone: '081234567892',
      passwordHash,
      role: 'TUTOR',
    },
  });

  const dimasProfile = await prisma.tutorProfile.upsert({
    where: { userId: dimasUser.id },
    update: {
      bio: 'Tutor Matematika & Sains SMP fokus pemecahan soal logika',
      education: 'S.Si Matematika, Universitas Indonesia',
      address: 'Kebon Jeruk, Jakarta Barat',
      teachingCredentials: 'S.Si Matematika UI, Medalis Perunggu Olimpiade Sains Nasional (OSN)',
      specialAccommodations: 'Papan tulis digital interaktif (Geogebra/Desmos) dan rangkuman rumus ringkas',
      isVerified: true,
      walletBalance: 0,
    },
    create: {
      userId: dimasUser.id,
      bio: 'Tutor Matematika & Sains SMP fokus pemecahan soal logika',
      education: 'S.Si Matematika, Universitas Indonesia',
      address: 'Kebon Jeruk, Jakarta Barat',
      teachingCredentials: 'S.Si Matematika UI, Medalis Perunggu Olimpiade Sains Nasional (OSN)',
      specialAccommodations: 'Papan tulis digital interaktif (Geogebra/Desmos) dan rangkuman rumus ringkas',
      isVerified: true,
      walletBalance: 0,
    },
  });

  // Dimas Availabilities (Selasa & Kamis 16:00 - 17:30)
  await prisma.tutorAvailability.deleteMany({
    where: { tutorId: dimasProfile.id },
  });
  await prisma.tutorAvailability.createMany({
    data: [
      { tutorId: dimasProfile.id, dayOfWeek: 2, startTime: '16:00', endTime: '17:30', isActive: true },
      { tutorId: dimasProfile.id, dayOfWeek: 4, startTime: '16:00', endTime: '17:30', isActive: true },
    ],
  });

  // Dimas Service: SMP Math
  const smpCatId = categoryMap.get('matematika-smp')!;
  let dimasService = await prisma.tutorService.findFirst({
    where: { tutorId: dimasProfile.id, title: 'Privat Matematika & Logika SMP Juara' },
  });
  if (!dimasService) {
    dimasService = await prisma.tutorService.create({
      data: {
        tutorId: dimasProfile.id,
        categoryId: smpCatId,
        title: 'Privat Matematika & Logika SMP Juara',
        teachingMode: 'ONLINE',
        durationMinutes: 90,
        sessionCount: 8,
        price: 600000,
        description: 'Pendampingan intensif materi Aljabar, Geometri, dan Persiapan Ujian Sekolah SMP dengan metode pemecahan masalah logika bertahap.',
        syllabusHighlights: [
          'Fondasi Aljabar & Persamaan Linear Satu/Dua Variabel',
          'Geometri, Teorema Pythagoras, dan Bangun Ruang',
          'Strategi Cepat & Analisis Logika Soal Cerita HOTS',
          'Simulasi Ujian Sekolah & Pembahasan Trik Hitung Cepat',
        ],
        specialAccommodations: 'Sesi direkam dan materi PDF beranotasi dikirim setelah tiap pertemuan.',
        isActive: true,
      },
    });
  } else {
    dimasService = await prisma.tutorService.update({
      where: { id: dimasService.id },
      data: {
        price: 600000,
        sessionCount: 8,
        durationMinutes: 90,
        teachingMode: 'ONLINE',
        syllabusHighlights: [
          'Fondasi Aljabar & Persamaan Linear Satu/Dua Variabel',
          'Geometri, Teorema Pythagoras, dan Bangun Ruang',
          'Strategi Cepat & Analisis Logika Soal Cerita HOTS',
          'Simulasi Ujian Sekolah & Pembahasan Trik Hitung Cepat',
        ],
        specialAccommodations: 'Sesi direkam dan materi PDF beranotasi dikirim setelah tiap pertemuan.',
      },
    });
  }
  console.log(`✅ Tutor 2 (Kak Dimas) seeded with availability & SMP Math service.`);

  // =========================================================================
  // 5. Demo Admin Account
  // =========================================================================
  console.log('🛡️ Seeding Demo Admin Account...');
  await prisma.user.upsert({
    where: { email: 'admin.demo@belajarku.com' },
    update: {
      name: 'Admin Belajar-Ku',
      phone: '081122334455',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      name: 'Admin Belajar-Ku',
      email: 'admin.demo@belajarku.com',
      phone: '081122334455',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Demo Admin (admin.demo@belajarku.com) seeded.');

  // =========================================================================
  // 6. Demo Unverified Tutor (for Admin Verification Demo)
  // =========================================================================
  console.log('👨‍🏫 Seeding Demo Unverified Tutor...');
  const unverifiedUser = await prisma.user.upsert({
    where: { email: 'tutor.unverified@belajarku.com' },
    update: {
      name: 'Kak Rian Hidayat, S.Pd',
      phone: '085711223344',
      passwordHash,
      role: 'TUTOR',
      isActive: true,
    },
    create: {
      name: 'Kak Rian Hidayat, S.Pd',
      email: 'tutor.unverified@belajarku.com',
      phone: '085711223344',
      passwordHash,
      role: 'TUTOR',
      isActive: true,
    },
  });

  const unverifiedProfile = await prisma.tutorProfile.upsert({
    where: { userId: unverifiedUser.id },
    update: {
      bio: 'Guru lulusan Pendidikan Guru Sekolah Dasar (PGSD) dengan fokus bimbingan PR dan pemahaman konsep sains dasar.',
      education: 'S1 PGSD Universitas Negeri Jakarta',
      address: 'Jl. Merdeka No. 12, Jakarta Timur',
      isVerified: false,
    },
    create: {
      userId: unverifiedUser.id,
      bio: 'Guru lulusan Pendidikan Guru Sekolah Dasar (PGSD) dengan fokus bimbingan PR dan pemahaman konsep sains dasar.',
      education: 'S1 PGSD Universitas Negeri Jakarta',
      address: 'Jl. Merdeka No. 12, Jakarta Timur',
      isVerified: false,
    },
  });

  const ipaCatId = categoryMap.get('ipa-sd');
  if (ipaCatId) {
    const unverifiedService = await prisma.tutorService.findFirst({
      where: { tutorId: unverifiedProfile.id },
    });
    if (!unverifiedService) {
      await prisma.tutorService.create({
        data: {
          tutorId: unverifiedProfile.id,
          categoryId: ipaCatId,
          title: 'Bimbingan IPA & Eksperimen Sains Dasar SD',
          teachingMode: 'ONLINE',
          durationMinutes: 60,
          sessionCount: 4,
          price: 280000,
          description: 'Eksperimen sains seru dan pembahasan materi tematik IPA kelas 3-5 SD.',
        },
      });
    }
  }
  console.log('✅ Demo Unverified Tutor (Kak Rian Hidayat) seeded.');

  // =========================================================================
  // 6b. Demo Tutor 4: Ustadzah Maryam, S.Pd.I (BTQ & Iqro Specialist)
  // =========================================================================
  console.log('🧕 Seeding Tutor 4: Ustadzah Maryam (BTQ & Tajwid)...');
  const maryamUser = await prisma.user.upsert({
    where: { email: 'ustadzah.maryam@belajarku.com' },
    update: {
      name: 'Ustadzah Maryam, S.Pd.I',
      phone: '081234567893',
      passwordHash,
      role: 'TUTOR',
      isActive: true,
    },
    create: {
      name: 'Ustadzah Maryam, S.Pd.I',
      email: 'ustadzah.maryam@belajarku.com',
      phone: '081234567893',
      passwordHash,
      role: 'TUTOR',
      isActive: true,
    },
  });

  const maryamProfile = await prisma.tutorProfile.upsert({
    where: { userId: maryamUser.id },
    update: {
      bio: 'Guru ngaji dan tahsin anak berpengalaman 6 tahun mengajar Iqro, BTQ, dan makharijul huruf dengan metode visual interaktif ramah anak.',
      education: 'S.Pd.I Pendidikan Agama Islam, UIN Syarif Hidayatullah Jakarta',
      address: 'Tebet, Jakarta Selatan',
      teachingCredentials: 'Sertifikasi Pengajar Tahsin Standar LPPQ & Lisensi Guru Tilawati / Iqro Anak',
      specialAccommodations: 'Kartu flashcard hijaiyah warna-warni, modul panduan makhraj bergambar, audio pelafalan latihan mandiri',
      isVerified: true,
      walletBalance: 0,
    },
    create: {
      userId: maryamUser.id,
      bio: 'Guru ngaji dan tahsin anak berpengalaman 6 tahun mengajar Iqro, BTQ, dan makharijul huruf dengan metode visual interaktif ramah anak.',
      education: 'S.Pd.I Pendidikan Agama Islam, UIN Syarif Hidayatullah Jakarta',
      address: 'Tebet, Jakarta Selatan',
      teachingCredentials: 'Sertifikasi Pengajar Tahsin Standar LPPQ & Lisensi Guru Tilawati / Iqro Anak',
      specialAccommodations: 'Kartu flashcard hijaiyah warna-warni, modul panduan makhraj bergambar, audio pelafalan latihan mandiri',
      isVerified: true,
      walletBalance: 0,
    },
  });

  await prisma.tutorAvailability.deleteMany({
    where: { tutorId: maryamProfile.id },
  });
  await prisma.tutorAvailability.createMany({
    data: [
      { tutorId: maryamProfile.id, dayOfWeek: 2, startTime: '15:30', endTime: '16:30', isActive: true },
      { tutorId: maryamProfile.id, dayOfWeek: 4, startTime: '15:30', endTime: '16:30', isActive: true },
      { tutorId: maryamProfile.id, dayOfWeek: 6, startTime: '09:00', endTime: '10:00', isActive: true },
    ],
  });

  const btqCatId = categoryMap.get('btq-paud')!;
  let maryamService = await prisma.tutorService.findFirst({
    where: { tutorId: maryamProfile.id, title: 'Les Privat BTQ & Iqro Dasar Metode Visual Anak' },
  });
  if (!maryamService) {
    maryamService = await prisma.tutorService.create({
      data: {
        tutorId: maryamProfile.id,
        categoryId: btqCatId,
        title: 'Les Privat BTQ & Iqro Dasar Metode Visual Anak',
        teachingMode: 'OFFLINE_VISIT',
        durationMinutes: 60,
        sessionCount: 8,
        price: 480000,
        description: "Bimbingan membaca Al-Qur'an mulai dari pengenalan huruf hijaiyah berharakat dasar, pelafalan makhraj, hingga latihan membaca surat pendek juz 30 dengan kartu visual ramah anak.",
        syllabusHighlights: [
          'Pengenalan 28 Huruf Hijaiyah dengan Kartu Flashcard Visual & Warna',
          'Pelafalan Makhraj Huruf Dasar (Halq, Lisan, Syafatain)',
          'Latihan Harakat Fathah, Kasrah, Dhommah, dan Tanwin',
          'Penyambungan Huruf Hijaiyah & Praktek Baca Buku Iqro / Tilawati',
          'Hafalan Doa Sehari-hari dan Surat-Surat Pendek Juz 30',
        ],
        specialAccommodations: 'Modul fisik kartu hijaiyah disediakan gratis, pendekatan sabar tanpa paksaan sesuai kecepatan belajar anak.',
        isActive: true,
      },
    });
  } else {
    maryamService = await prisma.tutorService.update({
      where: { id: maryamService.id },
      data: {
        price: 480000,
        sessionCount: 8,
        durationMinutes: 60,
        teachingMode: 'OFFLINE_VISIT',
        syllabusHighlights: [
          'Pengenalan 28 Huruf Hijaiyah dengan Kartu Flashcard Visual & Warna',
          'Pelafalan Makhraj Huruf Dasar (Halq, Lisan, Syafatain)',
          'Latihan Harakat Fathah, Kasrah, Dhommah, dan Tanwin',
          'Penyambungan Huruf Hijaiyah & Praktek Baca Buku Iqro / Tilawati',
          'Hafalan Doa Sehari-hari dan Surat-Surat Pendek Juz 30',
        ],
        specialAccommodations: 'Modul fisik kartu hijaiyah disediakan gratis, pendekatan sabar tanpa paksaan sesuai kecepatan belajar anak.',
      },
    });
  }
  console.log('✅ Tutor 4 (Ustadzah Maryam - BTQ) seeded.');

  // =========================================================================
  // 6c. Demo Tutor 5: Ustadz Ahmad Al-Hafidz, S.Ag (Muroja'ah & Tahfidz Specialist)
  // =========================================================================
  console.log("📖 Seeding Tutor 5: Ustadz Ahmad (Muroja'ah & Tahfidz)...");
  const ahmadUser = await prisma.user.upsert({
    where: { email: 'ustadz.ahmad@belajarku.com' },
    update: {
      name: 'Ustadz Ahmad Al-Hafidz, S.Ag',
      phone: '081234567894',
      passwordHash,
      role: 'TUTOR',
      isActive: true,
    },
    create: {
      name: 'Ustadz Ahmad Al-Hafidz, S.Ag',
      email: 'ustadz.ahmad@belajarku.com',
      phone: '081234567894',
      passwordHash,
      role: 'TUTOR',
      isActive: true,
    },
  });

  const ahmadProfile = await prisma.tutorProfile.upsert({
    where: { userId: ahmadUser.id },
    update: {
      bio: "Hafidz 30 Juz bersanad muttashil, berpengalaman membina santri tahfidz dan program muroja'ah hafalan Al-Qur'an anak dan remaja.",
      education: "S.Ag Ilmu Al-Qur'an dan Tafsir, Institut PTIQ Jakarta",
      address: 'Kebayoran Baru, Jakarta Selatan',
      teachingCredentials: "Hafidz 30 Juz Al-Qur'an Bersanad Muttashil, Ijazah Matan Jazariyyah & Tuhfatul Athfal",
      specialAccommodations: 'Bimbingan privat tahsin & tahfidz intensif, target hafalan disesuaikan per anak, kartu kendali mutqin digital',
      isVerified: true,
      walletBalance: 0,
    },
    create: {
      userId: ahmadUser.id,
      bio: "Hafidz 30 Juz bersanad muttashil, berpengalaman membina santri tahfidz dan program muroja'ah hafalan Al-Qur'an anak dan remaja.",
      education: "S.Ag Ilmu Al-Qur'an dan Tafsir, Institut PTIQ Jakarta",
      address: 'Kebayoran Baru, Jakarta Selatan',
      teachingCredentials: "Hafidz 30 Juz Al-Qur'an Bersanad Muttashil, Ijazah Matan Jazariyyah & Tuhfatul Athfal",
      specialAccommodations: 'Bimbingan privat tahsin & tahfidz intensif, target hafalan disesuaikan per anak, kartu kendali mutqin digital',
      isVerified: true,
      walletBalance: 0,
    },
  });

  await prisma.tutorAvailability.deleteMany({
    where: { tutorId: ahmadProfile.id },
  });
  await prisma.tutorAvailability.createMany({
    data: [
      { tutorId: ahmadProfile.id, dayOfWeek: 1, startTime: '16:30', endTime: '18:00', isActive: true },
      { tutorId: ahmadProfile.id, dayOfWeek: 3, startTime: '16:30', endTime: '18:00', isActive: true },
      { tutorId: ahmadProfile.id, dayOfWeek: 6, startTime: '10:00', endTime: '11:30', isActive: true },
    ],
  });

  const murojaahCatId = categoryMap.get('murojaah-smp')!;
  let ahmadService = await prisma.tutorService.findFirst({
    where: { tutorId: ahmadProfile.id, title: "Bimbingan Muroja'ah Intensif & Tahfidz Juz 'Amma (Juz 30)" },
  });
  if (!ahmadService) {
    ahmadService = await prisma.tutorService.create({
      data: {
        tutorId: ahmadProfile.id,
        categoryId: murojaahCatId,
        title: "Bimbingan Muroja'ah Intensif & Tahfidz Juz 'Amma (Juz 30)",
        teachingMode: 'ONLINE',
        durationMinutes: 60,
        sessionCount: 8,
        price: 550000,
        description: "Program pemantapan hafalan (muroja'ah), perbaikan tajwid lanjutan (mad, waqaf, ghunnah), serta setoran hafalan Juz 30 berkesinambungan dengan rekap monitoring digital berkala.",
        syllabusHighlights: [
          'Tes Penempatan Mutqin Hafalan Sebelum Bimbingan Dimulai',
          'Kaidah Tajwid Lanjutan: Hukum Nun/Mim Sukun, Mad, dan Tanda Waqaf',
          "Teknik Muroja'ah Mandiri 3x Pengulangan Harian (Metode Tikrar)",
          "Setoran & Tasmi' Hafalan Surat An-Naba sampai An-Nas",
          'Rapor Mutqin Mingguan & Konsultasi Perkembangan Bersama Orang Tua',
        ],
        specialAccommodations: 'Sesi audio feedback setoran mandiri di luar jam les, rekaman talaqqi makhraj eksklusif.',
        isActive: true,
      },
    });
  } else {
    ahmadService = await prisma.tutorService.update({
      where: { id: ahmadService.id },
      data: {
        price: 550000,
        sessionCount: 8,
        durationMinutes: 60,
        teachingMode: 'ONLINE',
        syllabusHighlights: [
          'Tes Penempatan Mutqin Hafalan Sebelum Bimbingan Dimulai',
          'Kaidah Tajwid Lanjutan: Hukum Nun/Mim Sukun, Mad, dan Tanda Waqaf',
          "Teknik Muroja'ah Mandiri 3x Pengulangan Harian (Metode Tikrar)",
          "Setoran & Tasmi' Hafalan Surat An-Naba sampai An-Nas",
          'Rapor Mutqin Mingguan & Konsultasi Perkembangan Bersama Orang Tua',
        ],
        specialAccommodations: 'Sesi audio feedback setoran mandiri di luar jam les, rekaman talaqqi makhraj eksklusif.',
      },
    });
  }
  console.log("✅ Tutor 5 (Ustadz Ahmad - Muroja'ah) seeded.");

  // =========================================================================
  // 6d. Demo Tutor 6: Kak Nadia Putri, S.Pd (Special Needs & Difabel Specialist)
  // =========================================================================
  console.log('🤝 Seeding Tutor 6: Kak Nadia (Inklusif & ABK/Difabel)...');
  const nadiaUser = await prisma.user.upsert({
    where: { email: 'tutor.difabel@belajarku.com' },
    update: {
      name: 'Kak Nadia Putri, S.Pd',
      phone: '081234567895',
      passwordHash,
      role: 'TUTOR',
      isActive: true,
    },
    create: {
      name: 'Kak Nadia Putri, S.Pd',
      email: 'tutor.difabel@belajarku.com',
      phone: '081234567895',
      passwordHash,
      role: 'TUTOR',
      isActive: true,
    },
  });

  const nadiaProfile = await prisma.tutorProfile.upsert({
    where: { userId: nadiaUser.id },
    update: {
      bio: 'Pendidik Luar Biasa (PLB) tersertifikasi dengan spesialisasi pendampingan belajar ramah anak autisme, ADHD, dan slow learner melalui pendekatan sensori dan Program Pembelajaran Individual (PPI).',
      education: 'S1 Pendidikan Luar Biasa (PLB), Universitas Negeri Jakarta (UNJ)',
      address: 'Pasar Minggu, Jakarta Selatan',
      teachingCredentials: 'S.Pd PLB UNJ, Sertifikat Terapi Perilaku Applied Behavior Analysis (ABA), Penguasaan Bahasa Isyarat BISINDO Tingkat Lanjut',
      specialAccommodations: 'Penyusunan Program Pembelajaran Individual (PPI), alat peraga taktil/sensori, jeda waktu istirahat fleksibel jika overstimulasi',
      isVerified: true,
      walletBalance: 0,
    },
    create: {
      userId: nadiaUser.id,
      bio: 'Pendidik Luar Biasa (PLB) tersertifikasi dengan spesialisasi pendampingan belajar ramah anak autisme, ADHD, dan slow learner melalui pendekatan sensori dan Program Pembelajaran Individual (PPI).',
      education: 'S1 Pendidikan Luar Biasa (PLB), Universitas Negeri Jakarta (UNJ)',
      address: 'Pasar Minggu, Jakarta Selatan',
      teachingCredentials: 'S.Pd PLB UNJ, Sertifikat Terapi Perilaku Applied Behavior Analysis (ABA), Penguasaan Bahasa Isyarat BISINDO Tingkat Lanjut',
      specialAccommodations: 'Penyusunan Program Pembelajaran Individual (PPI), alat peraga taktil/sensori, jeda waktu istirahat fleksibel jika overstimulasi',
      isVerified: true,
      walletBalance: 0,
    },
  });

  await prisma.tutorAvailability.deleteMany({
    where: { tutorId: nadiaProfile.id },
  });
  await prisma.tutorAvailability.createMany({
    data: [
      { tutorId: nadiaProfile.id, dayOfWeek: 1, startTime: '14:00', endTime: '15:30', isActive: true },
      { tutorId: nadiaProfile.id, dayOfWeek: 4, startTime: '14:00', endTime: '15:30', isActive: true },
      { tutorId: nadiaProfile.id, dayOfWeek: 6, startTime: '09:30', endTime: '11:00', isActive: true },
    ],
  });

  const difabelCatId = categoryMap.get('difabel-abk')!;
  let nadiaService = await prisma.tutorService.findFirst({
    where: { tutorId: nadiaProfile.id, title: 'Pendampingan Belajar Inklusif & Sensori ABK (Autisme, ADHD, Slow Learner)' },
  });
  if (!nadiaService) {
    nadiaService = await prisma.tutorService.create({
      data: {
        tutorId: nadiaProfile.id,
        categoryId: difabelCatId,
        title: 'Pendampingan Belajar Inklusif & Sensori ABK (Autisme, ADHD, Slow Learner)',
        teachingMode: 'OFFLINE_VISIT',
        durationMinutes: 60,
        sessionCount: 4,
        price: 450000,
        description: 'Layanan bimbingan belajar khusus dengan pendekatan holistik dan individual (PPI) untuk menumbuhkan fokus belajar, kemandirian calistung fungsional, dan regulasi emosi anak berkebutuhan khusus.',
        syllabusHighlights: [
          'Asesmen Kebutuhan Awal & Penyusunan Program Pembelajaran Individual (PPI)',
          'Latihan Sensori Motorik & Stimulasi Fokus Sebelum Mulai Belajar',
          'Calistung Fungsional Menggunakan Media Benda Konkret & Kartu Gambar',
          'Pengembangan Regulasi Emosi Diri & Komunikasi Efektif Belajar',
          'Konsultasi Perkembangan Belajar Mingguan Bersama Orang Tua',
        ],
        specialAccommodations: "Membawa kit peraga sensori taktil mandiri, kartu visual 'Social Stories', fleksibilitas durasi istirahat ramah anak.",
        isActive: true,
      },
    });
  } else {
    nadiaService = await prisma.tutorService.update({
      where: { id: nadiaService.id },
      data: {
        price: 450000,
        sessionCount: 4,
        durationMinutes: 60,
        teachingMode: 'OFFLINE_VISIT',
        syllabusHighlights: [
          'Asesmen Kebutuhan Awal & Penyusunan Program Pembelajaran Individual (PPI)',
          'Latihan Sensori Motorik & Stimulasi Fokus Sebelum Mulai Belajar',
          'Calistung Fungsional Menggunakan Media Benda Konkret & Kartu Gambar',
          'Pengembangan Regulasi Emosi Diri & Komunikasi Efektif Belajar',
          'Konsultasi Perkembangan Belajar Mingguan Bersama Orang Tua',
        ],
        specialAccommodations: "Membawa kit peraga sensori taktil mandiri, kartu visual 'Social Stories', fleksibilitas durasi istirahat ramah anak.",
      },
    });
  }
  console.log('✅ Tutor 6 (Kak Nadia - Inklusif/Difabel) seeded.');

  // =========================================================================
  // 7. Demo Tutor 7: Kak Farhan Ramadhan, M.Pd (Konsultan Administrasi Sekolah & Kurikulum Merdeka)
  // =========================================================================
  console.log('📑 Seeding Tutor 7: Kak Farhan (Administrasi Guru & Kurikulum Merdeka)...');
  const farhanUser = await prisma.user.upsert({
    where: { email: 'tutor.admin@belajarku.com' },
    update: {
      name: 'Kak Farhan Ramadhan, M.Pd',
      phone: '081234567897',
      passwordHash,
      role: 'TUTOR',
    },
    create: {
      name: 'Kak Farhan Ramadhan, M.Pd',
      email: 'tutor.admin@belajarku.com',
      phone: '081234567897',
      passwordHash,
      role: 'TUTOR',
    },
  });

  const farhanProfile = await prisma.tutorProfile.upsert({
    where: { userId: farhanUser.id },
    update: {
      bio: 'Konsultan kurikulum & administrasi sekolah berpengalaman 8 tahun, fasilitator nasional Kurikulum Merdeka',
      education: 'M.Pd Manajemen Pendidikan, Universitas Negeri Jakarta',
      address: 'Menteng, Jakarta Pusat',
      teachingCredentials: 'M.Pd Manajemen Pendidikan UNJ, Fasilitator Nasional Sekolah Penggerak (Kemendikbudristek)',
      specialAccommodations: 'Penyusunan berkas siap akreditasi, template dokumen editable .docx/.xlsx, dan asistensi revisi via zoom/chat',
      isVerified: true,
      walletBalance: 0,
    },
    create: {
      userId: farhanUser.id,
      bio: 'Konsultan kurikulum & administrasi sekolah berpengalaman 8 tahun, fasilitator nasional Kurikulum Merdeka',
      education: 'M.Pd Manajemen Pendidikan, Universitas Negeri Jakarta',
      address: 'Menteng, Jakarta Pusat',
      teachingCredentials: 'M.Pd Manajemen Pendidikan UNJ, Fasilitator Nasional Sekolah Penggerak (Kemendikbudristek)',
      specialAccommodations: 'Penyusunan berkas siap akreditasi, template dokumen editable .docx/.xlsx, dan asistensi revisi via zoom/chat',
      isVerified: true,
      walletBalance: 0,
    },
  });

  // Farhan Services (Deliverable-based)
  const modulAjarCatId = categoryMap.get('modul-ajar-merdeka')!;
  let farhanService1 = await prisma.tutorService.findFirst({
    where: { tutorId: farhanProfile.id, title: 'Paket Lengkap Modul Ajar & Asesmen Kurikulum Merdeka (Fase A-C)' },
  });
  if (!farhanService1) {
    farhanService1 = await prisma.tutorService.create({
      data: {
        tutorId: farhanProfile.id,
        categoryId: modulAjarCatId,
        title: 'Paket Lengkap Modul Ajar & Asesmen Kurikulum Merdeka (Fase A-C)',
        serviceType: 'DELIVERABLE_BASED',
        teachingMode: 'ONLINE',
        durationMinutes: 60,
        sessionCount: 1,
        price: 350000,
        estimatedDays: 3,
        deliverableFormats: ['DOCX', 'PDF', 'XLSX'],
        maxRevisions: 2,
        description: 'Layanan penyusunan dokumen perangkat ajar Kurikulum Merdeka terlengkap untuk SD/MI. Mencakup Modul Ajar, Capaian Pembelajaran (CP), Alur Tujuan Pembelajaran (ATP), dan instrumen asesmen formatif & sumatif disesuaikan dengan karakteristik sekolah Anda.',
        syllabusHighlights: [
          'Penyelarasan CP (Capaian Pembelajaran) & ATP (Alur Tujuan Pembelajaran)',
          'Penyusunan Modul Ajar Lengkap dengan Diferensiasi Pembelajaran',
          'Instrumen Asesmen Diagnostik, Formatif, dan Sumatif Berbasis Rubrik',
          'Lembar Kerja Peserta Didik (LKPD) Siap Cetak dan Modifikasi',
          'Termasuk 2x Kesempatan Revisi Sesuai Catatan Pengawas / Kepala Sekolah',
        ],
        specialAccommodations: 'Dokumen master dikirim dalam format editable (.docx & .xlsx) serta PDF siap cetak.',
        isActive: true,
      },
    });
  } else {
    farhanService1 = await prisma.tutorService.update({
      where: { id: farhanService1.id },
      data: {
        price: 350000,
        sessionCount: 1,
        serviceType: 'DELIVERABLE_BASED',
        estimatedDays: 3,
        deliverableFormats: ['DOCX', 'PDF', 'XLSX'],
        maxRevisions: 2,
        description: 'Layanan penyusunan dokumen perangkat ajar Kurikulum Merdeka terlengkap untuk SD/MI. Mencakup Modul Ajar, Capaian Pembelajaran (CP), Alur Tujuan Pembelajaran (ATP), dan instrumen asesmen formatif & sumatif disesuaikan dengan karakteristik sekolah Anda.',
        syllabusHighlights: [
          'Penyelarasan CP (Capaian Pembelajaran) & ATP (Alur Tujuan Pembelajaran)',
          'Penyusunan Modul Ajar Lengkap dengan Diferensiasi Pembelajaran',
          'Instrumen Asesmen Diagnostik, Formatif, dan Sumatif Berbasis Rubrik',
          'Lembar Kerja Peserta Didik (LKPD) Siap Cetak dan Modifikasi',
          'Termasuk 2x Kesempatan Revisi Sesuai Catatan Pengawas / Kepala Sekolah',
        ],
        specialAccommodations: 'Dokumen master dikirim dalam format editable (.docx & .xlsx) serta PDF siap cetak.',
      },
    });
  }

  const lpjCatId = categoryMap.get('lpj-bos-sekolah')!;
  let farhanService2 = await prisma.tutorService.findFirst({
    where: { tutorId: farhanProfile.id, title: 'Jasa Penyusunan & Verifikasi SPJ / LPJ Dana BOS & BOP Sekolah' },
  });
  if (!farhanService2) {
    farhanService2 = await prisma.tutorService.create({
      data: {
        tutorId: farhanProfile.id,
        categoryId: lpjCatId,
        title: 'Jasa Penyusunan & Verifikasi SPJ / LPJ Dana BOS & BOP Sekolah',
        serviceType: 'DELIVERABLE_BASED',
        teachingMode: 'ONLINE',
        durationMinutes: 60,
        sessionCount: 1,
        price: 750000,
        estimatedDays: 5,
        deliverableFormats: ['XLSX', 'PDF', 'ZIP'],
        maxRevisions: 2,
        description: 'Jasa pendampingan dan pembuatan laporan pertanggungjawaban (SPJ/LPJ) Dana Bantuan Operasional Sekolah (BOS) reguler maupun kinerja. Sesuai juknis Kemendikbudristek dan format ARKAS, lengkap dengan lampiran bukti transaksi dan rekap perpajakan.',
        syllabusHighlights: [
          'Rekonsiliasi Buku Kas Umum (BKU), Buku Pembantu Kas, dan Buku Bank',
          'Penyusunan Berkas Pertanggungjawaban Belanja Barang/Jasa Sesuai ARKAS',
          'Perhitungan & Rekapitulasi Pajak PPh 21, 22, 23 dan PPN',
          'Kelengkapan Berita Acara Penerimaan Barang & Bukti Dokumentasi Fisik',
          'Garansi Pendampingan hingga Laporan Diterima Tim Manajemen BOS Disdik',
        ],
        specialAccommodations: 'Termasuk template pembukuan otomatis Excel dan pendampingan input ARKAS.',
        isActive: true,
      },
    });
  } else {
    farhanService2 = await prisma.tutorService.update({
      where: { id: farhanService2.id },
      data: {
        price: 750000,
        sessionCount: 1,
        serviceType: 'DELIVERABLE_BASED',
        estimatedDays: 5,
        deliverableFormats: ['XLSX', 'PDF', 'ZIP'],
        maxRevisions: 2,
        description: 'Jasa pendampingan dan pembuatan laporan pertanggungjawaban (SPJ/LPJ) Dana Bantuan Operasional Sekolah (BOS) reguler maupun kinerja. Sesuai juknis Kemendikbudristek dan format ARKAS, lengkap dengan lampiran bukti transaksi dan rekap perpajakan.',
        syllabusHighlights: [
          'Rekonsiliasi Buku Kas Umum (BKU), Buku Pembantu Kas, dan Buku Bank',
          'Penyusunan Berkas Pertanggungjawaban Belanja Barang/Jasa Sesuai ARKAS',
          'Perhitungan & Rekapitulasi Pajak PPh 21, 22, 23 dan PPN',
          'Kelengkapan Berita Acara Penerimaan Barang & Bukti Dokumentasi Fisik',
          'Garansi Pendampingan hingga Laporan Diterima Tim Manajemen BOS Disdik',
        ],
        specialAccommodations: 'Termasuk template pembukuan otomatis Excel dan pendampingan input ARKAS.',
      },
    });
  }
  console.log('✅ Tutor 7 (Kak Farhan - Administrasi Sekolah) seeded with 2 deliverable services.');

  // =========================================================================
  // 8. Demo Institution Account (Kepala Sekolah SDN 01 Pagi)
  // =========================================================================
  console.log('🏫 Seeding Demo Institution Account...');
  const institutionUser = await prisma.user.upsert({
    where: { email: 'kepsek.sdn01@belajarku.com' },
    update: {
      name: 'Bpk. Drs. H. Suryanto, M.Pd',
      phone: '081122334455',
      passwordHash,
      role: 'INSTITUTION',
      schoolName: 'SD Negeri 01 Pagi Menteng',
    },
    create: {
      name: 'Bpk. Drs. H. Suryanto, M.Pd',
      email: 'kepsek.sdn01@belajarku.com',
      phone: '081122334455',
      passwordHash,
      role: 'INSTITUTION',
      schoolName: 'SD Negeri 01 Pagi Menteng',
    },
  });

  await prisma.cart.upsert({
    where: { parentId: institutionUser.id },
    update: {},
    create: { parentId: institutionUser.id },
  });
  console.log('✅ Demo Institution Account (SDN 01 Pagi Menteng) seeded with cart.');

  // =========================================================================
  // 9. Pre-completed Order & History (Parent Demo + Kak Sarah for Kenzi)
  // =========================================================================
  console.log('💳 Seeding Pre-completed Order & Booking Sessions...');
  const demoInvoiceNumber = 'INV-DEMO-PAUD-001';

  // Dates: Session 1 (3 days ago), Session 2 (in 4 days), Session 3 (in 7 days), Session 4 (in 11 days)
  const now = new Date();
  const dateS1 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const dateS2 = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  const dateS3 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateS4 = new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000);

  const slotSnapshots = [
    { date: dateS1.toISOString().split('T')[0], startTime: '15:30', endTime: '16:30' },
    { date: dateS2.toISOString().split('T')[0], startTime: '15:30', endTime: '16:30' },
    { date: dateS3.toISOString().split('T')[0], startTime: '15:30', endTime: '16:30' },
    { date: dateS4.toISOString().split('T')[0], startTime: '15:30', endTime: '16:30' },
  ];

  let order = await prisma.order.findUnique({
    where: { invoiceNumber: demoInvoiceNumber },
  });

  if (order) {
    // Clean up associated records before re-seeding
    await prisma.walletMutation.deleteMany({
      where: { session: { orderItem: { orderId: order.id } } },
    });
    await prisma.sessionReport.deleteMany({
      where: { session: { orderItem: { orderId: order.id } } },
    });
    await prisma.platformRevenueLedger.deleteMany({
      where: { orderId: order.id },
    });
    await prisma.bookingSession.deleteMany({
      where: { orderItem: { orderId: order.id } },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: order.id },
    });
    await prisma.order.delete({
      where: { id: order.id },
    });
  }

  order = await prisma.order.create({
    data: {
      invoiceNumber: demoInvoiceNumber,
      parentId: parentUser.id,
      totalAmount: 350000,
      status: 'PAID',
    },
  });

  const orderItem = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      serviceId: sarahService.id,
      tutorId: sarahProfile.id,
      studentId: kenzi.id,
      priceSnapshot: 350000,
      totalSessions: 4,
      completedSessions: 1,
      selectedSlotsSnapshot: slotSnapshots as unknown as Prisma.InputJsonValue,
      teachingAddress: 'Jl. Bunga Cempaka No. 12, RT 03/07, Cilandak, Jakarta Selatan',
    },
  });

  // Sesi 1: COMPLETED with learning report & wallet mutation
  const session1 = await prisma.bookingSession.create({
    data: {
      orderItemId: orderItem.id,
      tutorId: sarahProfile.id,
      studentId: kenzi.id,
      sessionNumber: 1,
      scheduledDate: dateS1,
      startTime: '15:30',
      endTime: '16:30',
      status: 'COMPLETED',
      learningReport:
        'Kenzi sudah lancar melafalkan vokal A-I-U-E-O dan mulai belajar menggabungkan konsonan B dan C. Sangat fokus saat menggunakan kartu gambar.',
      completedAt: dateS1,
    },
  });

  // Wallet mutation for Sesi 1 payout (Gross Rp 87.500 - 15% Platform Fee Rp 13.125 = Net Rp 74.375)
  await prisma.walletMutation.upsert({
    where: { sessionId: session1.id },
    update: {
      grossAmount: 87500,
      feeDeducted: 13125,
      netAmount: 74375,
      amount: 74375,
      type: 'CREDIT_FROM_SESSION',
    },
    create: {
      tutorId: sarahProfile.id,
      sessionId: session1.id,
      type: 'CREDIT_FROM_SESSION',
      grossAmount: 87500,
      feeDeducted: 13125,
      netAmount: 74375,
      amount: 74375,
    },
  });

  // Record platform revenue ledger (15% platform commission)
  await prisma.platformRevenueLedger.upsert({
    where: { sessionId: session1.id },
    update: {
      grossAmount: 87500,
      platformFee: 13125,
    },
    create: {
      orderId: order.id,
      sessionId: session1.id,
      tutorId: sarahProfile.id,
      grossAmount: 87500,
      platformFee: 13125,
    },
  });

  // Sesi 2: DISPUTED with sample pending SessionReport
  const session2 = await prisma.bookingSession.create({
    data: {
      orderItemId: orderItem.id,
      tutorId: sarahProfile.id,
      studentId: kenzi.id,
      sessionNumber: 2,
      scheduledDate: dateS2,
      startTime: '15:30',
      endTime: '16:30',
      status: 'DISPUTED',
    },
  });

  await prisma.sessionReport.create({
    data: {
      sessionId: session2.id,
      reporterId: parentUser.id,
      reason: 'TUTOR_NO_SHOW',
      description: 'Tutor tidak hadir di lokasi les offline pada jam yang disepakati, dan nomor WhatsApp tidak dapat dihubungi selama 30 menit.',
      evidenceUrl: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=800',
      status: 'PENDING',
    },
  });

  // Sesi 3 & 4: SCHEDULED for upcoming weeks
  await prisma.bookingSession.createMany({
    data: [
      {
        orderItemId: orderItem.id,
        tutorId: sarahProfile.id,
        studentId: kenzi.id,
        sessionNumber: 3,
        scheduledDate: dateS3,
        startTime: '15:30',
        endTime: '16:30',
        status: 'SCHEDULED',
      },
      {
        orderItemId: orderItem.id,
        tutorId: sarahProfile.id,
        studentId: kenzi.id,
        sessionNumber: 4,
        scheduledDate: dateS4,
        startTime: '15:30',
        endTime: '16:30',
        status: 'SCHEDULED',
      },
    ],
  });

  console.log(`✅ Order ${demoInvoiceNumber} seeded: 1 COMPLETED, 1 DISPUTED (with SessionReport), 2 SCHEDULED.`);

  // =========================================================================
  // 10. Pre-completed Deliverable Order (Institution Demo + Kak Farhan)
  // =========================================================================
  console.log('📑 Seeding Pre-completed Deliverable Order & Sample Attachment...');
  const deliverableInvoiceNumber = 'INV-DEMO-ADMIN-001';

  let deliverableOrder = await prisma.order.findUnique({
    where: { invoiceNumber: deliverableInvoiceNumber },
  });

  if (deliverableOrder) {
    await prisma.orderAttachment.deleteMany({
      where: { orderId: deliverableOrder.id },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: deliverableOrder.id },
    });
    await prisma.order.delete({
      where: { id: deliverableOrder.id },
    });
  }

  deliverableOrder = await prisma.order.create({
    data: {
      invoiceNumber: deliverableInvoiceNumber,
      parentId: institutionUser.id,
      totalAmount: 350000,
      status: 'PAID',
      serviceType: 'DELIVERABLE_BASED',
      deliverableStatus: 'DELIVERED',
      revisionCount: 0,
      maxRevisions: 2,
    },
  });

  const deliverableOrderItem = await prisma.orderItem.create({
    data: {
      orderId: deliverableOrder.id,
      serviceId: farhanService1.id,
      tutorId: farhanProfile.id,
      serviceType: 'DELIVERABLE_BASED',
      priceSnapshot: 350000,
      platformFeePercent: 15.00,
      totalSessions: 1,
      completedSessions: 0,
      selectedSlotsSnapshot: [],
      deliverableStatus: 'DELIVERED',
      revisionCount: 0,
      maxRevisions: 2,
      notes: 'Mohon fokus pada Modul Ajar IPAS Kelas 4 Bab Tumbuhan, Sumber Kehidupan di Bumi, sertakan lembar kerja siswa (LKPD) berbasis eksperimen.',
    },
  });

  // Create sample physical deliverable file on disk
  const sampleUploadDir = path.join(process.cwd(), 'uploads', 'deliverables', deliverableOrder.id);
  if (!fs.existsSync(sampleUploadDir)) {
    fs.mkdirSync(sampleUploadDir, { recursive: true });
  }

  const sampleFileName = 'Modul_Ajar_IPAS_Kelas4_SDN01_Menteng.pdf';
  const sampleFilePath = path.join(sampleUploadDir, sampleFileName);
  const sampleContent = `%PDF-1.4
% Belajar-Ku Platform Deliverable Document
% Order Invoice: ${deliverableInvoiceNumber}
% Pemesan: SD Negeri 01 Pagi Menteng (Bpk. Drs. H. Suryanto, M.Pd)
% Penyusun: Kak Farhan Ramadhan, M.Pd
% Judul: Modul Ajar IPAS Kelas 4 - Fase B (Kurikulum Merdeka)
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 18 Tf
50 700 Td
(Belajar-Ku: Modul Ajar IPAS Kelas 4 - SDN 01 Pagi) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000115 00000 n 
0000000195 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
450
%%EOF`;

  fs.writeFileSync(sampleFilePath, sampleContent, 'utf-8');
  const sampleFileStats = fs.statSync(sampleFilePath);

  await prisma.orderAttachment.create({
    data: {
      orderId: deliverableOrder.id,
      orderItemId: deliverableOrderItem.id,
      fileName: sampleFileName,
      fileUrl: sampleFilePath,
      fileSize: sampleFileStats.size,
      mimeType: 'application/pdf',
      uploadedById: farhanUser.id,
    },
  });

  console.log(`✅ Deliverable Order ${deliverableInvoiceNumber} seeded with sample PDF attachment.`);

  console.log('\n===============================================================');
  console.log('🎉 DEMO DATA SEEDING COMPLETE!');
  console.log('===============================================================');
  console.log('Demo Credentials for Presentation:');
  console.log('  🛡️ ADMIN:        admin.demo@belajarku.com / password123');
  console.log('  👨‍👩‍👧 PARENT:       parent.demo@belajarku.com / password123');
  console.log('  🏫 INSTITUTION:  kepsek.sdn01@belajarku.com / password123');
  console.log('  👩‍🏫 TUTOR (PAUD): tutor.paud@belajarku.com / password123');
  console.log('  👨‍🏫 TUTOR (SMP):  tutor.smp@belajarku.com  / password123');
  console.log('  📑 TUTOR (ADMIN): tutor.admin@belajarku.com / password123');
  console.log('  👨‍🏫 UNVERIFIED:   tutor.unverified@belajarku.com / password123');
  console.log('===============================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during demo database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
