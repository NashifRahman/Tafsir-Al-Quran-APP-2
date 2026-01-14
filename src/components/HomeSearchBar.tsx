"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Search} from "lucide-react"; // Tambah icon Globe
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
  // 1. TAMBAHAN STATE: Default ke Arab ('ar-SA') atau Indonesia ('id-ID')
  const [voiceLang, setVoiceLang] = useState<"id-ID" | "ar-SA">("ar-SA"); 
  const recognitionRef = useRef<any>(null);

  const detectInputType = (text: string): boolean => {
    const wordCount = text.trim().split(/\s+/).length;
    const hasArabicDiacritics = /[\u064B-\u065F]/.test(text);
    const hasArabicText = /[\u0600-\u06FF]/.test(text);
    return (wordCount > 5 && hasArabicText) || hasArabicDiacritics;
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
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

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    // 2. EDIT BAGIAN INI: Gunakan state voiceLang, bukan hardcode
    recognition.lang = voiceLang; 

    setIsListening(true);
    setDetectedMode(
      voiceLang === "ar-SA" 
        ? "🎤 Mendengarkan (Arab)... Silakan baca ayat." 
        : "🎤 Mendengarkan (Indo)... Ucapkan kata kunci."
    );

    recognition.onstart = () => {
      console.log(`✅ Voice recognition started (${voiceLang})`);
    };

    recognition.onresult = (event: any) => {
      let transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;

      console.log(`🎧 Hasil: "${transcript}" (confidence: ${confidence})`);
      
      // Normalisasi hanya jika inputnya Arab
      if (voiceLang === "ar-SA") {
        transcript = normalizeArabic(transcript);
      }
      
      setSearchText(transcript);

      const isRecitation = detectInputType(transcript);

      if (isRecitation) {
        setDetectedMode("🎵 Terdeteksi: Lantunan Ayat");
      } else {
        setDetectedMode(
          voiceLang === "ar-SA" 
            ? "🔍 Terdeteksi: Kata Kunci Arab" 
            : "🔍 Terdeteksi: Kata Kunci Indonesia"
        );
      }

      setTimeout(() => {
        onSearch(transcript, isRecitation);
        setDetectedMode("");
        setIsListening(false);
      }, 1000);
    };

    recognition.onerror = (event: any) => {
      console.error("❌ Error:", event.error);
      if (event.error === 'no-speech') {
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
    startVoiceRecognition();
  };

  // 3. FUNGSI TOGGLE BAHASA
  const toggleLanguage = () => {
    setVoiceLang((prev) => (prev === "ar-SA" ? "id-ID" : "ar-SA"));
  };

  return (
    <div className="mb-6 space-y-3">
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
          placeholder={
             voiceLang === "ar-SA" 
             ? "Cari ayat (Arab/Latin)..." 
             : "Cari terjemahan (Indonesia)..."
          }
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1 border-black"
          dir="auto"
        />

        {/* 4. TOMBOL GANTI BAHASA (Kecil di sebelah Mic) */}
        {recognitionAvailable && (
          <Button
            type="button"
            variant="outline"
            onClick={toggleLanguage}
            className="px-2 w-10 font-bold text-xs"
            title={voiceLang === "ar-SA" ? "Mode Suara: Arab" : "Mode Suara: Indonesia"}
          >
            {voiceLang === "ar-SA" ? "AR" : "ID"}
          </Button>
        )}

        <Button
          type="button"
          variant={isListening ? "destructive" : "outline"}
          onClick={handleVoiceClick}
          className="px-3"
          disabled={!recognitionAvailable}
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

      {/* Indikator Visual - Diupdate teksnya agar user tau mode bahasa */}
      {recognitionAvailable && !isListening && !detectedMode && (
        <div className="text-sm text-muted-foreground bg-accent/50 p-2 rounded-md flex justify-between items-center">
          <span className="text-xs">
             Mode Suara: <b>{voiceLang === "ar-SA" ? "Bahasa Arab" : "Bahasa Indonesia"}</b>
          </span>
        </div>
      )}

      {/* Bagian Indikator Listening tetap sama, hanya teks detectedMode yang berubah dinamis */}
      {isListening && (
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-2 bg-primary/10 p-4 rounded-lg border-2 border-primary">
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-primary font-medium">{detectedMode}</p>
          </div>
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