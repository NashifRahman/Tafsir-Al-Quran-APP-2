import Fuse from "fuse.js"

// ==========================================
// 1. Interfaces & Config
// ==========================================

export interface SearchResult {
  id: number
  globalId: number
  tafsirLong: string
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

export const DEFAULT_HYBRID_CONFIG: HybridSearchConfig = {
  bm25Weight: 0.7, 
  semanticWeight: 0.3,
  minBM25Threshold: 0.1, 
  minSemanticThreshold: 0.2,
}

// ==========================================
// 2. Normalization Logic
// ==========================================

function normalizeArabicText(text: string): string {
  if (!text) return ""
  let normalized = text.normalize("NFKD")
  // Hapus tanda baca/harakat arab
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

// Helper baru untuk normalisasi Latin agar pencarian lebih "kena"
function normalizeLatinText(text: string): string {
  if (!text) return ""
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"") // Hapus tanda baca umum
    .trim()
}

// ==========================================
// 3. BM25 / Keyword Search Engine (UPDATED)
// ==========================================

// ==========================================
// 3. BM25 / Keyword Search Engine (STRICTER ARABIC)
// ==========================================

export class BM25Search {
  private fuse: Fuse<Record<string, any>>
  private documents: Array<Record<string, any>>

  constructor(documents: Array<Record<string, any>>) {
    this.documents = documents

    const normalizedDocs = documents.map((doc) => ({
      ...doc,
      arab_normalized: normalizeArabicText(doc.arabClean || doc.arab || ""),
      latin_normalized: normalizeLatinText(doc.latin || ""),
      terjemahan_normalized: normalizeLatinText(doc.terjemahan || ""),
    }))

    this.fuse = new Fuse(normalizedDocs, {
      keys: [
        { name: "arab_normalized", weight: 0.8 }, // Naikkan weight Arab
        { name: "latin_normalized", weight: 0.2 }, 
        { name: "terjemahan_normalized", weight: 0.3 }, 
      ],
      // PERUBAHAN 1: Threshold diperketat (makin kecil makin ketat)
      // 0.12 terlalu longgar untuk Arab pendek. Kita turunkan ke 0.1
      // Namun kita akan menangani strictness utama di logic manual di bawah.
      threshold: 0.15, 
      minMatchCharLength: 2, 
      includeScore: true,
      ignoreLocation: true,
      useExtendedSearch: false,
      shouldSort: true,
    })
  }

  search(query: string): Array<{ item: Record<string, any>; score: number }> {
    const isArabicChar = /[\u0600-\u06FF]/.test(query);
    const normalizedQuery = isArabicChar ? normalizeArabicText(query) : normalizeLatinText(query);
    
    // Jika query kosong, kembalikan array kosong
    if (!normalizedQuery.trim()) return [];

    let results = this.fuse.search(normalizedQuery)

    return results
      .map((result) => {
        const doc = this.documents.find((d) => d.id === result.item.id) || result.item;
        
        // Base score dari Fuse (0 = best, 1 = worst) -> kita balik jadi (1 = best)
        let fuseScore = Math.max(0, 1 - (result.score || 0));
        let calculatedScore = fuseScore;

        // ============================================================
        // LOGIKA BARU: Strict Matching untuk Arab
        // ============================================================
        if (isArabicChar) {
            const docArabNorm = normalizeArabicText(doc.arabClean || doc.arab || "");
            const queryTokens = normalizedQuery.split(" ").filter(t => t.length > 0);
            
            // Cek 1: Apakah frasa query ada secara UTUH di dokumen?
            // Kita pakai regex boundary sederhana (spasi atau start/end string)
            // Ini mencegah "Al-Falah" match dengan "Al-Falaq" secara tidak sengaja hanya karena substring
            if (docArabNorm.includes(normalizedQuery)) {
                // Jangan langsung kasih 1.0. Cek rasio panjangnya.
                // Jika query sangat pendek (misal 2 huruf) tapi ayat panjang, jangan kasih 1.0 mutlak.
                if (normalizedQuery.length < 3) {
                    calculatedScore = 0.8; // Match pendek
                } else {
                    calculatedScore = 1.0; // Perfect match substring panjang
                }
            } else {
                // Cek 2: Token Overlap (Berapa banyak kata yang cocok)
                let matchedTokens = 0;
                queryTokens.forEach(token => {
                   if (docArabNorm.includes(token)) matchedTokens++;
                });

                const matchRatio = matchedTokens / queryTokens.length;

                // Jika rasio match kata tinggi (misal 100% kata ada, tapi urutan beda), beri skor tinggi
                if (matchRatio === 1) {
                    calculatedScore = 0.95; 
                } else if (matchRatio > 0.5) {
                    calculatedScore = 0.8 * matchRatio;
                } else {
                    // Penalti berat jika kata tidak lengkap
                    calculatedScore = fuseScore * 0.5; 
                }
            }

        } else {
             // Logic Latin (Tetap longgar agar typo-tolerant)
             const terjemahanNorm = normalizeLatinText(doc.terjemahan || "");
             const latinNorm = normalizeLatinText(doc.latin || "");
             
             if (terjemahanNorm.includes(normalizedQuery) || latinNorm.includes(normalizedQuery)) {
                 calculatedScore = Math.min(1.0, calculatedScore + 0.2); 
             }
        }

        return {
            item: doc,
            score: calculatedScore
        };
      })
      // PERUBAHAN 2: Filtering Strict
      .filter(res => {
          // Jika Arab, threshold harus sangat tinggi (sangat mirip)
          if (isArabicChar) return res.score > 0.75;
          // Jika Latin, boleh agak longgar
          return res.score > 0.4;
      })
  }
}

// ==========================================
// 4. Semantic / Vector Embedding Logic (TETAP SAMA)
// ==========================================

export class SentenceBERTEmbedding {
  private embeddingCache: Map<string, number[]> = new Map()

