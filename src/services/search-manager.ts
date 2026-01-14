// import Fuse from "fuse.js"
// import { fetchSurah, type SurahData, type Ayat } from "./QuranAPI"
// import { HybridSearchEngine } from "./hybrid-search"

// export interface SearchQuery {
//   term: string
//   isGlobal: boolean
// }

// export interface FormattedSearchResult {
//   ayat: Ayat
//   surahNumber: number
//   surahName: string
//   matchCount: number
//   matchType: "arab" | "latin" | "terjemahan" | "tafsir"
//   searchLanguage: "arab" | "indonesia"
// }

// // Cache for normalized search terms and surah data
// const surahCache = new Map<number, SurahData>()
// const normalizedTermCache = new Map<string, string>()

// export class SearchManager {
//   private static instance: SearchManager

//   private constructor() {}

//   static getInstance(): SearchManager {
//     if (!SearchManager.instance) {
//       SearchManager.instance = new SearchManager()
//     }
//     return SearchManager.instance
//   }

//   private normalizeTerm(term: string): string {
//     const cacheKey = `norm_${term}`
//     if (normalizedTermCache.has(cacheKey)) {
//       return normalizedTermCache.get(cacheKey)!
//     }

//     const hasArabic = /[\u0600-\u06FF]/.test(term)
//     let cleanTerm: string

//     if (hasArabic) {
//       cleanTerm = term.trim().normalize("NFKC")
//     } else {
//       cleanTerm = term
//         .toLowerCase()
//         .trim()
//         .replace(/[^\p{L}\p{N}\s]/gu, "")
//         .normalize("NFKC")
//     }

//     normalizedTermCache.set(cacheKey, cleanTerm)
//     return cleanTerm
//   }

//   private hasArabic(text: string): boolean {
//     return /[\u0600-\u06FF]/.test(text)
//   }

// private async searchInSurah(
//     surahData: SurahData,
//     cleanTerm: string,
//     hasArabic: boolean,
//   ): Promise<FormattedSearchResult[]> {
//     const results: FormattedSearchResult[] = []

//     try {
//       // 1. JIKA INPUT ARAB: Gunakan Hybrid Engine & Fuse Arab
//       if (hasArabic) {
//         // ... (Logika Arab tetap sama seperti sebelumnya) ...
//         const hybridEngine = new HybridSearchEngine(surahData.verses)
//         const hybridResults = hybridEngine.search(cleanTerm, 50)
        
//         hybridResults.forEach((result) => {
//            if (result.hybridScore >= 0.4) {
//              results.push({
//                ayat: result,
//                surahNumber: surahData.number,
//                surahName: surahData.name.short,
//                matchCount: 1,
//                matchType: "arab",
//                searchLanguage: "arab",
//              })
//            }
//         })
//       }

//       // 2. LOGIKA UNTUK BAHASA INDONESIA / LATIN
//       // Jika hasil Arab kosong (atau memang input Indonesia)
//       if (results.length === 0) {
//         const fuseOptions = hasArabic
//           ? {
//               keys: [{ name: "arab", weight: 2 }, "latin", "terjemahan"],
//               threshold: 0.25,
//               includeScore: true,
//               ignoreLocation: true,
//               minMatchCharLength: 2,
//             }
//           : {
//               // --- PERBAIKAN PENTING DISINI ---
//               // Kita beri bobot SANGAT TINGGI pada terjemahan
//               keys: [
//                 { name: "terjemahan", weight: 3 }, // Weight 3 (Sangat Prioritas)
//                 { name: "tafsir", weight: 1.5 },
//                 { name: "latin", weight: 0.8 },    // Latin prioritas rendah
//               ],
//               threshold: 0.3, 
//               includeScore: true,
//               ignoreLocation: true,
//               minMatchCharLength: 3,
//             }

//         const fuse = new Fuse(surahData.verses, fuseOptions)
//         const fuseResults = fuse.search(cleanTerm)

//         fuseResults.forEach((result) => {
//           const score = result.score || 1
//           const threshold = hasArabic ? 0.3 : 0.4

//           if (score <= threshold) {
//             // Kita analisis tipe match-nya
//             const analysis = this.analyzeMatch(result.item, cleanTerm, hasArabic)

