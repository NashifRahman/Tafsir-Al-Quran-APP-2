"use client";

// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import AyatCard from "./coba"; // Pastikan komponen ini ada
import { Button } from "./ui/button";
import { X } from "lucide-react";

interface AyatPopupProps {
  isOpen: boolean;
  onClose: () => void;
  ayat: any; // Sebaiknya gunakan tipe Verse yang kita definisikan di App.tsx
  surahName?: string;
  transliteration?: string;
  translation?: string;
}

export default function AyatPopup({
  onClose,
  ayat,
  // surahName,
  transliteration,
  // translation,
}: AyatPopupProps) {
  if (!ayat) return null; // Ini penting, agar tidak render saat 'selectedAyat' null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4 flex items-center justify-between ">
          <div className="flex-1">
            {/* <h2 className="text-lg font-serif ">Tafsir {transliteration} Ayat {ayat.id} </h2> */}
            <p className="text-lg font-medium ">Tafsir {transliteration} Ayat {ayat.id}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <AyatCard
          // name={surahName}
          // transliteration={transliteration}
          // translation={translation}
          arab={ayat.arab}
          latin={ayat.latin}
          terjemahan={ayat.terjemahan}
          tafsir={ayat.tafsir} // Pastikan 'ayat' memiliki properti 'tafsir'
          // tafsirLong={ayat.tafsirLong} 
        />
        {/* Footer */}
        <div className="bg-white border-t p-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
