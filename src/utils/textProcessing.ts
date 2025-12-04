// utils/textUtils.ts

// 1. Kamus Mapping untuk Input Suara (Muqatta'at)
const MUQATTAAT_MAPPING: Record<string, string> = {
  // Al-Baqarah, Ali Imran, dll
  "الف لام ميم": "الم",
  // Yasin
  "يا سين": "يس",
  // Taha
  "طا ها": "طه",
  // Sad
  صاد: "ص",
  // Qaf
  قاف: "ق",
  // Nun
  نون: "ن",
  // Ha Mim
  حميم: "حم",
  "ح م": "حم",

  // Al-A'raf
  "alf lam mim shad": "المص",
  "alif lam mim sad": "المص",
  "الف لام ميم صاد": "المص",

  // Maryam
  "kaf ha ya ain shad": "كهيعص",
  "kaf ha ya ain sad": "كهيعص",
  "كاف ها يا عين صاد": "كهيعص",

  // Tambahkan mapping lain sesuai kebutuhan (Ha Mim, Nun, Qaf, dll)
};

// utils/textUtils.ts

// ... (kode MUQATTAAT_MAPPING tetap sama seperti sebelumnya)

// utils/textUtils.ts

// ... (MUQATTAAT_MAPPING tetap sama seperti sebelumnya) ...

export function normalizeArabic(text: string): string {
  if (!text) return "";

  // 1. Cek Mapping Muqatta'at (Alif Lam Mim, dll)
  const lowerText = text.toLowerCase().trim();
  // @ts-ignore (jika MUQATTAAT_MAPPING ada di file yang sama)
  if (
    typeof MUQATTAAT_MAPPING !== "undefined" &&
    MUQATTAAT_MAPPING[lowerText]
  ) {
    return MUQATTAAT_MAPPING[lowerText];
  }

  return (
    text
      // --- STEP 0: Satukan karakter terpisah (PENTING untuk copy-paste) ---
      // Mengubah "Ya + Hamzah" (2 huruf) menjadi "Yeh With Hamza" (1 huruf)
      .normalize("NFKC")

      // --- STEP 1: Hapus Harakat & Tanda Baca ---
      // Range ini mencakup harakat, tatweel, tanda waqaf, dan small high letters
      .replace(
        /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g,
        ""
      )

      // --- STEP 2: Normalisasi Alif (Rumah Hamzah Alif) ---
      // أ (Atas), إ (Bawah), آ (Maddah), ٱ (Waslah - PENTING Al-Hujurat:11)
      .replace(/[أإآٱ]/g, "ا")

      // --- STEP 3: Normalisasi "Rumah Hamzah" Lainnya (SOLUSI BI'SA) ---
      // Mengubah 'ئ' (pada bi'sa) dan 'ى' (pada musa) menjadi 'ي' (Ya standar)
      // Ini membuat "Bi'sa" (بئس) menjadi "Bisa" (بيس) di sistem pencarian.
      // .replace(/[ىئ]/g, 'ي')

      // --- STEP 4: Normalisasi Waw Hamzah ---
      // Mengubah 'ؤ' (pada Mukmin) menjadi 'و' (Waw standar)
      .replace(/[ؤ]/g, "و")

      // --- STEP 5: Normalisasi Kaf ---
      .replace(/ڪ/g, "ك")

      .replace(/يا\s+[اأإآ]/g, "يا")
      .replace(/كافر/g, "كفر")
      .replace(/سماوات/g, "سموت")
  );
}
