"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import Fuse from "fuse.js"
import { fetchSurah, type SurahData } from "@/services/QuranAPI"
import { HybridSearchEngine } from "@/services/hybrid-search"
import Header from "@/components/header"
import NavigationButtons from "@/components/NavigationButtons"
import AyatCard from "@/components/AyatCard"
import AyatPagination from "@/components/AyatPagination"
import Footer from "@/components/Footer"
import UnifiedSearchBar from "@/components/UnifiedSearchBar"
import SearchResultsModal from "@/components/SearchResultsModal"
import { Button } from "@/components/ui/button"
import { Home, ChevronLeft } from "lucide-react"

interface SearchResult {
  ayat: any
  surahNumber: number
  surahName: string
  matchCount: number
  matchType: "arab" | "latin" | "terjemahan" | "tafsir"
  searchLanguage: "arab" | "indonesia"
}

export default function App() {
  const { surahNumber } = useParams<{ surahNumber: string }>()
  const navigate = useNavigate()
  const [tafsirData, setTafsirData] = useState<SurahData | null>(null)
  const [currentAyat, setCurrentAyat] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchText, setSearchText] = useState<string>("")
  const [recognitionAvailable, setRecognitionAvailable] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  // const [allSurahData, setAllSurahData] = useState<Map<number, SurahData>>(new Map())
  const [hybridSearchEngine, setHybridSearchEngine] = useState<HybridSearchEngine | null>(null)

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setRecognitionAvailable(!!SpeechRecognition)
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const num = surahNumber ? Number.parseInt(surahNumber) : 67
        const data = await fetchSurah(num)
        setTafsirData(data)

        const hybridEngine = new HybridSearchEngine(data.verses)
        setHybridSearchEngine(hybridEngine)

        const targetAyat = sessionStorage.getItem("targetAyat")
        if (targetAyat) {
          const ayatNum = Number.parseInt(targetAyat)
          if (ayatNum >= 1 && ayatNum <= data.verses.length) {
            setCurrentAyat(ayatNum)
          }
          sessionStorage.removeItem("targetAyat")
        } else {
          setCurrentAyat(1)
        }
      } catch (err) {
        console.error(err)
        setError("Gagal memuat data dari API")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [surahNumber])

  const performGlobalSearch = async (term: string) => {
    if (!term.trim()) {
      alert("Masukkan kata kunci pencarian")
      return
    }

    const verseNumberMatch = term.match(/^(\d+)[:\s]+(\d+)$/)
    const singleVerseMatch = term.match(/^(\d+)$/)

    if (verseNumberMatch) {
      const surahNum = Number.parseInt(verseNumberMatch[1])
      const ayatNum = Number.parseInt(verseNumberMatch[2])

      if (surahNum < 1 || surahNum > 114) {
        alert("❌ Nomor Surah harus antara 1-114")
        return
      }

      if (ayatNum < 1 || ayatNum > 286) {
        alert("❌ Nomor Ayat harus antara 1-286")
        return
      }

      if (tafsirData && surahNum === tafsirData.number) {
        const verse = tafsirData.verses.find((v) => v.id === ayatNum)
        if (verse) {
          setCurrentAyat(ayatNum)
          setSearchText(term)
          alert(`✅ Ditemukan: Surah ${tafsirData.name.short} Ayat ${ayatNum}`)
          return
        } else {
          alert(`❌ Ayat ${ayatNum} tidak ditemukan di Surah ${tafsirData.name.short}`)
          return
        }
      } else {
        alert(`📖 Membuka Surah ${surahNum}, Ayat ${ayatNum}...`)
        navigate(`/surah/${surahNum}`)
        sessionStorage.setItem("targetAyat", ayatNum.toString())
        return
      }
    }

    if (singleVerseMatch && tafsirData) {
      const ayatNum = Number.parseInt(singleVerseMatch[1])

      if (ayatNum < 1 || ayatNum > 286) {
        alert("❌ Nomor Ayat harus antara 1-286")
        return
      }

      const verse = tafsirData.verses.find((v) => v.id === ayatNum)
      if (verse) {
        setCurrentAyat(ayatNum)
        setSearchText(term)
        alert(`✅ Ditemukan: Surah ${tafsirData.name.short} Ayat ${ayatNum}`)
        return
      } else {
        alert(
          `❌ Ayat ${ayatNum} tidak ditemukan di Surah ${tafsirData.name.short}. Surah ini hanya memiliki ${tafsirData.verses.length} ayat.`,
        )
        return
      }
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

    const results: SearchResult[] = []

    if (tafsirData && hybridSearchEngine) {
      console.log("[v0] Using hybrid search engine for query:", cleanTerm)
      const hybridResults = hybridSearchEngine.search(cleanTerm, 50)

      hybridResults.forEach((result) => {
        if (result.hybridScore >= 0.4) {
          results.push({
            ayat: result,
            surahNumber: tafsirData.number,
            surahName: tafsirData.name.short,
            matchCount: 1,
            matchType: "arab",
            searchLanguage: hasArabic ? "arab" : "indonesia",
          })
        }
      })
    }

    if (results.length === 0 && tafsirData) {
      console.log("[v0] Hybrid search returned no results, trying Fuse.js fallback")
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

      const fuse = new Fuse(tafsirData.verses, fuseOptions)
      const fuseResults = fuse.search(cleanTerm)

      fuseResults.forEach((result) => {
        const score = result.score || 1
        if (score <= 0.3) {
          const matchCount = countMatches(result.item, cleanTerm, hasArabic)
          if (matchCount > 0) {
            results.push({
              ayat: result.item,
              surahNumber: tafsirData.number,
              surahName: tafsirData.name.short,
              matchCount,
              matchType: "arab",
              searchLanguage: hasArabic ? "arab" : "indonesia",
            })
          }
        }
      })
    }

    if (results.length === 0 && tafsirData) {
      console.log("[v0] Fuse search returned no results, trying substring fallback")
      tafsirData.verses.forEach((ayat) => {
        let found = false
        let matchCount = 0

        if (hasArabic) {
          const arabicNormalized = ayat.arab.normalize("NFKC")
          const termNormalized = cleanTerm.normalize("NFKC")

          const arabicClean = arabicNormalized.replace(/[\u064B-\u065F]/g, "")
          const termClean = termNormalized.replace(/[\u064B-\u065F]/g, "")

          if (termClean.length >= 3 && arabicClean.includes(termClean)) {
            found = true
            const regex = new RegExp(termClean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
            const matches = arabicClean.match(regex)
            matchCount = matches ? matches.length : 1
          }
        } else {
          const text = (ayat.terjemahan + " " + ayat.latin + " " + (ayat.tafsir || "")).toLowerCase()
          const regex = new RegExp(`\\b${cleanTerm.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g")
          const matches = text.match(regex)
          if (matches) {
            found = true
            matchCount = matches.length
          }
        }

        if (found && matchCount > 0) {
          results.push({
            ayat,
            surahNumber: tafsirData.number,
            surahName: tafsirData.name.short,
            matchCount,
            matchType: "arab",
            searchLanguage: hasArabic ? "arab" : "indonesia",
          })
        }
      })
    }

    results.sort((a, b) => b.matchCount - a.matchCount)

    setSearchResults(results)
    setShowSearchResults(true)

    if (results.length === 0) {
      alert("Tidak ada hasil yang ditemukan")
    }
  }

  const countMatches = (ayat: any, searchTerm: string, hasArabic: boolean): number => {
    let count = 0
    const fields = hasArabic ? ["arab"] : ["terjemahan", "latin", "tafsir"]

    fields.forEach((field) => {
      const text = ayat[field] || ""
      const regex = hasArabic ? new RegExp(searchTerm, "g") : new RegExp(`\\b${searchTerm.toLowerCase()}\\b`, "gi")
      const matches = text.match(regex)
      count += matches ? matches.length : 0
    })

    return count
  }

  const performSearch = (term: string, isRecitation = false) => {
    if (!tafsirData || !term.trim()) {
      alert("Masukkan kata kunci pencarian")
      return
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

    console.log("[v0] Performing search for:", cleanTerm, "isRecitation:", isRecitation)
    performGlobalSearch(term)
    setSearchText(term)
  }

  const handleSelectSearchResult = (surahNum: number, ayatId: number) => {
    if (surahNum !== tafsirData?.number) {
      navigate(`/surah/${surahNum}`)
    }
    setCurrentAyat(ayatId)
  }

  const currentTafsir = tafsirData?.verses.find((ayat) => ayat.id === currentAyat)

  if (loading)
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-6"></div>
          <p className="text-muted-foreground text-lg">Memuat data...</p>
        </div>
      </div>
    )

  if (error)
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
            <Home className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-xl font-serif font-semibold text-destructive mb-4">{error}</p>
          <Button onClick={() => navigate("/")} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    )

  if (!tafsirData) return <div>Tidak ada data.</div>

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="gap-2 hover:bg-primary/10 hover:border-primary transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            Daftar Surah
          </Button>
        </div>

        <Header name={tafsirData?.name.long} transliteration={tafsirData?.name.transliteration.id} />

        <UnifiedSearchBar
          searchText={searchText}
          setSearchText={setSearchText}
          onSearch={performSearch}
          recognitionAvailable={recognitionAvailable}
        />

        <SearchResultsModal
          isOpen={showSearchResults}
          onClose={() => setShowSearchResults(false)}
          results={searchResults}
          searchTerm={searchText}
          onSelectResult={handleSelectSearchResult}
        />

        <NavigationButtons
          current={currentAyat}
          total={tafsirData.verses.length}
          onPrev={() => setCurrentAyat((c) => Math.max(1, c - 1))}
          onNext={() => setCurrentAyat((c) => Math.min(tafsirData.verses.length, c + 1))}
        />

        {currentTafsir && tafsirData && (
          <AyatCard
            {...currentTafsir}
            name={tafsirData?.name.short}
            transliteration={tafsirData?.name.transliteration.id}
            translation={tafsirData?.name.translation.id}
            searchTerm={searchText}
          />
        )}

        <AyatPagination total={tafsirData.verses.length} current={currentAyat} onSelect={setCurrentAyat} />

        <Footer name={tafsirData?.name.short} transliteration={tafsirData?.name.transliteration.id} />
      </div>
    </div>
  )
}
