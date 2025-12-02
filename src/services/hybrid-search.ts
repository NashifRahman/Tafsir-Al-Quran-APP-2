import Fuse from "fuse.js";

// 1. Update Interface agar TypeScript tahu ada arabClean
export interface SearchResult {
  id: number;
  arab: string;
  arabClean?: string; // <--- Tambahkan ini
  latin: string;
  terjemahan: string;
  tafsir: string;
  bm25Score: number;
  semanticScore: number;
  hybridScore: number;
  matchType: "keyword" | "semantic" | "both";
}

export interface HybridSearchConfig {
  bm25Weight: number;
  semanticWeight: number;
  minBM25Threshold: number;
  minSemanticThreshold: number;
}

export const DEFAULT_HYBRID_CONFIG: HybridSearchConfig = {
  bm25Weight: 0.6,
  semanticWeight: 0.4,
  minBM25Threshold: 0.01,
  minSemanticThreshold: 0.1,
};

// Fungsi normalisasi tetap disimpan untuk menormalisasi QUERY (input user)
function normalizeArabicText(text: string): string {
  if (!text) return "";
  let normalized = text.normalize("NFKD");
  normalized = normalized.replace(/[\u064B-\u065F]/g, ""); // Hapus harakat
  normalized = normalized.replace(/[\u0640]/g, ""); // Hapus tatwil
  normalized = normalized.replace(/\s+/g, " ").trim();

  const arabicNormalizationMap: Record<string, string> = {
    ا: "ا",
    أ: "ا",
    إ: "ا",
    آ: "ا",
    ى: "ي",
    ئ: "ي", // Penanganan Ya
    ة: "ه",
    ه: "ه", // Ta Marbuta dianggap Ha agar pencarian lebih luas tapi tetap relevan
    ء: "",
    و: "و",
    ؤ: "و",
    ﻻ: "لا",
    ﻼ: "لا",
    ﻹ: "لا",
    ﻺ: "لا",
  };

  let result = "";
  for (const char of normalized) {
    result += arabicNormalizationMap[char] || char;
  }
  return result;
}

export class BM25Search {
  private fuse: Fuse<Record<string, any>>;
  private documents: Array<Record<string, any>>;
  private normalizedDocs: Array<Record<string, any>>;

  constructor(documents: Array<Record<string, any>>) {
    this.documents = documents;

    this.normalizedDocs = documents.map((doc) => ({
      ...doc,
      // Prioritas: arabClean dari DB > arab normalisasi manual
      arab_normalized: doc.arabClean || normalizeArabicText(doc.arab || ""),
      latin_normalized: (doc.latin || "").toLowerCase(),
      terjemahan_normalized: (doc.terjemahan || "").toLowerCase(),
    }));

    this.fuse = new Fuse(this.normalizedDocs, {
      keys: [
        // Bobot Arab SANGAT dominan
        { name: "arab_normalized", weight: 0.8 },
        { name: "latin_normalized", weight: 0.15 },
        { name: "terjemahan_normalized", weight: 0.05 },
        // Tafsir dibuang dari kunci pencarian utama agar tidak noisy,
        // kecuali Anda memang ingin mencari konten tafsir.
      ],
      // PERUBAHAN PENTING DISINI:
      // Threshold 0.3 -> 0.18 (Lebih ketat. Harus sangat mirip baru muncul)
      threshold: 0.1,

      // Min match 2 -> 3 (Minimal 3 huruf harus cocok, mengurangi match sampah)
      minMatchCharLength: 3,

      includeScore: true,
      ignoreLocation: true,
      useExtendedSearch: false,
      shouldSort: true,
    });
  }

  search(query: string): Array<{ item: Record<string, any>; score: number }> {
    const normalizedQuery = normalizeArabicText(query);

    // Jika query sangat pendek (misal 2 huruf), kita perketat threshold secara dinamis
    // agar tidak muncul hasil aneh.
    const isShortQuery = normalizedQuery.length <= 3;

    // Jika perlu, kita bisa override opsi search saat runtime,
    // tapi Fuse.js v6 basic search tidak support override threshold per call dengan mudah.
    // Jadi kita filter hasilnya manual di bawah.

    let results = this.fuse.search(normalizedQuery);

    // Fallback: Jika tidak ketemu dan query panjang, coba potong dikit (fuzzy)
    // Tapi untuk query pendek JANGAN dipotong.
    if (results.length === 0 && normalizedQuery.length > 4) {
      const partialQuery = normalizedQuery.substring(
        0,
        Math.ceil(normalizedQuery.length * 0.8)
      );
      results = this.fuse.search(partialQuery);
    }

    // Mapping score Fuse (0 = perfect, 1 = bad) ke score kita (1 = perfect, 0 = bad)
    return (
      results
        .map((result) => ({
          item:
            this.documents.find((d) => d.id === result.item.id) || result.item,
          score: Math.max(0, 1 - (result.score || 0)),
        }))
        // Filter tambahan: Jika query pendek, buang yang score-nya jelek
        .filter((res) => (isShortQuery ? res.score > 0.85 : true))
    );
  }
}

export class SentenceBERTEmbedding {
  private embeddingCache: Map<string, number[]> = new Map();

