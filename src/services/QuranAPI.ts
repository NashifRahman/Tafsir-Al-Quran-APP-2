// --- DEFINISI TIPE DATA ---

export interface SurahListItem {
  id: number;
  nama: string;
  arabic: string;
  arti: string;
  kategori_ar: string;
  kategori: string;
  jmlAyat: number;
  ayat_ar: string;
}

export interface SurahLPMQ {
  short: string;
  transliteration: string;
  translation: string;
}

// Interface respon dari /ayat/local/{surahNumber}
// Perhatikan field 'id' adalah Global ID yang akan kita pakai untuk fetch tafsir
interface KemenagVerseItem {
  id: number; // <-- Global ID (Contoh: 8 untuk Al-Baqarah ayat 1)
  surah: number;
  ayat: number;
  teks_msi_usmani: string;
  teks: string;
  terjemah: string;
}

// Interface respon dari /ayat/local/tafsir/{globalId}
interface KemenagTafsirItem {
  id: number;
  surah: number;
  ayat: number;
  teks: string;    // Tafsir Wajiz (Ringkas)
  tahlili: string; // Tafsir Tahlili (Panjang)
}

export interface Ayat {
  id: number;
  globalId: number; // Tambahan: Menyimpan ID global untuk referensi
  arab: string;
  latin: string;
  terjemahan: string;
  tafsir: string;
  tafsirLong: string;
}

export interface SurahData {
  number: number;
  name: SurahLPMQ;
  verses: Ayat[];
  numberOfVerses: number;
  revelation: {
    arab: string;
    id: string;
  };
}

// --- FUNGSI API ---

// 1. Fetch List Surah (Metadata)
export async function fetchSurahList(user: string, Authorization: string): Promise<SurahListItem[]> {
  const res = await fetch(`/api-kemenag/api-alquran/surah/local/1/114`, {
    headers: { user, Authorization }
  });
  if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
  const data = await res.json();
  return data.data || [];
}

// 2. Fetch Detail Surah (Verses + Tafsir by Global ID)
export async function fetchSurah(surahNumber: number, user: string, Authorization: string): Promise<SurahData> {
  try {
    // A. Ambil Metadata Surah (untuk Header)
    const listRes = await fetch(`/api-kemenag/api-alquran/surah/local/1/114`, {
      headers: { user, Authorization }
    });
    const listJson = await listRes.json();
    const surahMeta = listJson.data.find((s: SurahListItem) => s.id === Number(surahNumber));
    if (!surahMeta) throw new Error(`Surah ${surahNumber} tidak ditemukan`);

    // B. Ambil Daftar Ayat untuk Surah ini
    const ayatRes = await fetch(`/api-kemenag/api-alquran/ayat/local/${surahNumber}`, {
      headers: { user, Authorization }
    });
    if (!ayatRes.ok) throw new Error(`HTTP Error Ayat ${ayatRes.status}`);
    const ayatJson = await ayatRes.json();
    const rawVerses: KemenagVerseItem[] = ayatJson.data;

    // C. Ambil Tafsir PER AYAT menggunakan Global ID
    // ⚠️ PERINGATAN: Ini akan melakukan request sebanyak jumlah ayat (misal Al-Baqarah = 286 request)
    // Browser membatasi koneksi paralel, jadi ini mungkin antre.
    const tafsirPromises = rawVerses.map(verse => 
      fetch(`/api-kemenag/api-alquran/ayat/local/tafsir/${verse.id}`, { // Gunakan global ID
        headers: { user, Authorization }
      })
      .then(res => res.ok ? res.json() : null) // Handle jika ada request tafsir yg gagal
      .catch(err => {
        console.error(`Gagal fetch tafsir ID ${verse.id}`, err);
        return null; 
      })
    );

    // Tunggu semua request tafsir selesai
    const tafsirResponses = await Promise.all(tafsirPromises);

    // D. Mapping & Merging Data
    // Kita buat Map agar mudah mencocokkan respon tafsir ke ayatnya (berjaga-jaga jika urutan promise acak)
    const tafsirMap = new Map<number, KemenagTafsirItem>();
    
    tafsirResponses.forEach((response) => {
      if (response && response.data) {
        // API tafsir mengembalikan array data (biasanya isinya 1 item)
        // Struktur: { data: [ { id: 8, teks: "...", ... } ] }
        const item = Array.isArray(response.data) ? response.data[0] : response.data;
        if (item) {
            tafsirMap.set(item.id, item); // Key gunakan Global ID
        }
      }
    });

    const ayatList: Ayat[] = rawVerses.map((verse) => {
      const tafsirData = tafsirMap.get(verse.id); // Cocokkan via Global ID

      return {
        id: verse.ayat,           // Nomor ayat dalam surah (1, 2, 3...)
        globalId: verse.id,       // Nomor ayat global (8, 9, 10...)
        arab: verse.teks_msi_usmani,
        latin: verse.teks,
        terjemahan: verse.terjemah,
        tafsir: tafsirData?.teks || "",       // Tafsir Wajiz
        tafsirLong: tafsirData?.tahlili || "", // Tafsir Tahlili
      };
    });

    return {
      number: surahMeta.id,
      name: {
        short: surahMeta.arabic,
        transliteration: surahMeta.nama,
        translation: surahMeta.arti
      },
      verses: ayatList,
      numberOfVerses: surahMeta.jmlAyat,
      revelation: {
        arab: surahMeta.kategori_ar,
        id: surahMeta.kategori
      },
    };

  } catch (error) {
    console.error("Error fetching surah:", error);
    throw error;
  }
}

// 3. Fetch All Surah Data (HANYA AYAT, TANPA TAFSIR)
// ⚠️ Penting: Jangan ambil tafsir di sini karena akan memicu ribuan request (6236 ayat)
// Fungsi ini biasanya dipakai untuk pencarian global cepat atau indeks.
export async function fetchAllSurahData(user: string, Authorization: string): Promise<SurahData[]> {
    const listRes = await fetch(`/api-kemenag/api-alquran/surah/local/1/114`, {
        headers: { user, Authorization }
    });
    const listJson = await listRes.json();
    const surahList: SurahListItem[] = listJson.data;

    const promises = surahList.map(async (meta) => {
        const res = await fetch(`/api-kemenag/api-alquran/ayat/local/${meta.id}`, { 
            headers: { user, Authorization } 
        });
        const json = await res.json();
        const verses: KemenagVerseItem[] = json.data;

        return {
            meta,
            verses: verses.map(v => ({
                id: v.ayat,
                globalId: v.id,
                arab: v.teks_msi_usmani,
                latin: v.teks,
                terjemahan: v.terjemah,
                tafsir: "",     // Kosongkan demi performa
                tafsirLong: ""  // Kosongkan demi performa
            }))
        };
    });

    const results = await Promise.all(promises);

    return results.map(item => ({
        number: item.meta.id,
        name: {
            short: item.meta.arabic,
            transliteration: item.meta.nama,
            translation: item.meta.arti
        },
        verses: item.verses,
        numberOfVerses: item.meta.jmlAyat,
        revelation: {
            arab: item.meta.kategori_ar,
            id: item.meta.kategori
        }
    }));
}