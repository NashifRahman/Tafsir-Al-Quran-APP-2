"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Search } from "lucide-react";
import { normalizeArabic } from "@/utils/textProcessing";

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

  // Fungsi deteksi input (tetap dipertahankan untuk membedakan mode pencarian)
  const detectInputType = (text: string): boolean => {
    const wordCount = text.trim().split(/\s+/).length;
    // Cek harakat umum
    const hasArabicDiacritics = /[\u064B-\u065F]/.test(text); 
    // Cek range karakter Arab
    const hasArabicText = /[\u0600-\u06FF]/.test(text);

    return (wordCount > 5 && hasArabicText) || hasArabicDiacritics;
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore logic
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("❌ Browser tidak mendukung. Gunakan Chrome (Android) atau Safari (iOS).");
      return;
    }

    stopRecognition();

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // --- Konfigurasi Khusus Arab ---
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    // KUNCI KE BAHASA ARAB SAJA
    recognition.lang = "ar-SA"; 

    setIsListening(true);
    setDetectedMode("🎤 Mendengarkan (Arab)... Silakan baca ayat.");

    recognition.onstart = () => {
      console.log("✅ Voice recognition started (Arabic Only)");
    };

    recognition.onresult = (event: any) => {
      let transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;

      console.log(`🎧 Hasil Arab: "${transcript}" (confidence: ${confidence})`);
      transcript = normalizeArabic(transcript);
      setSearchText(transcript);

      const isRecitation = detectInputType(transcript);

      if (isRecitation) {
        setDetectedMode("🎵 Terdeteksi: Lantunan Ayat");
      } else {
        setDetectedMode("🔍 Terdeteksi: Kata Kunci Arab");
      }

      // Auto search setelah 1 detik
      setTimeout(() => {
        onSearch(transcript, isRecitation);
        setDetectedMode("");
        setIsListening(false);
      }, 1000);
    };

    recognition.onerror = (event: any) => {
      console.error("❌ Error:", event.error);
      
      if (event.error === 'no-speech') {
         // User diam, tutup saja tanpa alert
         stopRecognition();
         setDetectedMode("");
         return;
      }
      
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        alert("⚠️ Akses mikrofon ditolak.");
        stopRecognition();
        setDetectedMode("");
      }
    };

    recognition.onend = () => {
      console.log("🛑 Voice recognition ended");
      // Tidak ada logika fallback lagi di sini
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start:", e);
      setIsListening(false);
    }
  };

  const handleVoiceClick = () => {
    if (isListening) {
      stopRecognition();
      return;
    }

    if (!recognitionAvailable) {
      alert("❌ Browser ini tidak mendukung fitur suara.");
      return;
    }

    // Langsung mulai mode Arab
    startVoiceRecognition();
  };

  return (
    <div className="mb-6 space-y-3">
      {/* Form Pencarian */}
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
          placeholder="Cari ayat (teks/suara) atau nomor (misal: 2:255)..."
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
          title={recognitionAvailable ? "Cari dengan suara (Arab)" : "Tidak didukung"}
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

      {/* Indikator Visual */}
      {isListening && (
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-2 bg-primary/10 p-4 rounded-lg border-2 border-primary">
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-primary font-medium">{detectedMode}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Pastikan pelafalan jelas (Makharijul Huruf)
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={stopRecognition}
            className="mt-2 bg-transparent border-primary/20 hover:bg-primary/10"
          >
            Batal
          </Button>
        </div>
      )}

      {/* Hasil Deteksi Singkat */}
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