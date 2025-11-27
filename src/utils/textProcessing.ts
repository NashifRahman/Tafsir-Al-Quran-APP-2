export function cleanQuranReference(raw: string): string {
  if (!raw) return "";

  let processed = raw;

  // 1. Daftar perbaikan nama Surah yang sering error encoding-nya
  const corrections: Record<string, string> = {
    "Y±s³n": "Yāsīn",
    // Tambahkan mapping lain di sini jika nemu error lain, contoh:
    // "Al-M±'idah": "Al-Ma'idah" 
  };

  // Lakukan replace untuk setiap kata yang error
  Object.keys(corrections).forEach((key) => {
    // Menggunakan replaceAll atau global regex agar terganti semua jika muncul >1 kali
    processed = processed.split(key).join(corrections[key]);
  });

  // 2. Merapikan format spasi
  // Input: "(Yasin/36 : 82)" -> Output: "(Yasin/36:82)"
  // Regex ini menghapus spasi di sekitar titik dua
  processed = processed.replace(/\s*:\s*/g, ":");

  return processed;
}