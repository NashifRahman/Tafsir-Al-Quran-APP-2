"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Search } from "lucide-react";

interface HomeSearchBarProps {
  searchText: string;
  setSearchText: (text: string) => void;
  onSearch: (text: string, isRecitation: boolean) => void;
  recognitionAvailable: boolean;
}

export default function HomeSearchBar({
  searchText,
  setSearchText,
  onSearch,
  recognitionAvailable,
}: HomeSearchBarProps) {
  const [isListening, setIsListening] = useState(false);
  const [detectedMode, setDetectedMode] = useState<string>("");
  const recognitionRef = useRef<any>(null);
  // const [, setCurrentLanguage] = useState<"ar" | "id">("ar"); // Track current language

  // Fungsi untuk mendeteksi apakah input adalah lantunan ayat atau kata kunci
  const detectInputType = (text: string): boolean => {
    const wordCount = text.trim().split(/\s+/).length;
    const hasArabicDiacritics = /[\u064B-\u065F]/.test(text);
    const hasLongPhrase = wordCount > 5;
    const hasArabicText = /[\u0600-\u06FF]/.test(text);

    return (hasLongPhrase && hasArabicText) || hasArabicDiacritics;
  };

  // 1. Fungsi untuk memberhentikan rekaman (Safety Check)
  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore error if already stopped
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    // Kita tidak langsung clear detectedMode agar user sempat baca status terakhir
  };

 // 2. Fungsi Utama (Support Rekursif untuk Fallback Bahasa)
  const startVoiceRecognition = (lang: "ar-SA" | "id-ID" = "ar-SA") => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("❌ Browser tidak mendukung. Gunakan Chrome (Android) atau Safari (iOS).");
      return;
    }

    // Pastikan instance lama mati sebelum mulai yang baru
    stopRecognition();

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // --- Konfigurasi Mobile Friendly ---
    recognition.continuous = false; // Wajib false untuk HP agar tidak hang
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = lang;

    // Update State
    setIsListening(true);
    // setCurrentLanguage(lang === "ar-SA" ? "ar" : "id");
    
    // Feedback UI
    if (lang === "ar-SA") {
      setDetectedMode("🎤 Mendengarkan (Arab)... Silakan baca ayat/kata kunci.");
    } else {
      setDetectedMode("🇮🇩 Tidak terdengar Arab, mencoba Bahasa Indonesia...");
    }

    let hasResult = false;

    recognition.onstart = () => {
      console.log(`✅ Recognition started: ${lang}`);
    };

    recognition.onresult = (event: any) => {
      hasResult = true;
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;

      console.log(`🎧 Hasil (${lang}): "${transcript}" (confidence: ${confidence})`);
      setSearchText(transcript);

      // Deteksi jenis input
      const isRecitation = detectInputType(transcript);
      const labelLang = lang === "ar-SA" ? "Arab" : "Indonesia";
      
      if (isRecitation) {
        setDetectedMode(`🎵 Terdeteksi: Lantunan Ayat (${labelLang})`);
      } else {
        setDetectedMode(`🔍 Terdeteksi: Kata Kunci (${labelLang})`);
      }

      // Auto search delay
      setTimeout(() => {
        onSearch(transcript, isRecitation);
        setDetectedMode("");
        setIsListening(false);
      }, 1000);
    };

    recognition.onerror = (event: any) => {
      console.error(`❌ Error (${lang}):`, event.error);
      
      // Khusus 'no-speech' di HP sering terjadi kalau user diam sebentar
      if (event.error === 'no-speech') {
         // Jangan alert, biarkan masuk ke onend untuk logic fallback
         return;
      }
      
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        alert("⚠️ Akses mikrofon ditolak. Cek pengaturan privasi browser Anda.");
        setIsListening(false);
        setDetectedMode("");
      }
    };

    recognition.onend = () => {
      console.log(`🛑 Recognition ended (${lang})`);

      // LOGIC FALLBACK: Jika bahasa Arab selesai TAPI tidak ada hasil, coba Indonesia
      if (!hasResult && lang === "ar-SA") {
        console.log("🔄 Fallback ke Bahasa Indonesia...");
        // Panggil fungsi ini lagi dengan parameter bahasa Indonesia
        startVoiceRecognition("id-ID"); 
      } else {
        // Jika sudah bahasa Indonesia dan tetap tidak ada hasil, atau memang sukses
        if (!hasResult && lang === "id-ID") {
             setDetectedMode("❌ Suara tidak tertangkap jelas.");
             setTimeout(() => setDetectedMode(""), 2000);
        }
        setIsListening(false);
        recognitionRef.current = null;
      }
    };

    // Jalankan
    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start:", e);
      setIsListening(false);
    }
  };


  const handleVoiceClick = () => {
    // 1. Cek apakah sedang mendengarkan, jika ya stop.
    if (isListening) {
      stopRecognition();
      return;
    }

    // 2. Cek ketersediaan API
    // Penting: Jangan gunakan (window as any) berulang-ulang, definisikan di luar atau di utils jika bisa.
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("❌ Fitur suara tidak didukung di browser ini. Gunakan Chrome (Android) atau Safari (iOS).");
      return;
    }

    // 3. LANGSUNG jalankan startVoiceRecognition()
    // Jangan bungkus dengan getUserMedia atau Promise apapun.
    // Browser HP butuh eksekusi langsung saat tombol ditekan.
    startVoiceRecognition();
  };
  
  

  return (
    <div className="mb-6 space-y-3">
      {/* Main Search Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!searchText.trim()) {
            alert("⚠️ Masukkan kata kunci pencarian");
            return;
          }
          const isRecitation = detectInputType(searchText);
          onSearch(searchText, isRecitation);
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
          title={
            recognitionAvailable
              ? "Klik untuk mulai berbicara dalam bahasa Arab"
              : "Browser tidak mendukung"
          }
        >
          {isListening ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!searchText.trim()) {
              alert("⚠️ Masukkan kata kunci pencarian");
              return;
            }
            const isRecitation = detectInputType(searchText);
            onSearch(searchText, isRecitation);
          }}
        >
          <Search className="h-4 w-4 mr-2" />
          Cari
        </Button>
      </form>

      {/* Help Text */}
      {!recognitionAvailable && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
          <p className="font-medium">⚠️ Pencarian Suara Tidak Tersedia</p>
          <p className="mt-1 text-xs">
            Gunakan browser Chrome, Edge, atau Safari untuk mengaktifkan fitur
            ini.
          </p>
        </div>
      )}

      {recognitionAvailable && !isListening && !detectedMode && (
        <div className="text-sm text-muted-foreground bg-accent/50 p-3 rounded-md">
          <p className="font-medium mb-1">💡 Tips Pencarian:</p>
          <ul className="text-xs space-y-1 ml-4 list-disc">
            <li>
              Cari ayat di Surah saat ini: ketik nomor ayat saja, misal "7"
              untuk Ayat 7
            </li>
            <li>
              Cari ayat di Surah lain: ketik "2:255" atau "2 255" untuk Surah 2
              Ayat 255
            </li>
            <li>
              Cari dengan teks: ketik kata kunci dalam bahasa Arab atau
              Indonesia
            </li>
            <li>
              Cari dengan suara: klik tombol mikrofon dan ucapkan dalam bahasa
              Arab atau Indonesia
            </li>
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
          <p className="text-xs text-muted-foreground">
            Ucapkan dalam bahasa Arab atau bacakan ayat Al-Qur'an
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={stopRecognition}
            className="mt-2 bg-transparent"
          >
            Batal
          </Button>
        </div>
      )}

      {detectedMode && !isListening && (
        <div className="text-center animate-in fade-in bg-green-500/10 p-3 rounded-md border border-green-500/20">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            {detectedMode}
          </p>
        </div>
      )}
    </div>
  );
}
