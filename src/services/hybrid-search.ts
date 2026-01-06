import Fuse from "fuse.js"

// ==========================================
// 1. Interfaces & Config
// ==========================================

export interface SearchResult {
  id: number
  arab: string
  arabClean?: string
  latin: string
  terjemahan: string
  tafsir: string
  bm25Score: number
  semanticScore: number
  hybridScore: number
  matchType: "keyword" | "semantic" | "both"
}

export interface HybridSearchConfig {
  bm25Weight: number
  semanticWeight: number
  minBM25Threshold: number
  minSemanticThreshold: number
}

// UPDATE: Konfigurasi default dilonggarkan
export const DEFAULT_HYBRID_CONFIG: HybridSearchConfig = {
  bm25Weight: 0.7, 
  semanticWeight: 0.3,
  minBM25Threshold: 0.1, 
  minSemanticThreshold: 0.2,
}

// ==========================================
// 2. Normalization Logic (TETAP SAMA)
// ==========================================

function normalizeArabicText(text: string): string {
  if (!text) return ""
  let normalized = text.normalize("NFKD")
  normalized = normalized.replace(/[\u064B-\u065F]/g, "") 
  normalized = normalized.replace(/[\u0670]/g, "")       
  normalized = normalized.replace(/[\u06D6-\u06ED]/g, "") 
  normalized = normalized.replace(/[\u0640]/g, "")       
  normalized = normalized.replace(/\s+/g, " ").trim()

  const arabicNormalizationMap: Record<string, string> = {
    ا: "ا", أ: "ا", إ: "ا", آ: "ا", ٱ: "ا",
    ى: "ي", ئ: "ي", ؤ: "و", ه: "ه",
    ك: "k", 
    ﻻ: "لا", ﻼ: "لا", ﻹ: "لا", ﻺ: "لا",
  }

  let result = ""
  for (const char of normalized) {
    const mapped = arabicNormalizationMap[char]
    if (mapped === "k") result += "ك"
    else result += mapped || char
  }

  return result
}

// ==========================================
// 3. BM25 / Keyword Search Engine (DILONGGARKAN)
// ==========================================

export class BM25Search {
  private fuse: Fuse<Record<string, any>>
  private documents: Array<Record<string, any>>
  private normalizedDocs: Array<Record<string, any>>

  constructor(documents: Array<Record<string, any>>) {
    this.documents = documents

    this.normalizedDocs = documents.map((doc) => ({
      ...doc,
      arab_normalized: normalizeArabicText(doc.arabClean || doc.arab || ""),
      latin_normalized: (doc.latin || "").toLowerCase(),
      terjemahan_normalized: (doc.terjemahan || "").toLowerCase(),
    }))

    this.fuse = new Fuse(this.normalizedDocs, {
      keys: [
        { name: "arab_normalized", weight: 0.9 },
        { name: "latin_normalized", weight: 0.1 },
        { name: "terjemahan_normalized", weight: 0.05 },
      ],
      // UPDATE PENTING 1: Threshold Dilonggarkan
      // 0.12 (Ketat) -> 0.35 (Moderat)
      // Ini mengizinkan fuzzy logic bekerja untuk typo 1-2 karakter.
      threshold: 0.35, 
      
      minMatchCharLength: 3, 
      includeScore: true,
      ignoreLocation: true,
      useExtendedSearch: false,
      shouldSort: true,
    })
  }

  search(query: string): Array<{ item: Record<string, any>; score: number }> {
    const normalizedQuery = normalizeArabicText(query)
    let results = this.fuse.search(normalizedQuery)

    return results
      .map((result) => {
        const doc = this.documents.find((d) => d.id === result.item.id) || result.item;
        const arabNorm = normalizeArabicText(doc.arabClean || doc.arab || "");
        
        // Konversi score Fuse (0 = bagus) ke score kita (1 = bagus)
        let calculatedScore = Math.max(0, 1 - (result.score || 0));

        // Exact Match Boost (Tetap dipertahankan untuk prioritas)
        if (arabNorm.includes(normalizedQuery)) {
            calculatedScore = 1.0; 
        }

        return {
            item: doc,
            score: calculatedScore
        };
      })
      // UPDATE PENTING 2: Filter Level BM25 Dilonggarkan
      // Sebelumnya > 0.7. Sekarang > 0.4.
      // Jika user typo, score mungkin turun ke 0.5 atau 0.6. 
      // Jika kita set 0.7, hasil typo akan hilang.
      .filter(res => res.score > 0.4) 
  }
}

// ==========================================
// 4. Semantic / Vector Embedding Logic (TETAP SAMA)
// ==========================================
// (Bagian SentenceBERTEmbedding dan VectorDatabase tidak perlu diubah 
// karena logic semantic sudah naturally "fuzzy" secara makna)

export class SentenceBERTEmbedding {
  private embeddingCache: Map<string, number[]> = new Map()