//             // Validasi: Hanya masukkan jika count > 0 (artinya benar-benar ketemu katanya)
//             if (analysis.count > 0) {
//               results.push({
//                 ayat: result.item,
//                 surahNumber: surahData.number,
//                 surahName: surahData.name.short,
//                 matchCount: analysis.count,
//                 matchType: analysis.type, // Ini penting untuk UI (Highlighting)
//                 searchLanguage: hasArabic ? "arab" : "indonesia",
//               })
//             }
//           }
//         })
//       }
//     } catch (err) {
//       console.error(`Error searching Surah ${surahData.number}:`, err)
//     }

//     return results
//   }

// // --- FUNGSI ANALISIS MATCH YANG DIPERBAIKI ---
//   private analyzeMatch(
//     ayat: Ayat, 
//     searchTerm: string, 
//     hasArabic: boolean
//   ): { count: number; type: "arab" | "latin" | "terjemahan" | "tafsir" } {
    
//     // 1. Jika Mode Arab
//     if (hasArabic) {
//       const count = (ayat.arab.match(new RegExp(searchTerm, "g")) || []).length
//       return { count, type: "arab" }
//     }

//     // 2. Jika Mode Indonesia (Latin)
//     // Kita buat regex yang tidak peduli huruf besar/kecil (Case Insensitive)
//     // Kita escape karakter spesial agar regex tidak error
//     const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//     const regex = new RegExp(escapedTerm, "gi");
    
//     // --- PRIORITAS PENGECEKAN (PENTING) ---
//     // Cek Terjemahan DULUAN!
//     const terjemahanMatches = (ayat.terjemahan.match(regex) || []).length
//     if (terjemahanMatches > 0) {
//       return { count: terjemahanMatches, type: "terjemahan" }
//     }

//     // Baru Cek Tafsir
//     const tafsirMatches = (ayat.tafsir.match(regex) || []).length
//     if (tafsirMatches > 0) {
//       return { count: tafsirMatches, type: "tafsir" }
//     }

//     // Terakhir baru Cek Latin (Transliterasi)
//     const latinMatches = (ayat.latin.match(regex) || []).length
//     if (latinMatches > 0) {
//       return { count: latinMatches, type: "latin" }
//     }

//     return { count: 0, type: "terjemahan" }
//   }

//   private async getSurahWithCache(surahNumber: number): Promise<SurahData> {
//     if (surahCache.has(surahNumber)) {
//       return surahCache.get(surahNumber)!
//     }

//     const user = import.meta.env.VITE_API_USERNAME || ""
//     const Authorization = import.meta.env.VITE_API_TOKEN || ""
//     const data = await fetchSurah(surahNumber, user, Authorization)
//     surahCache.set(surahNumber, data)
//     return data
//   }

//   // Public method for local search (within current surah)
//   async searchLocal(term: string, surahData: SurahData): Promise<FormattedSearchResult[]> {
//     if (!term.trim()) {
//       throw new Error("Search term cannot be empty")
//     }

//     const cleanTerm = this.normalizeTerm(term)
//     const hasArabic = this.hasArabic(term)

//     const results = await this.searchInSurah(surahData, cleanTerm, hasArabic)
//     results.sort((a, b) => b.matchCount - a.matchCount)

//     return results
//   }

//   // Public method for global search (across all 114 surahs - with parallel processing)
//   async searchGlobal(term: string): Promise<FormattedSearchResult[]> {
//     if (!term.trim()) {
//       throw new Error("Search term cannot be empty")
//     }

//     const cleanTerm = this.normalizeTerm(term)
//     const hasArabic = this.hasArabic(term)
//     const results: FormattedSearchResult[] = []

//     try {
//       const surahPromises = Array.from({ length: 114 }, (_, i) =>
//         this.getSurahWithCache(i + 1)
//           .then((surahData) => this.searchInSurah(surahData, cleanTerm, hasArabic))
//           .catch((err) => {
//             console.error(`Error fetching Surah ${i + 1}:`, err)
//             return []
//           }),
//       )

//       const surahResults = await Promise.all(surahPromises)
//       surahResults.forEach((res) => results.push(...res))

//       results.sort((a, b) => b.matchCount - a.matchCount)
//     } catch (error) {
//       console.error("Global search error:", error)
//       throw new Error("Terjadi kesalahan saat mencari di seluruh Al-Qur'an")
//     }

//     return results
//   }

//   // Clear cache if needed
//   clearCache(): void {
//     surahCache.clear()
//     normalizedTermCache.clear()
//   }
// }
