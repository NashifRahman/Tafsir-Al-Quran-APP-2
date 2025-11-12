import Fuse from "fuse.js"

export interface SearchResult {
  id: number
  arab: string
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

export const DEFAULT_HYBRID_CONFIG: HybridSearchConfig = {
  bm25Weight: 0.6,
  semanticWeight: 0.4,
  minBM25Threshold: 0.01,
  minSemanticThreshold: 0.1,
}

function normalizeArabicText(text: string): string {
  if (!text) return ""

  let normalized = text.normalize("NFKD")
  normalized = normalized.replace(/[\u064B-\u065F]/g, "")
  normalized = normalized.replace(/[\u0640]/g, "")
  normalized = normalized.replace(/\s+/g, " ").trim()

  const arabicNormalizationMap: Record<string, string> = {
    ا: "ا",
    أ: "ا",
    إ: "ا",
    آ: "ا",
    ى: "ي",
    ئ: "ي",
    ة: "ه",
    ه: "ه",
    ء: "",
    و: "و",
    ؤ: "و",
    ﻻ: "لا",
    ﻼ: "لا",
    ﻹ: "لا",
    ﻺ: "لا",
  }

  let result = ""
  for (const char of normalized) {
    result += arabicNormalizationMap[char] || char
  }

  return result
}

function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = Array(len2 + 1)
    .fill(null)
    .map(() => Array(len1 + 1).fill(0))

  for (let i = 0; i <= len1; i++) matrix[0][i] = i
  for (let j = 0; j <= len2; j++) matrix[j][0] = j

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator)
    }
  }

  return matrix[len2][len1]
}

export class BM25Search {
  private fuse: Fuse<Record<string, any>>
  private documents: Array<Record<string, any>>
  private normalizedDocs: Array<Record<string, any>>

  constructor(documents: Array<Record<string, any>>) {
    this.documents = documents

    this.normalizedDocs = documents.map((doc) => ({
      ...doc,
      arab_normalized: normalizeArabicText(doc.arab || ""),
      latin_normalized: (doc.latin || "").toLowerCase(),
      terjemahan_normalized: (doc.terjemahan || "").toLowerCase(),
    }))

    this.fuse = new Fuse(this.normalizedDocs, {
      keys: [
        { name: "arab_normalized", weight: 0.8 },
        { name: "latin_normalized", weight: 0.1 },
        { name: "terjemahan_normalized", weight: 0.05 },
        { name: "tafsir", weight: 0.05 },
      ],
      threshold: 0.3,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
      useExtendedSearch: false,
      shouldSort: true,
    })
  }

  search(query: string): Array<{ item: Record<string, any>; score: number }> {
    const normalizedQuery = normalizeArabicText(query)

    let results = this.fuse.search(normalizedQuery)

    if (results.length === 0 && normalizedQuery.length > 3) {
      const partialQuery = normalizedQuery.substring(0, Math.ceil(normalizedQuery.length * 0.7))
      results = this.fuse.search(partialQuery)
    }

    return results.map((result) => ({
      item: this.documents.find((d) => d.id === result.item.id) || result.item,
      score: Math.max(0, 1 - (result.score || 0)),
    }))
  }
}

export class SentenceBERTEmbedding {
  private embeddingCache: Map<string, number[]> = new Map()

  generateEmbedding(text: string): number[] {
    const normalized = normalizeArabicText(text)

    if (this.embeddingCache.has(normalized)) {
      return this.embeddingCache.get(normalized)!
    }

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

    const wordFreq = new Map<string, number>()
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }

    for (const [word, freq] of wordFreq.entries()) {
      const freqIndex = (word.charCodeAt(0) * 11) % 384
      vector[freqIndex] += Math.log(freq + 1) * 0.5
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
    let dotProduct = 0
    let magnitude1 = 0
    let magnitude2 = 0

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
      magnitude1 += vec1[i] * vec1[i]
      magnitude2 += vec2[i] * vec2[i]
    }

    magnitude1 = Math.sqrt(magnitude1)
    magnitude2 = Math.sqrt(magnitude2)

