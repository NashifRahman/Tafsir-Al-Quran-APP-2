import type { SearchResult } from "@/services/hybrid-search"

export interface SearchMetrics {
  totalResults: number
  keywordMatches: number
  semanticMatches: number
  hybridMatches: number
  averageBM25Score: number
  averageSemanticScore: number
  averageHybridScore: number
  executionTime: number
}

export function calculateSearchMetrics(results: SearchResult[], executionTime: number): SearchMetrics {
  const keywordMatches = results.filter((r) => r.matchType === "keyword").length
  const semanticMatches = results.filter((r) => r.matchType === "semantic").length
  const hybridMatches = results.filter((r) => r.matchType === "both").length

  const averageBM25Score = results.length > 0 ? results.reduce((sum, r) => sum + r.bm25Score, 0) / results.length : 0
  const averageSemanticScore =
    results.length > 0 ? results.reduce((sum, r) => sum + r.semanticScore, 0) / results.length : 0
  const averageHybridScore =
    results.length > 0 ? results.reduce((sum, r) => sum + r.hybridScore, 0) / results.length : 0

  return {
    totalResults: results.length,
    keywordMatches,
    semanticMatches,
    hybridMatches,
    averageBM25Score: Math.round(averageBM25Score * 100) / 100,
    averageSemanticScore: Math.round(averageSemanticScore * 100) / 100,
    averageHybridScore: Math.round(averageHybridScore * 100) / 100,
    executionTime,
  }
}

export function formatSearchResult(result: SearchResult): {
  id: number
  arab: string
  latin: string
  terjemahan: string
  tafsir: string
  scores: {
    bm25: string
    semantic: string
    hybrid: string
  }
  matchType: string
} {
  return {
    id: result.id,
    arab: result.arab,
    latin: result.latin,
    terjemahan: result.terjemahan,
    tafsir: result.tafsir,
    scores: {
      bm25: (Math.round(result.bm25Score * 100) / 100).toFixed(2),
      semantic: (Math.round(result.semanticScore * 100) / 100).toFixed(2),
      hybrid: (Math.round(result.hybridScore * 100) / 100).toFixed(2),
    },
    matchType: result.matchType,
  }
}

export function groupResultsByMatchType(results: SearchResult[]): {
  keyword: SearchResult[]
  semantic: SearchResult[]
  both: SearchResult[]
} {
  return {
    keyword: results.filter((r) => r.matchType === "keyword"),
    semantic: results.filter((r) => r.matchType === "semantic"),
    both: results.filter((r) => r.matchType === "both"),
  }
}

export function filterResultsByScore(
  results: SearchResult[],
  minHybridScore = 0.3,
  minBM25Score = 0,
  minSemanticScore = 0,
): SearchResult[] {
  return results.filter(
    (r) => r.hybridScore >= minHybridScore || (r.bm25Score >= minBM25Score && r.semanticScore >= minSemanticScore),
  )
}

export function rankResultsByRelevance(results: SearchResult[]): SearchResult[] {
  return [...results].sort((a, b) => {
    // Prioritize hybrid matches (both keyword and semantic)
    if (a.matchType === "both" && b.matchType !== "both") return -1
    if (a.matchType !== "both" && b.matchType === "both") return 1

    // Then sort by hybrid score
    return b.hybridScore - a.hybridScore
  })
}

export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<number>()
  return results.filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })
}
