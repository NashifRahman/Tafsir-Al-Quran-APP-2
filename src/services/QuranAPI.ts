export interface SuratName {
  long: string
  short: string
  transliteration: {
    id: string
  }
  translation: {
    id: string
  }
}

export interface Verse {
  number: {
    inSurah: number
  }
  text: {
    arab: string
    transliteration: {
      en: string
    }
  }
  translation: {
    id: string
  }
  tafsir: {
    id: {
      short: string
    }
  }
}

export interface Ayat {
  id: number
  arab: string
  latin: string
  terjemahan: string
  tafsir: string
}

export interface SurahData {
  number: number
  name: SuratName
  verses: Ayat[]
  numberOfVerses: number
  revelation: {
    arab: string
    en: string
    id: string
  }
}

export interface SurahListItem {
  number: number
  name: {
    short: string
    long: string
    transliteration: {
      id: string
    }
    translation: {
      id: string
    }
  }
  numberOfVerses: number
  revelation: {
    arab: string
    id: string
  }
}

// Fetch daftar semua surah
export async function fetchSurahList(): Promise<SurahListItem[]> {
  const res = await fetch("https://quran-api-id.vercel.app/surah")
  if (!res.ok) throw new Error(`HTTP Error ${res.status}`)
  const data = await res.json()
  return data.data || []
}

// Fetch surah berdasarkan nomor
export async function fetchSurah(surahNumber: number): Promise<SurahData> {
  const res = await fetch(`https://quran-api-id.vercel.app/surah/${surahNumber}`)
  if (!res.ok) throw new Error(`HTTP Error ${res.status}`)

  const data = await res.json()

  const NameData: SuratName = {
    long: data.data.name.long,
    short: data.data.name.short,
    transliteration: { id: data.data.name.transliteration.id },
    translation: { id: data.data.name.translation.id },
  }

  const verses = data.data?.verses
  if (!verses || !Array.isArray(verses)) {
    throw new Error("Struktur data API tidak valid")
  }

  const ayatList: Ayat[] = verses.map((verse: Verse) => ({
    id: verse.number.inSurah,
    arab: verse.text.arab,
    latin: verse.text.transliteration.en,
    terjemahan: verse.translation.id,
    tafsir: verse.tafsir.id.short,
  }))

  return {
    number: data.data.number,
    name: NameData,
    verses: ayatList,
    numberOfVerses: data.data.numberOfVerses,
    revelation: data.data.revelation,
  }
}

// Backward compatibility untuk Al-Mulk
export async function fetchAlMulk(): Promise<SurahData> {
  return fetchSurah(67)
}

import { HybridSearchEngine, type SearchResult } from "./hybrid-search"
import { EmbeddingService } from "./embedding-service"

let hybridSearchEngine: HybridSearchEngine | null = null
let allVerses: Ayat[] = []

export async function hybridSearchVerses(query: string, topK = 20): Promise<SearchResult[]> {
  // Initialize hybrid search engine if not already done
  if (!hybridSearchEngine || allVerses.length === 0) {
    // Fetch all verses from all surahs
    const surahList = await fetchSurahList()
    allVerses = []

    for (const surah of surahList) {
      const surahData = await fetchSurah(surah.number)
      allVerses = allVerses.concat(surahData.verses)
    }

    hybridSearchEngine = new HybridSearchEngine(allVerses, {
      bm25Weight: 0.5,
      semanticWeight: 0.5,
      minBM25Threshold: 0.05,
      minSemanticThreshold: 0.2,
    })

    // Index documents untuk vector database
    const embeddingService = EmbeddingService.getInstance()
    embeddingService.indexDocuments(allVerses)
  }

  try {
    const results = hybridSearchEngine.search(query, topK)

    if (results.length === 0) {
      console.log("[v0] No hybrid results, trying fallback search")
      return fallbackSearch(query, topK)
    }

    return results
  } catch (error) {
    console.error("[v0] Hybrid search error:", error)
    return fallbackSearch(query, topK)
  }
}

function fallbackSearch(query: string, topK = 20): SearchResult[] {
  const normalizedQuery = query.toLowerCase().normalize("NFKC")
  const results: SearchResult[] = []

  // Remove Arabic diacritics from query
  const cleanQuery = normalizedQuery.replace(/[\u064B-\u065F]/g, "")

  for (const verse of allVerses) {
    const arab = verse.arab.normalize("NFKC").replace(/[\u064B-\u065F]/g, "")
    const latin = verse.latin.toLowerCase()
    const terjemahan = verse.terjemahan.toLowerCase()

    let score = 0

    // Exact match in Arabic
    if (arab.includes(cleanQuery)) {
      score = 0.9
    }
    // Partial match in Arabic (at least 50% of query)
    else if (cleanQuery.length > 2) {
      const partialMatch = arab.includes(cleanQuery.substring(0, Math.ceil(cleanQuery.length / 2)))
      if (partialMatch) score = 0.7
    }

    // If no Arabic match, try Latin
    if (score === 0 && latin.includes(normalizedQuery)) {
      score = 0.6
    }

    // If no Latin match, try translation
    if (score === 0 && terjemahan.includes(normalizedQuery)) {
      score = 0.5
    }

    // Fuzzy matching for close matches
    if (score === 0 && cleanQuery.length > 3) {
      const arabWords = arab.split(/\s+/)
      for (const word of arabWords) {
        if (word.includes(cleanQuery.substring(0, 3))) {
          score = 0.4
          break
        }
      }
    }

    if (score > 0) {
      results.push({
        ...verse,
        bm25Score: score,
        semanticScore: 0,
        hybridScore: score,
        matchType: "keyword",
      })
    }
  }

  return results.sort((a, b) => b.hybridScore - a.hybridScore).slice(0, topK)
}

export function getSearchStats(): {
  totalVerses: number
  engineInitialized: boolean
  bm25Weight: number
  semanticWeight: number
} {
  return {
    totalVerses: allVerses.length,
    engineInitialized: hybridSearchEngine !== null,
    bm25Weight: hybridSearchEngine?.getConfig().bm25Weight || 0.6,
    semanticWeight: hybridSearchEngine?.getConfig().semanticWeight || 0.4,
  }
}

export function updateHybridSearchConfig(config: {
  bm25Weight?: number
  semanticWeight?: number
  minBM25Threshold?: number
  minSemanticThreshold?: number
}): void {
  if (hybridSearchEngine) {
    hybridSearchEngine.updateConfig(config)
  }
}