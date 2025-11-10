"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
// import Fuse from "fuse.js";
import { fetchSurah, type SurahData } from "@/services/QuranAPI";
import {
  getCachedSurahByNumber,
  getAllCachedSurahDetails,
  cacheSurahDetail,
} from "@/utils/idb";
import { HybridSearchEngine } from "@/services/hybrid-search";
import Header from "@/components/header";
import NavigationButtons from "@/components/NavigationButtons";
import AyatCard from "@/components/AyatCard";
import AyatPagination from "@/components/AyatPagination";
import Footer from "@/components/Footer";
import UnifiedSearchBar from "@/components/UnifiedSearchBar";
import SearchResultsModal from "@/components/SearchResultsModal";
import { Button } from "@/components/ui/button";
import { Home, ChevronLeft } from "lucide-react";

interface SearchResult {
  ayat: any;
  surahNumber: number;
  surahName: string;
  matchCount: number;
  matchType: "arab" | "latin" | "terjemahan" | "tafsir";
  searchLanguage: "arab" | "indonesia";
}

export default function App() {
  const { surahNumber } = useParams<{ surahNumber: string }>();
  const navigate = useNavigate();
  const [tafsirData, setTafsirData] = useState<SurahData | null>(null);
  const [currentAyat, setCurrentAyat] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [recognitionAvailable, setRecognitionAvailable] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  // const [allSurahData, setAllSurahData] = useState<Map<number, SurahData>>(new Map())
  const [hybridSearchEngine, setHybridSearchEngine] =
    useState<HybridSearchEngine | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setRecognitionAvailable(!!SpeechRecognition);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const num = surahNumber ? Number.parseInt(surahNumber) : 67;

        // --- Ambil dari cache dulu ---
        let data = await getCachedSurahByNumber(num);

        if (!data) {
          console.warn(`⚠️ Surah ${num} tidak ada di cache, ambil dari API`);
          data = await fetchSurah(num);

          // Simpan hasil API ke cache
          await cacheSurahDetail([data]);
        } else {
          console.log(`✅ Surah ${num} diambil dari IndexedDB`);
        }

        setTafsirData(data);
        const hybridEngine = new HybridSearchEngine(data.verses);
        setHybridSearchEngine(hybridEngine);

        const targetAyat = sessionStorage.getItem("targetAyat");
        if (targetAyat) {
          const ayatNum = Number.parseInt(targetAyat);
          if (ayatNum >= 1 && ayatNum <= data.verses.length)
            setCurrentAyat(ayatNum);
          sessionStorage.removeItem("targetAyat");
        } else {
          setCurrentAyat(1);
        }
      } catch (err) {
        console.error(err);
        setError("Gagal memuat data dari cache atau API");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [surahNumber]);

  const performGlobalSearch = async (term: string) => {
  if (!term.trim()) {
    alert("Masukkan kata kunci pencarian")
    return
  }

  // Ambil semua surah dari cache
  const allSurah = await getAllCachedSurahDetails()

  if (!allSurah || allSurah.length === 0) {
    alert("Cache kosong. Silakan buka beberapa surah terlebih dahulu agar data tersimpan.")
    return
  }

  const hasArabic = /[\u0600-\u06FF]/.test(term)
  const cleanTerm = hasArabic
    ? term.trim().normalize("NFKC")
    : term.toLowerCase().trim().replace(/[^\p{L}\p{N}\s]/gu, "").normalize("NFKC")

  const results: SearchResult[] = []

  for (const surah of allSurah) {
    const hybrid = new HybridSearchEngine(surah.verses)
    const found = hybrid.search(cleanTerm, 50)
    found.forEach((res) => {
      if (res.hybridScore >= 0.4) {
        results.push({
          ayat: res,
          surahNumber: surah.number,
          surahName: surah.name.short,
          matchCount: 1,
          matchType: "arab",
          searchLanguage: hasArabic ? "arab" : "indonesia",
        })
      }
    })
  }

  results.sort((a, b) => b.matchCount - a.matchCount)
  setSearchResults(results)
  setShowSearchResults(true)

  if (results.length === 0) alert("Tidak ada hasil yang ditemukan di cache IndexedDB")
}
;

  // const countMatches = (
  //   ayat: any,
  //   searchTerm: string,
  //   hasArabic: boolean
  // ): number => {
  //   let count = 0;
  //   const fields = hasArabic ? ["arab"] : ["terjemahan", "latin", "tafsir"];

  //   fields.forEach((field) => {
  //     const text = ayat[field] || "";
  //     const regex = hasArabic
  //       ? new RegExp(searchTerm, "g")
  //       : new RegExp(`\\b${searchTerm.toLowerCase()}\\b`, "gi");
  //     const matches = text.match(regex);
  //     count += matches ? matches.length : 0;
  //   });

  //   return count;
  // };

  const performSearch = (term: string, isRecitation = false) => {
    if (!tafsirData || !term.trim()) {
      alert("Masukkan kata kunci pencarian");
      return;
    }

    const hasArabic = /[\u0600-\u06FF]/.test(term);

    let cleanTerm: string;
    if (hasArabic) {
      cleanTerm = term.trim().normalize("NFKC");
    } else {
      cleanTerm = term
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .normalize("NFKC");
    }

    console.log(
      "[v0] Performing search for:",
      cleanTerm,
      "isRecitation:",
      isRecitation
    );
    performGlobalSearch(term);
    setSearchText(term);
  };

  const handleSelectSearchResult = (surahNum: number, ayatId: number) => {
    if (surahNum !== tafsirData?.number) {
      navigate(`/surah/${surahNum}`);
    }
    setCurrentAyat(ayatId);
  };

  const currentTafsir = tafsirData?.verses.find(
    (ayat) => ayat.id === currentAyat
  );

  if (loading)
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-6"></div>
          <p className="text-muted-foreground text-lg">Memuat data...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
            <Home className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-xl font-serif font-semibold text-destructive mb-4">
            {error}
          </p>
          <Button onClick={() => navigate("/")} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );

  if (!tafsirData) return <div>Tidak ada data.</div>;

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

        <Header
          name={tafsirData?.name.long}
          transliteration={tafsirData?.name.transliteration.id}
        />

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
          onNext={() =>
            setCurrentAyat((c) => Math.min(tafsirData.verses.length, c + 1))
          }
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

        <AyatPagination
          total={tafsirData.verses.length}
          current={currentAyat}
          onSelect={setCurrentAyat}
        />

        <Footer
          name={tafsirData?.name.short}
          transliteration={tafsirData?.name.transliteration.id}
        />
      </div>
    </div>
  );
}
