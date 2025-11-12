"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { highlightText, renderHighlightedText } from "@/utils/highlightText"
import type { Ayat } from "@/services/QuranAPI"

interface SearchResult {
  ayat: Ayat
  surahNumber: number
  surahName: string
  matchCount: number
  matchType: "arab" | "latin" | "terjemahan" | "tafsir"
  searchLanguage: "arab" | "indonesia"
}

interface SearchResultsModalProps {
  isOpen: boolean
  onClose: () => void
  results: SearchResult[]
  searchTerm: string
  onSelectResult: (surahNumber: number, ayatId: number) => void
}

export default function SearchResultsModal({
  isOpen,
  onClose,
  results,
  searchTerm,
  onSelectResult,
}: SearchResultsModalProps) {
  if (!isOpen || results.length === 0) return null

  const getMatchMessage = (result: SearchResult) => {
    if (result.searchLanguage === "arab") {
      return `Kata ditemukan ${result.matchCount} kali di ayat ini`
    } else {
      return `Kata ditemukan ${result.matchCount} kali di terjemahan/tafsir`
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-background border-b p-4 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Hasil Pencarian</h2>
            <p className="text-sm text-muted-foreground">
              Ditemukan {results.length} hasil untuk "{searchTerm}"
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Results */}
        <div className="overflow-y-auto flex-1 p-6 space-y-8">
          {results.map((result, index) => (
            <div key={`${result.surahNumber}-${result.ayat.id}-${index}`}>
              <div className="space-y-4 bg-accent/10 rounded-xl p-5 shadow-sm">
                {/* Surah Info */}
                <div className="border-b pb-3">
                  <p className="text-sm text-muted-foreground mb-1">Surah</p>
                  <p className="text-lg font-semibold">{result.surahName}</p>
                  <p className="text-sm text-muted-foreground">Ayat {result.ayat.id}</p>
                </div>

                {/* Arabic Text */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Teks Arab</p>
                  <div className="bg-accent/30 p-4 rounded-lg text-right text-xl leading-relaxed font-serif">
                    {renderHighlightedText(highlightText(result.ayat.arab, searchTerm))}
                  </div>
                </div>

                {/* Latin Text */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Transliterasi</p>
                  <div className="bg-accent/30 p-4 rounded-lg text-sm leading-relaxed">
                    {renderHighlightedText(highlightText(result.ayat.latin, searchTerm))}
                  </div>
                </div>

                {/* Translation */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Terjemahan</p>
                  <div className="bg-accent/30 p-4 rounded-lg text-sm leading-relaxed">
                    {renderHighlightedText(highlightText(result.ayat.terjemahan, searchTerm))}
                  </div>
                </div>

                {/* Tafsir */}
                {result.ayat.tafsir && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Tafsir</p>
                    <div className="bg-accent/30 p-4 rounded-lg text-sm leading-relaxed">
                      {renderHighlightedText(highlightText(result.ayat.tafsir, searchTerm))}
                    </div>
                  </div>
                )}

                {/* Match Count */}
                <div className="bg-primary/10 p-3 rounded-lg text-sm">
                  <p className="text-primary font-medium">{getMatchMessage(result)}</p>
                </div>

                {/* Action Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      onSelectResult(result.surahNumber, result.ayat.id)
                      onClose()
                    }}
                    className="gap-2 bg-green-500 hover:bg-green-600 text-gray-700 hover:text-white"
                  >
                    Buka Ayat Ini
                  </Button>
                </div>
              </div>

              {/* Divider Garis Panjang */}
              {index < results.length - 1 && (
                <hr className="border-t-2 border-muted my-6 w-full" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-background border-t p-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  )
}