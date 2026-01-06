"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchSurahList,
  fetchAllSurahData,
  type SurahListItem,
  // type SurahData,
} from "@/services/QuranAPI";
import Hero from "@/components/hero";
import {
  getSurahListFromFirebase,
  saveSurahListToFirebase,
  saveSurahDetailToFirebase,
  getAllSurahDetailsFromFirebase,
  // getAllSurahDetailsFromFirebase,
} from "@/utils/test";
import {
  cacheSurahDetail,
  cacheSurahList,
  getAllCachedSurahDetails,
} from "@/utils/idb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Sparkles } from "lucide-react";
import HomeSearchBar from "@/components/HomeSearchBar";
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
    const loadSurahData = async () => {
      const user = import.meta.env.VITE_API_USERNAME || "";
      const Authorization = import.meta.env.VITE_API_TOKEN || "";

      try {
        setLoading(true);

        // 1. Cek apakah LIST surah ada di Cache/Firebase?
        let currentList = await getSurahListFromFirebase(); // Asumsi ini cek IndexedDB/Firebase

        // 2. Cek apakah DETAIL surah sudah ada di IndexedDB?
        // Anda perlu membuat fungsi ini (lihat di bawah)
        let currentDetails = await getAllCachedSurahDetails();

        let firebaseDetails = await getAllSurahDetailsFromFirebase();

        // Jika List sudah ada, set ke state agar UI muncul duluan
        if (currentList) {
          setSurahList(currentList);
          setFilteredList(currentList);
          console.log("✅ Surah list loaded firebase.");
        }

        // 3. LOGIKA UTAMA: Jika DETAIL belum ada (atau kosong), baru Fetch API
        if (!currentDetails || currentDetails.length === 0) {
          console.log("⚠️ Detail kosong, mengambil dari API...");

          // Fetch dari API (List & Detail)
          const apiData = await fetchSurahList(user, Authorization);
          const apiDetail = await fetchAllSurahData(user, Authorization);

          // Sorting logic
          const sortedDetail = apiDetail.map((surah) => ({
            ...surah,
            verses: surah.verses.sort((a: any, b: any) => a.id - b.id),
          }));

          // Update State
          setSurahList(apiData);
          setFilteredList(apiData);

          // SIMPAN KE SEMUA TEMPAT
          // Kita pakai Promise.all agar jalan paralel (lebih cepat)
          if (firebaseDetails && firebaseDetails.length > 0) {
            await Promise.all([
              saveSurahListToFirebase(apiData), // Simpan List ke Firebase
              saveSurahDetailToFirebase(sortedDetail), // Simpan Detail ke Firebase
            ]);
          }
          await Promise.all([
            cacheSurahList(apiData), // Simpan List ke IndexedDB
            cacheSurahDetail(sortedDetail), // Simpan Detail ke IndexedDB (PENTING)
          ]);

          console.log("✅ Data berhasil didownload dan disimpan ke IndexedDB.");
        } else {
          console.log(
            "✅ Detail surah sudah lengkap di IndexedDB. Tidak perlu fetch API."
          );
        }
      } catch (err) {
        console.error("❌ Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSurahData();
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
          surah.nama.toLowerCase().includes(term) ||
          surah.arti.toLowerCase().includes(term) ||
          surah.id.toString().includes(term)
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
            <HomeSearchBar
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
              key={surah.id}
              className="cursor-pointer group overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1"
              onClick={() => navigate(`/surah/${surah.id}`)}
            >
              <CardHeader className="pb-4 bg-linear-to-br from-primary/5 to-transparent">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-full bg-linear-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-serif font-bold text-lg group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      {surah.id}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-serif group-hover:text-primary transition-colors duration-300">
                        {surah.nama}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {surah.arti}
                      </p>
                    </div>
                  </div>
                  <div className="text-3xl font-ArabFont text-primary/60 group-hover:text-primary transition-colors">
                    {surah.arabic}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-4 w-4 text-primary/60" />
                    <span className="font-medium">{surah.jmlAyat} Ayat</span>
                  </span>
                  <span className="px-3 py-1 bg-accent/20 text-amber-900 rounded-full text-xs font-medium">
                    {surah.kategori}
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
