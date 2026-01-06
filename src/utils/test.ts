import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  query, 
//   setDoc, 
  writeBatch,
//   enableIndexedDbPersistence,
  type Firestore
} from "firebase/firestore";

// Import tipe data Anda
import { type SurahListItem, type SurahData } from "@/services/QuranAPI"; 


// ... (Inisialisasi app dan db tetap sama) ...

// Fungsi Helper: Jeda waktu (Sleep)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi Helper: Memecah array menjadi potongan kecil (Chunking)
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// --- 1. Konfigurasi Firebase ---
const firebaseConfig = {
  // Ganti dengan config dari Firebase Console Anda
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Singleton pattern untuk inisialisasi App dan DB
let app;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

db = getFirestore(app);

// OPSIONAL: Aktifkan Offline Persistence (Cache otomatis mirip IDB)
// Ini membuat aplikasi tetap jalan saat offline dan tidak perlu download ulang data.
// enableIndexedDbPersistence(db).catch((err) => {
//   console.error("Persistence error:", err.code);
// });

// Nama Collection di Firestore
const SURAH_LIST_COLLECTION = 'surahList';
const SURAH_DETAIL_COLLECTION = 'surahDetails';

// --- Fungsi untuk SURAH LIST ---

/**
 * Menyimpan daftar surah ke Firestore.
 * Menggunakan Batch Write agar lebih efisien (hemat request) daripada loop satu per satu.
 */
export async function saveSurahListToFirebase(surahList: SurahListItem[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    
    surahList.forEach((surah) => {
      // Kita gunakan surah.number sebagai ID Dokumen agar mudah dicari
      const docRef = doc(db, SURAH_LIST_COLLECTION, surah.id.toString());
      batch.set(docRef, surah);
    });

    await batch.commit();
    console.log("Daftar surah berhasil disimpan ke Firestore.");
  } catch (error) {
    console.error("Error saving surah list:", error);
    throw error;
  }
}

/**
 * Mengambil daftar surah dari Firestore.
 */
export async function getSurahListFromFirebase(): Promise<SurahListItem[] | null> {
  try {
    const querySnapshot = await getDocs(collection(db, SURAH_LIST_COLLECTION));
    
    if (querySnapshot.empty) return null;

    const surahList: SurahListItem[] = [];
    querySnapshot.forEach((doc) => {
      surahList.push(doc.data() as SurahListItem);
    });

    // Biasanya data dari Firestore tidak urut, kita urutkan manual berdasarkan nomor
    return surahList.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.error("Error fetching surah list:", error);
    return null;
  }
}


// --- Fungsi untuk SURAH DETAILS ---

/**
 * Menyimpan detail surah (isi ayat) ke Firestore.
 */
export async function saveSurahDetailToFirebase(surahDataArray: SurahData[]): Promise<void> {
  const BATCH_SIZE = 50; // Kita kurangi jadi 50 ayat per kirim agar ringan
  const DELAY_MS = 500;  // Jeda 0.5 detik setiap kirim batch

  for (const surah of surahDataArray) {
    try {
      console.log(`Memulai proses simpan Surah ${surah.name.transliteration}...`);

      // 1. Simpan Info Induk Surah (Metadata) dulu
      // Kita lakukan ini terpisah agar batch ayat fokus ke ayat saja
      const metaBatch = writeBatch(db);
      const { verses, ...surahMetadata } = surah; 
      const surahRef = doc(db, SURAH_DETAIL_COLLECTION, surah.number.toString());
      metaBatch.set(surahRef, surahMetadata);
      await metaBatch.commit(); // Kirim metadata langsung

      // 2. Jika ada ayat, kita pecah jadi beberapa kloter
      if (verses && verses.length > 0) {
        const verseChunks = chunkArray(verses, BATCH_SIZE);
        
        let batchIndex = 1;
        for (const chunk of verseChunks) {
          const batch = writeBatch(db);

          chunk.forEach((verse) => {
             // Path: surahDetails/{noSurah}/verses/{noAyat}
             const verseRef = doc(db, SURAH_DETAIL_COLLECTION, surah.number.toString(), "verses", verse.id.toString());
             batch.set(verseRef, verse);
          });

          // Kirim batch ini
          await batch.commit();
          console.log(` -> Tersimpan batch ayat ke-${batchIndex} (${chunk.length} ayat)`);
          
          // ISTIRAHAT: Beri nafas ke Firebase SDK agar antrian tidak penuh
          await delay(DELAY_MS); 
          
          batchIndex++;
        }
      }

      console.log(`✅ Sukses: Surah ${surah.name.transliteration} selesai.`);
      
    } catch (error) {
      console.error(`❌ Gagal menyimpan surah ${surah.number}:`, error);
      // Jangan throw error agar surah selanjutnya tetap diproses
    }
  }
}

/**
 * Mengambil SEMUA detail surah (Hati-hati, ini boros kuota read jika datanya besar).
 */
export async function getAllSurahDetailsFromFirebase(): Promise<SurahData[]> {
  try {
    const querySnapshot = await getDocs(collection(db, SURAH_DETAIL_COLLECTION));
    
    const allSurah: SurahData[] = [];
    querySnapshot.forEach((doc) => {
      allSurah.push(doc.data() as SurahData);
    });

    return allSurah.sort((a, b) => a.number - b.number);
  } catch (error) {
    console.error("Error fetching all surah details:", error);
    return [];
  }
}

/**
 * Mengambil SATU surah detail berdasarkan nomor.
 * Jauh lebih hemat & cepat daripada mengambil semua lalu di-filter.
 */
// --- FUNGSI AMBIL (GET) DENGAN RE-ASSEMBLE ---

export async function getSurahDetailByNumberFromFirebase(surahNumber: number): Promise<SurahData | null> {
  try {
    // 1. Ambil Data Induk (Metadata)
    const surahRef = doc(db, SURAH_DETAIL_COLLECTION, surahNumber.toString());
    const surahSnap = await getDoc(surahRef);

    if (!surahSnap.exists()) {
      return null;
    }

    const surahMetadata = surahSnap.data();

    // 2. Ambil Semua Ayat dari Subcollection 'verses'
    // Kita urutkan berdasarkan nomor ayat agar tidak acak
    const versesRef = collection(db, SURAH_DETAIL_COLLECTION, surahNumber.toString(), "verses");
    
    // Asumsi: field di dalam ayat yang menyimpan nomor ayat adalah 'number.inSurah' 
    // Sesuaikan string 'number.inSurah' dengan struktur data API Anda sebenarnya.
    // Jika tidak bisa sorting di query, kita sort manual di JS.
    const q = query(versesRef); 
    const versesSnap = await getDocs(q);

    const verses: any[] = [];
    versesSnap.forEach((doc) => {
      verses.push(doc.data());
    });

    // Sort manual untuk memastikan urutan ayat benar (1, 2, 3...)
    verses.sort((a, b) => a.id.insurah - b.id.insurah);

    // 3. Gabungkan kembali menjadi satu object SurahData utuh
    const fullSurahData: SurahData = {
      ...surahMetadata,
      verses: verses
    } as SurahData;

    return fullSurahData;

  } catch (error) {
    console.error(`Error fetching surah #${surahNumber}:`, error);
    return null;
  }
}