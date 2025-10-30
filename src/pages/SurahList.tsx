"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { fetchSurahList, type SurahListItem } from "@/services/QuranAPI"
import { getCachedSurahList, cacheSurahList } from "@/utils/idb" // 👈 Import fungsi IndexedDB
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, BookOpen, Sparkles } from "lucide-react"

export default function SurahList() {
  const [surahList, setSurahList] = useState<SurahListItem[]>([])
  const [filteredList, setFilteredList] = useState<SurahListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    const loadSurahList = async () => {
      let data: SurahListItem[] | null = null

      // 1. Coba ambil dari Cache (IndexedDB)
      try {
        const cachedData = await getCachedSurahList()
        if (cachedData) {
          data = cachedData
          setSurahList(data)
          setFilteredList(data)
          setLoading(false) // Tampilkan data cache tanpa menunggu API
          console.log("Data loaded from cache.")
        }
      } catch (err) {
        console.error("Error loading from IndexedDB:", err)
        // Lanjutkan ke pengambilan API jika DB gagal
      }

      // 2. Ambil dari API jika cache kosong atau error
      if (!data) {
        try {
          const apiData = await fetchSurahList()
          data = apiData
          setSurahList(data)
          setFilteredList(data)
          
          // 3. Simpan ke Cache (IndexedDB)
          await cacheSurahList(data)
          console.log("Data loaded from API and cached.")
          
        } catch (err) {
          console.error("Error fetching surah list from API:", err)
        } finally {
          // Hanya set loading false di sini jika belum di-set oleh cache
          if (loading) setLoading(false)
        }
      }
      
      // Jika data berhasil dimuat (dari cache atau API) dan loading masih true, set false
      if (loading) setLoading(false)

    }
    loadSurahList()
  }, []) // Dependensi kosong, hanya dijalankan sekali saat mount

  useEffect(() => {
    // ... (Logika filter tetap sama)
    if (searchTerm === "") {
      setFilteredList(surahList)
    } else {
      const filtered = surahList.filter((surah) => {
        const term = searchTerm.toLowerCase()
        return (
          surah.name.transliteration.id.toLowerCase().includes(term) ||
          surah.name.translation.id.toLowerCase().includes(term) ||
          surah.number.toString().includes(term)
        )
      })
      setFilteredList(filtered)
    }
  }, [searchTerm, surahList])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-6"></div>
          <p className="text-muted-foreground text-lg">Memuat daftar surah...</p>
        </div>
      </div>
    )
  }

  // ... (Sisa JSX tetap sama)
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-full">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-5xl sm:text-6xl font-serif font-bold text-foreground">القرآن الكريم</h1>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif text-primary mb-3">Daftar Surah Al-Qur'an</h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Jelajahi 114 Surah dengan Tafsir Mendalam & Pencarian Ayat Cerdas
          </p>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="h-1 w-12 bg-primary rounded-full"></div>
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="h-1 w-12 bg-primary rounded-full"></div>
          </div>
        </header>

        <div className="mb-12 max-w-2xl mx-auto">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-card rounded-lg border border-border p-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Cari surah berdasarkan nama atau nomor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-3 bg-transparent border-0 text-base focus:outline-none focus:ring-0"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredList.map((surah) => (
            <Card
              key={surah.number}
              className="cursor-pointer group overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1"
              onClick={() => navigate(`/surah/${surah.number}`)}
            >
              <CardHeader className="pb-4 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-serif font-bold text-lg group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      {surah.number}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-serif group-hover:text-primary transition-colors duration-300">
                        {surah.name.transliteration.id}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{surah.name.translation.id}</p>
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
                    <span className="font-medium">{surah.numberOfVerses} Ayat</span>
                  </span>
                  <span className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-xs font-medium">
                    {surah.revelation.id}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredList.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
              <Search className="h-10 w-10 text-muted-foreground opacity-50" />
            </div>
            <p className="text-muted-foreground text-lg font-medium">Tidak ada surah yang cocok</p>
            <p className="text-muted-foreground text-sm mt-2">Coba cari dengan nama atau nomor surah lain</p>
          </div>
        )}

        <footer className="text-center pt-12 border-t border-border/50">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">Klik surah untuk membaca ayat, tafsir, dan pencarian suara</p>
          </div>
        </footer>
      </div>
    </div>
  )
}