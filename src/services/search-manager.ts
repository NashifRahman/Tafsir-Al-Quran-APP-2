import Fuse from "fuse.js"
import { fetchSurah, type SurahData, type Ayat } from "./QuranAPI"
import { HybridSearchEngine } from "./hybrid-search"

export interface SearchQuery {
  term: string
  isGlobal: boolean
}

export interface FormattedSearchResult {
  ayat: Ayat
  surahNumber: number
  surahName: string
  matchCount: number
  matchType: "arab" | "latin" | "terjemahan" | "tafsir"
  searchLanguage: "arab" | "indonesia"
}

// Cache for normalized search terms and surah data
const surahCache = new Map<number, SurahData>()
const normalizedTermCache = new Map<string, string>()

export class SearchManager {
  private static instance: SearchManager

  private constructor() {}

  static getInstance(): SearchManager {
    if (!SearchManager.instance) {
      SearchManager.instance = new SearchManager()
    }
    return SearchManager.instance
  }

  private normalizeTerm(term: string): string {
    const cacheKey = `norm_${term}`
    if (normalizedTermCache.has(cacheKey)) {
      return normalizedTermCache.get(cacheKey)!
    }

    const hasArabic = /[\u0600-\u06FF]/.test(term)
    let cleanTerm: string

    if (hasArabic) {
      cleanTerm = term.trim().normalize("NFKC")
    } else {
      cleanTerm = term
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .normalize("NFKC")
    }

    normalizedTermCache.set(cacheKey, cleanTerm)
    return cleanTerm
  }

  private hasArabic(text: string): boolean {
    return /[\u0600-\u06FF]/.test(text)
  }

  private async searchInSurah(
    surahData: SurahData,
    cleanTerm: string,
    hasArabic: boolean,
  ): Promise<FormattedSearchResult[]> {
    const results: FormattedSearchResult[] = []

    try {
      const hybridEngine = new HybridSearchEngine(surahData.verses)
      const hybridResults = hybridEngine.search(cleanTerm, 50)

      hybridResults.forEach((result) => {
        if (result.hybridScore >= 0.4) {
          results.push({
            ayat: result,
            surahNumber: surahData.number,
            surahName: surahData.name.short,
            matchCount: 1,
            matchType: "arab",
            searchLanguage: hasArabic ? "arab" : "indonesia",
          })
        }
      })

      // Fallback to Fuse.js if no hybrid results
      if (results.length === 0) {
        const fuseOptions = hasArabic
          ? {
              keys: [{ name: "arab", weight: 2 }, "latin", "terjemahan"],
              threshold: 0.25,
              includeScore: true,
              ignoreLocation: true,
              minMatchCharLength: 2,
            }
          : {
              keys: ["terjemahan", "latin", "tafsir"],
              threshold: 0.3,
              includeScore: true,
              ignoreLocation: true,
              minMatchCharLength: 2,
            }

        const fuse = new Fuse(surahData.verses, fuseOptions)
        const fuseResults = fuse.search(cleanTerm)

        fuseResults.forEach((result) => {
          const score = result.score || 1
          if (score <= 0.3) {
            const matchCount = this.countMatches(result.item, cleanTerm, hasArabic)
            if (matchCount > 0) {
              results.push({
                ayat: result.item,
                surahNumber: surahData.number,
                surahName: surahData.name.short,
                matchCount,
                matchType: "arab",
                searchLanguage: hasArabic ? "arab" : "indonesia",
              })
            }
          }
        })
      }
    } catch (err) {
      console.error(`Error searching Surah ${surahData.number}:`, err)
    }

    return results
  }

  private countMatches(ayat: Ayat, searchTerm: string, hasArabic: boolean): number {
    let count = 0
    const fields = hasArabic ? ["arab"] : ["terjemahan", "latin", "tafsir"]

    fields.forEach((field) => {
      const text = ayat[field as keyof Ayat] || ""
      const regex = hasArabic ? new RegExp(searchTerm, "g") : new RegExp(`\\b${searchTerm.toLowerCase()}\\b`, "gi")
      const matches = String(text).match(regex)
      count += matches ? matches.length : 0
    })

    return count
  }

  private async getSurahWithCache(surahNumber: number): Promise<SurahData> {
    if (surahCache.has(surahNumber)) {
      return surahCache.get(surahNumber)!
    }

    const data = await fetchSurah(surahNumber)
    surahCache.set(surahNumber, data)
    return data
  }

  // Public method for local search (within current surah)
  async searchLocal(term: string, surahData: SurahData): Promise<FormattedSearchResult[]> {
    if (!term.trim()) {
      throw new Error("Search term cannot be empty")
    }

    const cleanTerm = this.normalizeTerm(term)
    const hasArabic = this.hasArabic(term)

    const results = await this.searchInSurah(surahData, cleanTerm, hasArabic)
    results.sort((a, b) => b.matchCount - a.matchCount)

    return results
  }

  // Public method for global search (across all 114 surahs - with parallel processing)
  async searchGlobal(term: string): Promise<FormattedSearchResult[]> {
    if (!term.trim()) {
      throw new Error("Search term cannot be empty")
    }

    const cleanTerm = this.normalizeTerm(term)
    const hasArabic = this.hasArabic(term)
    const results: FormattedSearchResult[] = []

    try {
      const surahPromises = Array.from({ length: 114 }, (_, i) =>
        this.getSurahWithCache(i + 1)
          .then((surahData) => this.searchInSurah(surahData, cleanTerm, hasArabic))
          .catch((err) => {
            console.error(`Error fetching Surah ${i + 1}:`, err)
            return []
          }),
      )

      const surahResults = await Promise.all(surahPromises)
      surahResults.forEach((res) => results.push(...res))

      results.sort((a, b) => b.matchCount - a.matchCount)
    } catch (error) {
      console.error("Global search error:", error)
      throw new Error("Terjadi kesalahan saat mencari di seluruh Al-Qur'an")
    }

    return results
  }

  // Clear cache if needed
  clearCache(): void {
    surahCache.clear()
    normalizedTermCache.clear()
  }
}