    if (magnitude1 === 0 || magnitude2 === 0) return 0
    return dotProduct / (magnitude1 * magnitude2)
  }
}

export class VectorDatabase {
  private vectors: Map<number, number[]> = new Map()
  private documents: Map<number, Record<string, any>> = new Map()
  private embedding: SentenceBERTEmbedding

  constructor() {
    this.embedding = new SentenceBERTEmbedding()
  }

  indexDocuments(documents: Array<Record<string, any>>): void {
    documents.forEach((doc) => {
      const combinedText = `${doc.arab || ""} ${doc.latin || ""} ${doc.terjemahan || ""} ${doc.tafsir || ""}`
      const vector = this.embedding.generateEmbedding(combinedText)

      this.vectors.set(doc.id, vector)
      this.documents.set(doc.id, doc)
    })
  }

  semanticSearch(query: string, topK = 10): Array<{ item: Record<string, any>; score: number }> {
    const queryVector = this.embedding.generateEmbedding(query)
    const results: Array<{ id: number; score: number }> = []

    this.vectors.forEach((vector, docId) => {
      const similarity = this.embedding.cosineSimilarity(queryVector, vector)
      results.push({ id: docId, score: similarity })
    })

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((result) => ({
        item: this.documents.get(result.id)!,
        score: result.score,
      }))
  }

  clear(): void {
    this.vectors.clear()
    this.documents.clear()
  }
}

export class HybridSearchEngine {
  private bm25: BM25Search
  private vectorDb: VectorDatabase
  private config: HybridSearchConfig
  private documents: Array<Record<string, any>>

  constructor(documents: Array<Record<string, any>>, config: Partial<HybridSearchConfig> = {}) {
    this.documents = documents
    this.config = {
      bm25Weight: 0.7,
      semanticWeight: 0.3,
      minBM25Threshold: 0.3,
      minSemanticThreshold: 0.4,
      ...config,
    }
    this.bm25 = new BM25Search(documents)
    this.vectorDb = new VectorDatabase()
    this.vectorDb.indexDocuments(documents)
  }

  search(query: string, topK = 20): SearchResult[] {
    // console.log("[v0] Searching for:", query)

    const bm25Results = this.bm25.search(query)
    const bm25Map = new Map(bm25Results.map((r) => [r.item.id, r.score]))

    const semanticResults = this.vectorDb.semanticSearch(query, topK * 2)
    const semanticMap = new Map(semanticResults.map((r) => [r.item.id, r.score]))

    const combinedIds = new Set([...bm25Map.keys(), ...semanticMap.keys()])
    const hybridResults: SearchResult[] = []

    combinedIds.forEach((id) => {
      const bm25Score = bm25Map.get(id) || 0
      const semanticScore = semanticMap.get(id) || 0

      if (bm25Score < this.config.minBM25Threshold && semanticScore < this.config.minSemanticThreshold) {
        return
      }

      let hybridScore = 0
      if (bm25Score >= this.config.minBM25Threshold) {
        hybridScore = bm25Score * 0.9
      } else if (semanticScore >= this.config.minSemanticThreshold) {
        hybridScore = semanticScore * 0.5
      }

      if (hybridScore < 0.3) return

      const document = this.documents.find((d) => d.id === id)
      if (document && 'id' in document && 'arab' in document && 'latin' in document && 'terjemahan' in document && 'tafsir' in document) {
        hybridResults.push({
          id: document.id,
          arab: document.arab,
          latin: document.latin,
          terjemahan: document.terjemahan,
          tafsir: document.tafsir,
          bm25Score,
          semanticScore,
          hybridScore,
          matchType: bm25Score >= this.config.minBM25Threshold ? "keyword" : "semantic",
        })
      }
    })

    const sorted = hybridResults.sort((a, b) => b.hybridScore - a.hybridScore).slice(0, topK)
    // console.log("[v0] Found results:", sorted.length)
    return sorted
  }

  updateConfig(config: Partial<HybridSearchConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): HybridSearchConfig {
    return { ...this.config }
  }
}