  generateEmbedding(text: string): number[] {
    // Pastikan text yang masuk ke sini juga dinormalisasi
    const normalized = normalizeArabicText(text);

    if (this.embeddingCache.has(normalized)) {
      return this.embeddingCache.get(normalized)!;
    }

    // ... (Logic matematika embedding tetap sama) ...
    const vector = new Array(384).fill(0);
    const words = normalized.split(/\s+/).filter((w) => w.length > 0);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordWeight = 1 / Math.log(i + 2);

      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j);
        const index = (charCode * 7 + i * 31 + j * 13) % 384;
        const charWeight = 1 / (j + 1);
        vector[index] += wordWeight * charWeight;
      }
    }

    const wordFreq = new Map<string, number>();
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    for (const [word, freq] of wordFreq.entries()) {
      const freqIndex = (word.charCodeAt(0) * 11) % 384;
      vector[freqIndex] += Math.log(freq + 1) * 0.5;
    }

    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    this.embeddingCache.set(normalized, vector);
    return vector;
  }

  cosineSimilarity(vec1: number[], vec2: number[]): number {
    // ... (tetap sama) ...
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }
}

export class VectorDatabase {
  private vectors: Map<number, number[]> = new Map();
  private documents: Map<number, Record<string, any>> = new Map();
  private embedding: SentenceBERTEmbedding;

  constructor() {
    this.embedding = new SentenceBERTEmbedding();
  }

  indexDocuments(documents: Array<Record<string, any>>): void {
    documents.forEach((doc) => {
      // PERBAIKAN 2: Gunakan arabClean untuk semantic vector!
      // Ini penting agar query "alhamdulillah" (gundul) vector-nya mirip dengan dokumen ini.
      const arabicText = doc.arabClean || doc.arab || "";

      const combinedText = `${arabicText} ${doc.latin || ""} ${
        doc.terjemahan || ""
      } ${doc.tafsir || ""}`;
      const vector = this.embedding.generateEmbedding(combinedText);

      this.vectors.set(doc.id, vector);
      this.documents.set(doc.id, doc);
    });
  }

  semanticSearch(
    query: string,
    topK = 10
  ): Array<{ item: Record<string, any>; score: number }> {
    // Query sudah pasti dinormalisasi di dalam generateEmbedding
    const queryVector = this.embedding.generateEmbedding(query);
    const results: Array<{ id: number; score: number }> = [];

    this.vectors.forEach((vector, docId) => {
      const similarity = this.embedding.cosineSimilarity(queryVector, vector);
      results.push({ id: docId, score: similarity });
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((result) => ({
        item: this.documents.get(result.id)!,
        score: result.score,
      }));
  }

  clear(): void {
    this.vectors.clear();
    this.documents.clear();
  }
}

export class HybridSearchEngine {
  private bm25: BM25Search;
  private vectorDb: VectorDatabase;
  private config: HybridSearchConfig;
  private documents: Array<Record<string, any>>;

  constructor(
    documents: Array<Record<string, any>>,
    config: Partial<HybridSearchConfig> = {}
  ) {
    this.documents = documents;
    this.config = {
      bm25Weight: 0.7,
      semanticWeight: 0.3,
      minBM25Threshold: 0.3,
      minSemanticThreshold: 0.4,
      ...config,
    };
    this.bm25 = new BM25Search(documents);
    this.vectorDb = new VectorDatabase();
    this.vectorDb.indexDocuments(documents);
  }

  search(query: string, topK = 20): SearchResult[] {
    // Deteksi apakah user mengetik satu kata pendek (Pencarian Kata)
    // atau kalimat panjang (Pencarian Konsep/Makna).
    const isSingleWordArabic =
      /^[ \u0600-\u06FF]+$/.test(query) && query.split(" ").length <= 1;

    // STRATEGI BARU:
    // Jika user cari 1 kata arab (misal: "musibah"), kita MATIKAN semantic search.
    // Karena semantic search akan mencari "konsep musibah" (bisa lari ke "ujian", "azab", dll).
    // User ingin "tulisan/bacaan yang sama", jadi murni Keyword Search (BM25).
    const useSemantic = !isSingleWordArabic;

    // 1. Jalankan BM25 (Keyword)
    const bm25Results = this.bm25.search(query);
    const bm25Map = new Map(bm25Results.map((r) => [r.item.id, r.score]));

    // 2. Jalankan Semantic (Hanya jika bukan single word search)
    let semanticMap = new Map<number, number>();
    if (useSemantic) {
      const semanticResults = this.vectorDb.semanticSearch(query, topK * 2);
      semanticMap = new Map(semanticResults.map((r) => [r.item.id, r.score]));
    }

    const combinedIds = new Set([...bm25Map.keys(), ...semanticMap.keys()]);
    const hybridResults: SearchResult[] = [];

    combinedIds.forEach((id) => {
      const bm25Score = bm25Map.get(id) || 0;
      const semanticScore = semanticMap.get(id) || 0;

      // Ambang batas ketat
      if (
        bm25Score < this.config.minBM25Threshold &&
        semanticScore < this.config.minSemanticThreshold
      ) {
        return;
      }

      let hybridScore = 0;

      if (isSingleWordArabic) {
        // Jika pencarian 1 kata, 100% percaya pada BM25
        hybridScore = bm25Score;
      } else {
        // Jika kalimat, gunakan bobot hybrid normal
        if (bm25Score >= this.config.minBM25Threshold) {
          hybridScore = bm25Score * 0.9; // Keyword priority
        } else if (semanticScore >= this.config.minSemanticThreshold) {
          hybridScore = semanticScore * 0.5;
        }
      }

      // Filter akhir: Score harus cukup tinggi
      if (hybridScore < 0.4) return;

      const document = this.documents.find((d) => d.id === id);
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
        });
      }
    });

    // Sort dan return
    return hybridResults
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, topK);
  }

  // ... methods updateConfig dll ...
  updateConfig(config: Partial<HybridSearchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): HybridSearchConfig {
    return { ...this.config };
  }
}
