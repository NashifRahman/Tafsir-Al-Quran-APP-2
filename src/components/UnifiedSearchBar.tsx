"use client"

import { useState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Search } from "lucide-react"

interface UnifiedSearchBarProps {
  searchText: string
  setSearchText: (text: string) => void
  onSearch: (text: string, isRecitation: boolean) => void
  recognitionAvailable: boolean
}

export default function UnifiedSearchBar({
  searchText,
  setSearchText,
  onSearch,
  recognitionAvailable,
}: UnifiedSearchBarProps) {
  const [isListening, setIsListening] = useState(false)
  const [detectedMode, setDetectedMode] = useState<string>("")
  const recognitionRef = useRef<any>(null)
  const [currentLanguage, setCurrentLanguage] = useState<"ar" | "id">("ar") // Track current language

  // Fungsi untuk mendeteksi apakah input adalah lantunan ayat atau kata kunci
  const detectInputType = (text: string): boolean => {
    const wordCount = text.trim().split(/\s+/).length
    const hasArabicDiacritics = /[\u064B-\u065F]/.test(text)
    const hasLongPhrase = wordCount > 5
    const hasArabicText = /[\u0600-\u06FF]/.test(text)

    return (hasLongPhrase && hasArabicText) || hasArabicDiacritics
  }

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        console.log("Recognition already stopped")
      }
      recognitionRef.current = null
    }
    setIsListening(false)
    setDetectedMode("")
  }

  const startVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("❌ Browser Anda tidak mendukung Speech Recognition.\nCoba gunakan Chrome/Edge.")
      return
    }

    // Cleanup previous recognition
    stopRecognition()

    setIsListening(true)
    setDetectedMode("🎤 Mendengarkan...")

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    // Configuration
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.lang = "ar-SA"
    setCurrentLanguage("ar")

    let hasResult = false

    recognition.onstart = () => {
      console.log("✅ Speech recognition started with Arabic")
      setDetectedMode("🎤 Sedang mendengarkan dalam bahasa Arab... Silakan berbicara!")
    }

    recognition.onresult = (event: any) => {
      hasResult = true
      const transcript = event.results[0][0].transcript
      const confidence = event.results[0][0].confidence

      console.log(`🎧 Hasil Arab: "${transcript}" (confidence: ${confidence})`)

      setSearchText(transcript)

      // Auto-detect type
      const isRecitation = detectInputType(transcript)

      if (isRecitation) {
        setDetectedMode("🎵 Terdeteksi: Lantunan Ayat (Arab)")
      } else {
        setDetectedMode("🔍 Terdeteksi: Kata Kunci (Arab)")
      }

      // Auto search after 1 second
      setTimeout(() => {
        onSearch(transcript, isRecitation)
        setDetectedMode("")
        setIsListening(false)
      }, 1000)
    }

    recognition.onerror = (event: any) => {
      console.error("❌ Speech recognition error:", event.error)

      let errorMessage = "Terjadi kesalahan: "

      switch (event.error) {
        case "no-speech":
          errorMessage += "Tidak ada suara terdeteksi. Coba lagi dan berbicara lebih keras."
          break
        case "audio-capture":
          errorMessage += "Mikrofon tidak ditemukan atau tidak bisa diakses."
          break
        case "not-allowed":
          errorMessage += "Akses mikrofon ditolak. Izinkan akses mikrofon di pengaturan browser."
          break
        case "network":
          errorMessage += "Koneksi internet bermasalah."
          break
        case "aborted":
          errorMessage += "Pencarian dibatalkan."
          break
        default:
          errorMessage += event.error
      }

      alert(errorMessage)
      stopRecognition()
    }

    recognition.onend = () => {
      console.log("🛑 Speech recognition ended")

      if (!hasResult && isListening && currentLanguage === "ar") {
        console.log("🔄 Tidak ada hasil Arab, mencoba dengan bahasa Indonesia...")
        setCurrentLanguage("id")

        const fallbackRecognition = new SpeechRecognition()
        recognitionRef.current = fallbackRecognition

        fallbackRecognition.continuous = false
        fallbackRecognition.interimResults = false
        fallbackRecognition.maxAlternatives = 1
        fallbackRecognition.lang = "id-ID"

        fallbackRecognition.onstart = () => {
          console.log("✅ Fallback: Speech recognition started with Indonesian")
          setDetectedMode("🎤 Mencoba dengan bahasa Indonesia...")
        }

        fallbackRecognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          const confidence = event.results[0][0].confidence

          console.log(`🎧 Hasil Indonesia: "${transcript}" (confidence: ${confidence})`)
          setSearchText(transcript)

          const isRecitation = detectInputType(transcript)

          if (isRecitation) {
            setDetectedMode("🎵 Terdeteksi: Lantunan Ayat (Indonesia)")
          } else {
            setDetectedMode("🔍 Terdeteksi: Kata Kunci (Indonesia)")
          }

          setTimeout(() => {
            onSearch(transcript, isRecitation)
            setDetectedMode("")
            setIsListening(false)
          }, 1000)
        }

        fallbackRecognition.onerror = (event: any) => {
          console.error("❌ Fallback recognition error:", event.error)
          alert("❌ Pencarian suara gagal di kedua bahasa. Coba lagi atau gunakan pencarian teks.")
          stopRecognition()
        }

        fallbackRecognition.onend = () => {
          console.log("🛑 Fallback recognition ended")
          setIsListening(false)
        }

        try {
          fallbackRecognition.start()
        } catch (e) {
          console.error("Failed to start fallback recognition:", e)
          stopRecognition()
        }
      } else {
        setIsListening(false)
      }
    }

    // Start recognition
    try {
      recognition.start()
    } catch (e) {
      console.error("Failed to start recognition:", e)
      alert("❌ Gagal memulai speech recognition. Pastikan tidak ada tab lain yang menggunakan mikrofon.")
      stopRecognition()
    }
  }

  const handleVoiceClick = () => {
    if (isListening) {
      stopRecognition()
      return
    }

    if (!recognitionAvailable) {
      alert("❌ Speech Recognition tidak tersedia.\n\nGunakan browser Chrome, Edge, atau Safari.")
      return
    }

    // Check microphone permission
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => {
          startVoiceRecognition()
        })
        .catch((err) => {
          console.error("Microphone access denied:", err)
          alert("❌ Akses mikrofon ditolak.\n\nBuka pengaturan browser dan izinkan akses mikrofon untuk website ini.")
        })
    } else {
      startVoiceRecognition()
    }
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Main Search Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!searchText.trim()) {
            alert("⚠️ Masukkan kata kunci pencarian")
            return
          }
          const isRecitation = detectInputType(searchText)
          onSearch(searchText, isRecitation)
        }}
        className="flex gap-2"
      >
        <Input 
          type="text"
          placeholder="Cari ayat dengan teks, suara, atau nomor (misal: 7, 2:255, atau 2 255)..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1 border-black"
          dir="auto"
        />
        <Button
          type="button"
          variant={isListening ? "destructive" : "outline"}
          onClick={handleVoiceClick}
          className="px-3"
          disabled={!recognitionAvailable}
          title={recognitionAvailable ? "Klik untuk mulai berbicara dalam bahasa Arab" : "Browser tidak mendukung"}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4 mr-2" />
          Cari
        </Button>
      </form>

      {/* Help Text */}
      {!recognitionAvailable && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
          <p className="font-medium">⚠️ Pencarian Suara Tidak Tersedia</p>
          <p className="mt-1 text-xs">Gunakan browser Chrome, Edge, atau Safari untuk mengaktifkan fitur ini.</p>
        </div>
      )}

      {recognitionAvailable && !isListening && !detectedMode && (
        <div className="text-sm text-muted-foreground bg-accent/50 p-3 rounded-md">
          <p className="font-medium mb-1">💡 Tips Pencarian:</p>
          <ul className="text-xs space-y-1 ml-4 list-disc">
            <li>Cari ayat di Surah saat ini: ketik nomor ayat saja, misal "7" untuk Ayat 7</li>
            <li>Cari ayat di Surah lain: ketik "2:255" atau "2 255" untuk Surah 2 Ayat 255</li>
            <li>Cari dengan teks: ketik kata kunci dalam bahasa Arab atau Indonesia</li>
            <li>Cari dengan suara: klik tombol mikrofon dan ucapkan dalam bahasa Arab atau Indonesia</li>
            <li>Sistem akan otomatis mendeteksi jenis pencarian</li>
          </ul>
        </div>
      )}

      {/* Status Messages */}
      {isListening && (
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-2 bg-primary/10 p-4 rounded-lg border-2 border-primary">
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-primary font-medium">{detectedMode}</p>
          </div>
          <p className="text-xs text-muted-foreground">Ucapkan dalam bahasa Arab atau bacakan ayat Al-Qur'an</p>
          <Button variant="outline" size="sm" onClick={stopRecognition} className="mt-2 bg-transparent">
            Batal
          </Button>
        </div>
      )}

      {detectedMode && !isListening && (
        <div className="text-center animate-in fade-in bg-green-500/10 p-3 rounded-md border border-green-500/20">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">{detectedMode}</p>
        </div>
      )}
    </div>
  )
}