  generateEmbedding(text: string): number[] {
    const normalized = normalizeArabicText(text)
    if (this.embeddingCache.has(normalized)) return this.embeddingCache.get(normalized)!
    const vector = new Array(384).fill(0)
    const words = normalized.split(/\s+/).filter((w) => w.length > 0)
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const wordWeight = 1 / Math.log(i + 2)
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j)
        const index = (charCode * 7 + i * 31 + j * 13) % 384
        const charWeight = 1 / (j + 1)
        vector[index] += wordWeight * charWeight
      }
    }
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude
      }
    }
    this.embeddingCache.set(normalized, vector)
    return vector
  }

  cosineSimilarity(vec1: number[], vec2: number[]): number {
      let dotProduct = 0, mag1 = 0, mag2 = 0
      for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i]
        mag1 += vec1[i] * vec1[i]
        mag2 += vec2[i] * vec2[i]
      }
      mag1 = Math.sqrt(mag1); mag2 = Math.sqrt(mag2)
      if (mag1 === 0 || mag2 === 0) return 0
      return dotProduct / (mag1 * mag2)
  }
}

export class VectorDatabase {
  private vectors: Map<number, number[]> = new Map()
  private documents: Map<number, Record<string, any>> = new Map()
  private embedding: SentenceBERTEmbedding

  constructor() { this.embedding = new SentenceBERTEmbedding() }

  indexDocuments(documents: Array<Record<string, any>>): void {
    documents.forEach((doc) => {
      const arabicText = normalizeArabicText(doc.arabClean || doc.arab || "");
      const combinedText = `${arabicText} ${doc.latin || ""} ${doc.terjemahan || ""} ${doc.tafsir || ""}`
      this.vectors.set(doc.id, this.embedding.generateEmbedding(combinedText))
      this.documents.set(doc.id, doc)
    })
  }

  semanticSearch(query: string, topK = 10): Array<{ item: Record<string, any>; score: number }> {
    const queryVector = this.embedding.generateEmbedding(query)
    const results: Array<{ id: number; score: number }> = []
    this.vectors.forEach((vector, docId) => {
      results.push({ id: docId, score: this.embedding.cosineSimilarity(queryVector, vector) })
    })
    return results.sort((a, b) => b.score - a.score).slice(0, topK).map((r) => ({
        item: this.documents.get(r.id)!, score: r.score
    }))
  }
  clear(): void { this.vectors.clear(); this.documents.clear() }
}

// ==========================================
// 5. Hybrid Engine (DILONGGARKAN)
// ==========================================

export class HybridSearchEngine {
  private bm25: BM25Search
  private vectorDb: VectorDatabase
  private config: HybridSearchConfig
  private documents: Array<Record<string, any>>

  constructor(documents: Array<Record<string, any>>, config: Partial<HybridSearchConfig> = {}) {
    this.documents = documents
    this.config = { ...DEFAULT_HYBRID_CONFIG, ...config }
    this.bm25 = new BM25Search(documents)
    this.vectorDb = new VectorDatabase()
    this.vectorDb.indexDocuments(documents)
  }

  search(query: string, topK = 20): SearchResult[] {
    const isSingleWordArabic = /^[ \u0600-\u06FF]+$/.test(query) && query.trim().split(/\s+/).length <= 1;
    const useSemantic = !isSingleWordArabic; 

    // 1. Keyword Search
    const bm25Results = this.bm25.search(query)
    const bm25Map = new Map(bm25Results.map((r) => [r.item.id, r.score]))

    // 2. Semantic Search
    let semanticMap = new Map<number, number>()
    if (useSemantic) {
        const semanticResults = this.vectorDb.semanticSearch(query, topK * 2)
        semanticMap = new Map(semanticResults.map((r) => [r.item.id, r.score]))
    }

    const combinedIds = new Set([...bm25Map.keys(), ...semanticMap.keys()])
    const hybridResults: SearchResult[] = []

    combinedIds.forEach((id) => {
      const bm25Score = bm25Map.get(id) || 0
      const semanticScore = semanticMap.get(id) || 0

      // Logic Hybrid
      let hybridScore = 0
      
      if (isSingleWordArabic) {
        // Mode 1 Kata: Percaya Keyword (sekarang sudah lebih toleran typo)
        hybridScore = bm25Score;
      } else {
        // Mode Kalimat
        if (bm25Score >= this.config.minBM25Threshold) {
            hybridScore = bm25Score * 0.9 
        } else if (semanticScore >= this.config.minSemanticThreshold) {
            hybridScore = semanticScore * 0.5
        }
      }

      // UPDATE PENTING 3: Filter Akhir (Final Gatekeeper) Dilonggarkan
      // Sebelumnya 0.65. Sekarang 0.45.
      // Alasannya: Jika user typo, bm25Score mungkin hanya 0.5.
      // Jika gatekeeper 0.65, hasil pencarian user akan kosong (0 result).
      // Angka 0.45 adalah batas aman untuk "agak mirip".
      if (hybridScore < 0.45) return

      const document = this.documents.find((d) => d.id === id)
      if (document) {
        hybridResults.push({
          id: document.id,
          arab: document.arab,
          arabClean: document.arabClean,
          latin: document.latin,
          terjemahan: document.terjemahan,
          tafsir: document.tafsir,
          bm25Score,
          semanticScore,
          hybridScore,
          matchType: bm25Score >= semanticScore ? "keyword" : "semantic",
        })
      }
    })

    return hybridResults
        .sort((a, b) => b.hybridScore - a.hybridScore)
        .slice(0, topK)
  }
}