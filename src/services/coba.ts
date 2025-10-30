// // QuranAPI.ts + quranCache.ts (gabungan)

// const DB_NAME = 'QURAN_CACHE_DB';
// const STORE_NAME = 'QURAN_STORE';
// const API_URL = 'https://quran-api-id.vercel.app/surah';
// const CACHE_KEY = 'ALL_DATA_V1';

// // -----------------------------
// // Interfaces
// // -----------------------------
// export interface SuratName {
//   long: string
//   short: string
//   transliteration: { id: string }
//   translation: { id: string }
// }

// export interface Verse {
//   number: { inSurah: number }
//   text: { arab: string; transliteration: { en: string } }
//   translation: { id: string }
//   tafsir: { id: { short: string } }
// }

// export interface Ayat {
//   id: number
//   arab: string
//   latin: string
//   terjemahan: string
//   tafsir: string
// }

// export interface SurahData {
//   number: number
//   name: SuratName
//   verses: Ayat[]
//   numberOfVerses: number
//   revelation: { arab: string; en: string; id: string }
// }

// export interface SurahListItem {
//   number: number
//   name: {
//     short: string
//     long: string
//     transliteration: { id: string }
//     translation: { id: string }
//   }
//   numberOfVerses: number
//   revelation: { arab: string; id: string }
// }

// // -----------------------------
// // IndexedDB Cache Utilities
// // -----------------------------
// function openDB(): Promise<IDBDatabase> {
//   return new Promise((resolve, reject) => {
//     const req = indexedDB.open(DB_NAME, 1);
//     req.onupgradeneeded = () => {
//       req.result.createObjectStore(STORE_NAME);
//     };
//     req.onsuccess = () => resolve(req.result);
//     req.onerror = () => reject(req.error);
//   });
// }

// async function idbPut<T>(key: string, value: T): Promise<void> {
//   const db = await openDB();
//   return new Promise((res, rej) => {
//     const tx = db.transaction(STORE_NAME, 'readwrite');
//     tx.objectStore(STORE_NAME).put(value, key);
//     tx.oncomplete = () => { db.close(); res(); };
//     tx.onerror = () => { db.close(); rej(tx.error); };
//   });
// }

// async function idbGet<T>(key: string): Promise<T | undefined> {
//   const db = await openDB();
//   return new Promise((res, rej) => {
//     const tx = db.transaction(STORE_NAME, 'readonly');
//     const req = tx.objectStore(STORE_NAME).get(key);
//     req.onsuccess = () => { db.close(); res(req.result as T | undefined); };
//     req.onerror = () => { db.close(); rej(req.error); };
//   });
// }

// export async function clearAllSurahCache() {
//   const db = await openDB();
//   const tx = db.transaction(STORE_NAME, 'readwrite');
//   tx.objectStore(STORE_NAME).delete(CACHE_KEY);
//   tx.oncomplete = () => db.close();
// }

// // -----------------------------
// // Cache Layer: getQuranData()
// // -----------------------------
// export async function getQuranData(): Promise<SurahData[]> {
//   const cached = await idbGet<SurahData[]>(CACHE_KEY);
//   if (cached && cached.length > 0) {
//     console.log('✅ Loaded all surahs from IndexedDB cache');
//     return cached;
//   }

//   console.log('🌐 Fetching all surahs from API...');
//   const totalSurah = 114;
//   const allSurah: SurahData[] = [];

//   for (let i = 1; i <= totalSurah; i++) {
//     const res = await fetch(`${API_URL}/${i}`);
//     if (!res.ok) throw new Error(`Gagal fetch surah ${i}`);
//     const data = await res.json();

//     const surah: SurahData = {
//       number: data.data.number,
//       name: data.data.name,
//       numberOfVerses: data.data.numberOfVerses,
//       revelation: data.data.revelation,
//       verses: data.data.verses.map((v: Verse) => ({
//         id: v.number.inSurah,
//         arab: v.text.arab,
//         latin: v.text.transliteration.en,
//         terjemahan: v.translation.id,
//         tafsir: v.tafsir.id.short,
//       })),
//     };

//     allSurah.push(surah);
//   }

//   console.log('💾 Saving all surahs to IndexedDB...');
//   await idbPut(CACHE_KEY, allSurah);
//   console.log('✅ Cached all surahs');
//   return allSurah;
// }