  generateEmbedding(text: string): number[] {
    // UPDATE: Gunakan normalisasi sederhana untuk embedding agar latin juga terproses
    // Sebelumnya hanya normalizeArabicText, yang mungkin tidak optimal untuk latin murni
    const isArabic = /[\u0600-\u06FF]/.test(text);
    const normalized = isArabic ? normalizeArabicText(text) : text.toLowerCase().trim();

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
      // Gabungkan semua teks agar embedding mencakup makna latin juga
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
// 5. Hybrid Engine (UPDATED)
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
    // Cek apakah query adalah bahasa Arab
    const isArabic = /[\u0600-\u06FF]/.test(query);
    
    // Logika: Jika Arab 1 kata -> Keyword only (karena biasanya user ingin exact ayat).
    // Jika Latin -> Selalu gunakan Semantic juga karena user mencari makna.
    const isLongArabic = isArabic && query.trim().split(/\s+/).length > 5;
    const useSemantic = !isArabic || !isLongArabic; 

    // 1. Keyword Search (BM25)
    const bm25Results = this.bm25.search(query)
    const bm25Map = new Map(bm25Results.map((r) => [r.item.id, r.score]))

    // 2. Semantic Search
    let semanticMap = new Map<number, number>()
    if (useSemantic) {
        // Ambil lebih banyak kandidat semantic untuk latin
        const semanticResults = this.vectorDb.semanticSearch(query, topK * 3)
        semanticMap = new Map(semanticResults.map((r) => [r.item.id, r.score]))
    }

    const combinedIds = new Set([...bm25Map.keys(), ...semanticMap.keys()])
    const hybridResults: SearchResult[] = []

    combinedIds.forEach((id) => {
      const bm25Score = bm25Map.get(id) || 0
      const semanticScore = semanticMap.get(id) || 0

      // Logic Hybrid Score
      let hybridScore = 0
      
      if (isArabic && !isLongArabic) {
        // Jika Arab pendek/sedang, percayakan penuh pada BM25 (Strict Keyword)
        hybridScore = bm25Score;
      } else {
        // ... logic latin (campuran) ...
        if (bm25Score >= this.config.minBM25Threshold) {
            hybridScore = bm25Score * 0.8 + semanticScore * 0.2
        } else if (semanticScore >= this.config.minSemanticThreshold) {
            hybridScore = semanticScore * 0.7 + bm25Score * 0.3
        }
      }

      // Filter Akhir
      if (hybridScore < 0.2) return // Turunkan sedikit threshold akhir untuk latin

      const document = this.documents.find((d) => d.id === id)
      if (document) {
        hybridResults.push({
          id: document.id,
          globalId: document.globalId,
          tafsirLong: document.tafsirLong,
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