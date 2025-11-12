"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchSurahList,
  fetchAllSurahData,
  type SurahListItem,
  type SurahData,
} from "@/services/QuranAPI";
import Hero from "@/components/hero";
import {
  getCachedSurahList,
  cacheSurahList,
  cacheSurahDetail,
  getAllCachedSurahDetails,
  // getCachedSurahByNumber,
} from "@/utils/idb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {  BookOpen, Sparkles } from "lucide-react";
import UnifiedSearchBar from "@/components/UnifiedSearchBar";
import SearchResultsModal from "@/components/SearchResultsModal";
import { HybridSearchEngine } from "@/services/hybrid-search";

interface SearchResult {
  ayat: any;
  surahNumber: number;
  surahName: string;
  matchCount: number;
  matchType: "arab" | "latin" | "terjemahan" | "tafsir";
  searchLanguage: "arab" | "indonesia";
}

export default function SurahList() {
  const [surahList, setSurahList] = useState<SurahListItem[]>([]);
  const [FilteredList, setFilteredList] = useState<SurahListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [recognitionAvailable, setRecognitionAvailable] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setRecognitionAvailable(!!SpeechRecognition);
  }, []);

  useEffect(() => {
    const loadSurahList = async () => {
      let data: SurahListItem[] | null = null;
      let detail: SurahData[] | null = null;

      try {
        const cachedData = await getCachedSurahList();
        if (cachedData) {
          data = cachedData;
          setSurahList(data);
          setFilteredList(data);
          setLoading(false);
          console.log("✅ Surah list loaded from cache.");
        }
      } catch (err) {
        console.error("⚠️ Error loading from IndexedDB:", err);
      }

      if (!data && !detail) {
        try {
          const apiData = await fetchSurahList();
          const apiDetail = await fetchAllSurahData();
          data = apiData;
          detail = apiDetail;
          setSurahList(data);
          await cacheSurahList(data);
          await cacheSurahDetail(detail);
          console.log("✅ Surah list fetched from API and cached.");
        } catch (err) {
          console.error("❌ Error fetching surah list:", err);
        } finally {
          if (loading) setLoading(false);
        }
      }
    };
    loadSurahList();
  }, []);

  //logika pencarian surat
  useEffect(() => {
    // ... (Logika filter tetap sama)
    if (searchText === "") {
      setFilteredList(surahList);
    } else {
      const filtered = surahList.filter((surah) => {
        const term = searchText.toLowerCase();
        return (
          surah.name.transliteration.id.toLowerCase().includes(term) ||
          surah.name.translation.id.toLowerCase().includes(term) ||
          surah.number.toString().includes(term)
        );
      });
      setFilteredList(filtered);
    }
  }, [searchText, surahList]);

  const performGlobalSearch = async (term: string) => {
    if (!term.trim()) {
      alert("Masukkan kata kunci pencarian");
      return;
    }

    // 🔹 Jika formatnya angka seperti "1,7" → langsung buka surah dan ayat tertentu
    const numPattern = /^(\d+)\s*,\s*(\d+)$/;
    const match = term.match(numPattern);
    if (match) {
      const surahNum = parseInt(match[1]);
      const ayatNum = parseInt(match[2]);
      if (!isNaN(surahNum) && !isNaN(ayatNum)) {
        sessionStorage.setItem("targetAyat", ayatNum.toString());
        navigate(`/surah/${surahNum}`);
        return;
      }
    }

    // 🔹 Lanjutkan pencarian teks seperti biasa
    const allSurah = await getAllCachedSurahDetails();

    if (!allSurah || allSurah.length === 0) {
      alert(
        "Cache kosong. Silakan buka beberapa surah terlebih dahulu agar data tersimpan."
      );
      return;
    }

    const hasArabic = /[\u0600-\u06FF]/.test(term);
    const cleanTerm = hasArabic
      ? term.trim().normalize("NFKC")
      : term
          .toLowerCase()
          .trim()
          .replace(/[^\p{L}\p{N}\s]/gu, "")
          .normalize("NFKC");

    const results: SearchResult[] = [];

    for (const surah of allSurah) {
      const hybrid = new HybridSearchEngine(surah.verses);
      const found = hybrid.search(cleanTerm, 50);
      found.forEach((res) => {
        if (res.hybridScore >= 0.4) {
          results.push({
            ayat: res,
            surahNumber: surah.number,
            surahName: surah.name.short,
            matchCount: 1,
            matchType: "arab",
            searchLanguage: hasArabic ? "arab" : "indonesia",
          });
        }
      });
    }

    results.sort((a, b) => b.matchCount - a.matchCount);
    setSearchResults(results);
    setShowSearchResults(true);

    if (results.length === 0)
      alert("Tidak ada hasil yang ditemukan di cache IndexedDB");
  };

  const performSearch = (term: string, isRecitation = false) => {
    if (!term.trim()) {
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
      "[v1] Performing search for:",
      cleanTerm,
      "isRecitation:",
      isRecitation
    );
    performGlobalSearch(term);
    setSearchText(term);
  };

  const handleSelectSearchResult = (surahNum: number, ayatId: number) => {
    sessionStorage.setItem("targetAyat", ayatId.toString());
    navigate(`/surah/${surahNum}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-6"></div>
          <p className="text-muted-foreground text-lg">
            Memuat daftar surah...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12">
          <Hero />
          <div className="mb-8 max-w- mx-auto">
            <UnifiedSearchBar
              searchText={searchText}
              setSearchText={setSearchText}
              onSearch={performSearch}
              recognitionAvailable={recognitionAvailable}
            />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {FilteredList.map((surah) => (
            <Card
              key={surah.number}
              className="cursor-pointer group overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1"
              onClick={() => navigate(`/surah/${surah.number}`)}
            >
              <CardHeader className="pb-4 bg-linear-to-br from-primary/5 to-transparent">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-full bg-linear-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-serif font-bold text-lg group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      {surah.number}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-serif group-hover:text-primary transition-colors duration-300">
                        {surah.name.transliteration.id}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {surah.name.translation.id}
                      </p>
                    </div>
                  </div>
                  <div className="text-3xl font-Amiri text-primary/60 group-hover:text-primary transition-colors">
                    {surah.name.short}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-4 w-4 text-primary/60" />
                    <span className="font-medium">
                      {surah.numberOfVerses} Ayat
                    </span>
                  </span>
                  <span className="px-3 py-1 bg-accent/20 text-amber-900 rounded-full text-xs font-medium">
                    {surah.revelation.id}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <SearchResultsModal
          isOpen={showSearchResults}
          onClose={() => setShowSearchResults(false)}
          results={searchResults}
          searchTerm={searchText}
          onSelectResult={handleSelectSearchResult}
        />

        <footer className="text-center pt-12 border-t border-border/50">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              Klik surah untuk membaca ayat, tafsir, dan pencarian suara
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