// // -----------------------------
// // API Compatibility Wrappers
// // -----------------------------
// export async function fetchSurahList(): Promise<SurahListItem[]> {
//   const quranData = await getQuranData();
//   return quranData.map((s) => ({
//     number: s.number,
//     name: s.name,
//     numberOfVerses: s.numberOfVerses,
//     revelation: { arab: s.revelation.arab, id: s.revelation.id },
//   }));
// }

// export async function fetchSurah(surahNumber: number): Promise<SurahData> {
//   const quranData = await getQuranData();
//   const found = quranData.find((s) => s.number === surahNumber);
//   if (!found) throw new Error(`Surah ${surahNumber} not found`);
//   return found;
// }

// export async function fetchAlMulk(): Promise<SurahData> {
//   return fetchSurah(67);
// }

// // -----------------------------
// // Hybrid Search Integration
// // -----------------------------
// import { HybridSearchEngine, type SearchResult } from "./hybrid-search"
// import { EmbeddingService } from "./embedding-service"

// let hybridSearchEngine: HybridSearchEngine | null = null;
// let allVerses: Ayat[] = [];

// export async function hybridSearchVerses(query: string, topK = 20): Promise<SearchResult[]> {
//   if (!hybridSearchEngine || allVerses.length === 0) {
//     console.log('🧠 Initializing Hybrid Search from cache...');
//     const allSurah = await getQuranData();
//     allVerses = allSurah.flatMap(s => s.verses);

//     hybridSearchEngine = new HybridSearchEngine(allVerses, {
//       bm25Weight: 0.5,
//       semanticWeight: 0.5,
//       minBM25Threshold: 0.05,
//       minSemanticThreshold: 0.2,
//     });

//     const embeddingService = EmbeddingService.getInstance();
//     embeddingService.indexDocuments(allVerses);
//   }

//   try {
//     const results = hybridSearchEngine.search(query, topK);
//     if (results.length === 0) return fallbackSearch(query, topK);
//     return results;
//   } catch (error) {
//     console.error("[v0] Hybrid search error:", error);
//     return fallbackSearch(query, topK);
//   }
// }

// function fallbackSearch(query: string, topK = 20): SearchResult[] {
//   const normalizedQuery = query.toLowerCase().normalize("NFKC");
//   const results: SearchResult[] = [];
//   const cleanQuery = normalizedQuery.replace(/[\u064B-\u065F]/g, "");

//   for (const verse of allVerses) {
//     const arab = verse.arab.normalize("NFKC").replace(/[\u064B-\u065F]/g, "");
//     const latin = verse.latin.toLowerCase();
//     const terjemahan = verse.terjemahan.toLowerCase();

//     let score = 0;
//     if (arab.includes(cleanQuery)) score = 0.9;
//     else if (cleanQuery.length > 2 && arab.includes(cleanQuery.substring(0, Math.ceil(cleanQuery.length / 2)))) score = 0.7;
//     else if (latin.includes(normalizedQuery)) score = 0.6;
//     else if (terjemahan.includes(normalizedQuery)) score = 0.5;
//     else if (cleanQuery.length > 3 && arab.split(/\s+/).some(w => w.includes(cleanQuery.substring(0, 3)))) score = 0.4;

//     if (score > 0) {
//       results.push({
//         ...verse,
//         bm25Score: score,
//         semanticScore: 0,
//         hybridScore: score,
//         matchType: "keyword",
//       });
//     }
//   }

//   return results.sort((a, b) => b.hybridScore - a.hybridScore).slice(0, topK);
// }

// export function getSearchStats() {
//   return {
//     totalVerses: allVerses.length,
//     engineInitialized: hybridSearchEngine !== null,
//     bm25Weight: hybridSearchEngine?.getConfig().bm25Weight || 0.6,
//     semanticWeight: hybridSearchEngine?.getConfig().semanticWeight || 0.4,
//   };
// }

// export function updateHybridSearchConfig(config: {
//   bm25Weight?: number
//   semanticWeight?: number
//   minBM25Threshold?: number
//   minSemanticThreshold?: number
// }) {
//   if (hybridSearchEngine) {
//     hybridSearchEngine.updateConfig(config);
//   }
// }
