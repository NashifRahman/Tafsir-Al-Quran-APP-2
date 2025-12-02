import { openDB, type IDBPDatabase } from 'idb';
// Asumsikan Anda memiliki tipe data untuk detail surah, kita akan gunakan tipe generik untuk contoh ini.
// Anda mungkin perlu mengimpor tipe SurahData dari file API services Anda
import { type SurahListItem, type SurahData } from "@/services/QuranAPI"; 

// Nama database dan **VERSI BARU**
const DB_NAME = 'QuranAppDB';
const DB_VERSION = 2; // 👈 PENTING: Versi dinaikkan untuk memicu onupgradeneeded

// Nama store untuk daftar surah (tetap)
const SURAH_LIST_STORE_NAME = 'surahList';
// Nama store **BARU** untuk detail ayat per surah
const SURAH_DETAIL_STORE_NAME = 'surahDetails';


let db: IDBPDatabase;

/**
 * Membuka koneksi IndexedDB.
 */
async function initDB() {
  if (db) return db;
  
  // Perhatikan DB_VERSION = 2
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 1. Membuat object store untuk Daftar Surah (jika belum ada)
      if (!db.objectStoreNames.contains(SURAH_LIST_STORE_NAME)) {
        db.createObjectStore(SURAH_LIST_STORE_NAME, { keyPath: 'id' });
      }
      
      // 2. Membuat object store **BARU** untuk Detail Surah
      if (!db.objectStoreNames.contains(SURAH_DETAIL_STORE_NAME)) {
        // Kita gunakan 'number' surah sebagai keyPath agar mudah dicari
        db.createObjectStore(SURAH_DETAIL_STORE_NAME, { keyPath: 'number' });
      }
    },
  });
  return db;
}

// --- Fungsi untuk SURAH_LIST_STORE_NAME (Tidak Berubah) ---

/**
 * Menyimpan daftar surah ke IndexedDB.
 * @param surahList Daftar surah.
 */
export async function cacheSurahList(surahList: SurahListItem[]): Promise<void> {
  const conn = await initDB();
  const tx = conn.transaction(SURAH_LIST_STORE_NAME, 'readwrite');
  const store = tx.objectStore(SURAH_LIST_STORE_NAME);
  
  await store.clear();
  for (const surah of surahList) {
    await store.put(surah);
  }
  await tx.done;
}

/**
 * Mengambil daftar surah dari IndexedDB.
 * @returns Daftar surah atau null jika tidak ada.
 */
export async function getCachedSurahList(): Promise<SurahListItem[] | null> {
  const conn = await initDB();
  const tx = conn.transaction(SURAH_LIST_STORE_NAME, 'readonly');
  const store = tx.objectStore(SURAH_LIST_STORE_NAME);
  
  const allSurah = await store.getAll();
  
  if (allSurah && allSurah.length > 0) {
    return allSurah as SurahListItem[];
  }
  
  return null;
}


// --- Fungsi **BARU** untuk SURAH_DETAIL_STORE_NAME ---

/**
 * Menyimpan detail satu surah ke IndexedDB (store: surahDetails).
 * @param surahData_1 Data detail surah (termasuk semua ayat).
 */
export async function cacheSurahDetail(surahData_1: SurahData[]): Promise<void> {
  const conn = await initDB();
  const tx = conn.transaction(SURAH_DETAIL_STORE_NAME, 'readwrite');
  const store = tx.objectStore(SURAH_DETAIL_STORE_NAME);
  
  // await store.clear();
  for (const surah of surahData_1) {
    await store.put(surah);
  }
  await tx.done;
}


/**
 * Mengambil detail surah berdasarkan nomor dari IndexedDB (store: surahDetails).
 * @param surahNumber Nomor surah yang dicari (1-114).
 * @returns Detail surah (SurahData) atau null jika tidak ada.
 */
export async function getCachedSurahDetail(): Promise<SurahData[] | null> {
  const conn = await initDB();
  const tx = conn.transaction(SURAH_DETAIL_STORE_NAME, 'readonly');
  const store = tx.objectStore(SURAH_DETAIL_STORE_NAME);
  
  const allSurah = await store.getAll();
  
  if (allSurah && allSurah.length > 0) {
    return allSurah as SurahData[];
  }
  
  return null;
}

/**
 * Mengambil satu surah detail berdasarkan nomor (dari cache).
 */
export async function getCachedSurahByNumber(surahNumber: number): Promise<SurahData | null> {
  const conn = await initDB();
  const tx = conn.transaction(SURAH_DETAIL_STORE_NAME, 'readonly');
  const store = tx.objectStore(SURAH_DETAIL_STORE_NAME);
  const surah = await store.get(surahNumber);
  return surah ?? null;
}

/**
 * Mengambil semua surah detail dari cache untuk pencarian global.
 */
export async function getAllCachedSurahDetails(): Promise<SurahData[]> {
  const conn = await initDB();
  const tx = conn.transaction(SURAH_DETAIL_STORE_NAME, 'readonly');
  const store = tx.objectStore(SURAH_DETAIL_STORE_NAME);
  const all = await store.getAll();
  return all ?? [];
}