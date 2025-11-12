import type { SearchResult } from "@/services/hybrid-search"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { calculateSearchMetrics, groupResultsByMatchType } from "@/utils/search-utils"

interface HybridSearchResultsProps {
  results: SearchResult[]
  query: string
  isLoading?: boolean
  executionTime?: number
}

export default function HybridSearchResults({
  results,
  query,
  isLoading = false,
  executionTime = 0,
}: HybridSearchResultsProps) {
  const metrics = calculateSearchMetrics(results, executionTime)
  const grouped = groupResultsByMatchType(results)

  const getMatchTypeBadge = (matchType: "keyword" | "semantic" | "both") => {
    switch (matchType) {
      case "keyword":
        return <Badge className="bg-blue-500">Keyword Match</Badge>
      case "semantic":
        return <Badge className="bg-purple-500">Semantic Match</Badge>
      case "both":
        return <Badge className="bg-green-500">Hybrid Match</Badge>
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600"
    if (score >= 0.6) return "text-yellow-600"
    if (score >= 0.4) return "text-orange-600"
    return "text-red-600"
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">Tidak ada hasil ditemukan untuk "{query}"</p>
        <p className="text-sm text-gray-400 mt-2">Coba dengan kata kunci yang berbeda</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Metrics */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Hasil</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.totalResults}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Keyword Matches</p>
            <p className="text-2xl font-bold text-blue-600">{metrics.keywordMatches}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Semantic Matches</p>
            <p className="text-2xl font-bold text-purple-600">{metrics.semanticMatches}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Waktu Eksekusi</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.executionTime}ms</p>
          </div>
        </div>
      </Card>

      {/* Results by Match Type */}
      {grouped.both.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-green-700">Hybrid Matches (Keyword + Semantic)</h3>
          <div className="space-y-3">
            {grouped.both.map((result) => (
              <ResultCard key={result.id} result={result} getScoreColor={getScoreColor} />
            ))}
          </div>
        </div>
      )}

      {grouped.keyword.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-blue-700">Keyword Matches</h3>
          <div className="space-y-3">
            {grouped.keyword.map((result) => (
              <ResultCard key={result.id} result={result} getScoreColor={getScoreColor} />
            ))}
          </div>
        </div>
      )}

      {grouped.semantic.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-purple-700">Semantic Matches</h3>
          <div className="space-y-3">
            {grouped.semantic.map((result) => (
              <ResultCard key={result.id} result={result} getScoreColor={getScoreColor} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface ResultCardProps {
  result: SearchResult
  getScoreColor: (score: number) => string
}

function ResultCard({ result, getScoreColor }: ResultCardProps) {
  const matchTypeLabel = {
    keyword: "Keyword Match",
    semantic: "Semantic Match",
    both: "Hybrid Match",
  }

  const matchTypeColor = {
    keyword: "bg-blue-100 text-blue-800",
    semantic: "bg-purple-100 text-purple-800",
    both: "bg-green-100 text-green-800",
  }

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">Ayat #{result.id}</p>
          <p className="text-lg font-semibold text-right mb-2" dir="rtl">
            {result.arab}
          </p>
          <p className="text-sm text-gray-700 mb-2">{result.latin}</p>
        </div>
        <Badge className={matchTypeColor[result.matchType]}>{matchTypeLabel[result.matchType]}</Badge>
      </div>

      <div className="bg-gray-50 p-3 rounded mb-3">
        <p className="text-sm text-gray-700">{result.terjemahan}</p>
      </div>

      {result.tafsir && (
        <div className="bg-blue-50 p-3 rounded mb-3 border-l-4 border-blue-300">
          <p className="text-xs font-semibold text-blue-900 mb-1">Tafsir:</p>
          <p className="text-sm text-blue-800 line-clamp-2">{result.tafsir}</p>
        </div>
      )}

      {/* Score Breakdown */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="bg-gray-100 p-2 rounded">
          <p className="text-gray-600 text-xs">BM25 Score</p>
          <p className={`font-bold ${getScoreColor(result.bm25Score)}`}>{(result.bm25Score * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-gray-100 p-2 rounded">
          <p className="text-gray-600 text-xs">Semantic Score</p>
          <p className={`font-bold ${getScoreColor(result.semanticScore)}`}>
            {(result.semanticScore * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gray-100 p-2 rounded">
          <p className="text-gray-600 text-xs">Hybrid Score</p>
          <p className={`font-bold ${getScoreColor(result.hybridScore)}`}>{(result.hybridScore * 100).toFixed(1)}%</p>
        </div>
      </div>
    </Card>
  )
}
