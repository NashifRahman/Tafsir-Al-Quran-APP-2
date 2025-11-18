"use client";

import { useState, useEffect, useRef } from "react";
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
// import NavigationButtons from "@/components/NavigationButtons";
// import AyatCard from "@/components/AyatCard";
import AyatPopup from "@/components/DetailedCard"; // 👈 [EDIT] UNCOMMENT INI
// import AyatPagination from "@/components/AyatPagination";
import Footer from "@/components/Footer";
import UnifiedSearchBar from "@/components/UnifiedSearchBar";
import SearchResultsModal from "@/components/SearchResultsModal";
import { Button } from "@/components/ui/button";
import { Home, ChevronLeft } from "lucide-react";
import AyatDisplay from "@/components/ayatdisplay";

interface SearchResult {
  ayat: any;
  surahNumber: number;
  surahName: string;
  matchCount: number;
  matchType: "arab" | "latin" | "terjemahan" | "tafsir";
  searchLanguage: "arab" | "indonesia";
}

// Definisikan tipe untuk ayat, agar lebih aman daripada 'any'
interface Verse {
  id: number;
  arab: string;
  latin: string;
  terjemahan: string;
  tafsir: string; // Pastikan tipe SurahData Anda memiliki ini
  // tambahkan properti lain jika ada
}

export default function App() {
  const { surahNumber } = useParams<{ surahNumber: string }>();
  const navigate = useNavigate();
  const [tafsirData, setTafsirData] = useState<SurahData | null>(null);
  const [currentAyat, setCurrentAyat] = useState<number>(1);
  const [highlightedAyat, setHighlightedAyat] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [recognitionAvailable, setRecognitionAvailable] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // 👇 [EDIT] UNCOMMENT STATE INI
  const [selectedAyat, setSelectedAyat] = useState<Verse | null>(null);
  const [showAyatPopup, setShowAyatPopup] = useState(false);
  
  // const [allSurahData, setAllSurahData] = useState<Map<number, SurahData>>(new Map())
  const [, setHybridSearchEngine] = useState<HybridSearchEngine | null>(null);

  const ayatRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setRecognitionAvailable(!!SpeechRecognition);
  }, []);

  const highlightAyat = (ayatNumber: number) => {
    setHighlightedAyat(ayatNumber);
    setCurrentAyat(ayatNumber);
    setTimeout(() => {
      setHighlightedAyat(null);
      setCurrentAyat(null as any);
    }, 2000);
  };

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
          if (ayatNum >= 1 && ayatNum <= data.verses.length) {
            setTimeout(() => {
              highlightAyat(ayatNum);
            }, 100);
          }
          sessionStorage.removeItem("targetAyat");
        } else {
          highlightAyat(1);
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

  // Scroll otomatis ke ayat aktif
  useEffect(() => {
    const el = ayatRefs.current.get(currentAyat);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentAyat]);

  // 🔍 Pencarian Global
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

    // 🔹 Jika hanya angka tunggal → lompat ke ayat tertentu di surah saat ini
    const singleNum = parseInt(term);
    if (!isNaN(singleNum) && !term.includes(",")) {
      if (
        tafsirData &&
        singleNum >= 1 &&
        singleNum <= tafsirData.verses.length
      ) {
        highlightAyat(singleNum);
        setShowSearchResults(false);
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

  // 🔎 Pencarian utama (dengan integrasi nomor ayat & surah)
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
   sessionStorage.setItem("targetAyat", ayatId.toString())
   navigate(`/surah/${surahNum}`)
   return
  // setSelectedAyat(ayatObj) // Ini adalah logika lama Anda
  // setShowAyatPopup(true)   // yang sekarang kita gunakan untuk tombol detail

  // if (surahNum !== tafsirData?.number) {
  // }

  // setCurrentAyat(ayatId)
}

  // 👇 [EDIT] TAMBAHKAN DUA FUNGSI INI
  // Fungsi untuk membuka popup
  const handleShowDetail = (ayat: Verse) => {
    setSelectedAyat(ayat);
    setShowAyatPopup(true);
  };

  // Fungsi untuk menutup popup
  const handleClosePopup = () => {
    setShowAyatPopup(false);
    setSelectedAyat(null);
  };


  // const currentTafsir = tafsirData?.verses.find(
  //   (ayat) => ayat.id === currentAyat
  // );

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
    <div className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="gap-2 bg-white border-white hover:bg-white hover:border-white hover:text-primary transition-all"
          >
            <ChevronLeft className="h-2 w-2 " />
            Daftar Surah
          </Button>
        </div>

        <UnifiedSearchBar
          searchText={searchText}
          setSearchText={setSearchText}
          onSearch={performSearch}
          recognitionAvailable={recognitionAvailable}
        />

        <Header
          name={tafsirData?.name.long}
          transliteration={tafsirData?.name.transliteration.id}
          numberOfVerses={tafsirData?.numberOfVerses}
          revelation={tafsirData?.revelation.id}
        />

        <SearchResultsModal
          isOpen={showSearchResults}
          onClose={() => setShowSearchResults(false)}
          results={searchResults}
          searchTerm={searchText}
          onSelectResult={handleSelectSearchResult}
        />

        {/* 👇 [EDIT] TAMBAHKAN RENDER POPUP DI SINI */}
        <AyatPopup
          isOpen={showAyatPopup}
          onClose={handleClosePopup}
          ayat={selectedAyat}
          surahName={tafsirData.name.short}
          transliteration={tafsirData.name.transliteration.id}
          translation={tafsirData.name.translation.id}
          // Anda mungkin perlu menambahkan data terjemahan surah di sini
          // translation={tafsirData.name.translation.id} 
        />

        <div>
          {tafsirData.verses.map((ayat) => (
            <div
              key={ayat.id}
              ref={(el) => el && ayatRefs.current.set(ayat.id, el)}
            >
              <AyatDisplay
                number={ayat.id}
                arab={ayat.arab}
                translation={ayat.terjemahan}
                transliteration={ayat.latin}
                // KIRIMKAN STATUS HIGHLIGHT KE KOMPONEN ANAK
                isHighlighted={ayat.id === highlightedAyat}
                // 👇 [EDIT] TAMBAHKAN PROP INI
                onDetail={() => handleShowDetail(ayat as Verse)}
              />
            </div>
          ))}
        </div>

        <Footer
          name={tafsirData?.name.short}
          transliteration={tafsirData?.name.transliteration.id}
        />
      </div>
    </div>
  );
}