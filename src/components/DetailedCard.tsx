"use client";

// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import AyatCard from "./AyatCard"; // Pastikan komponen ini ada
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
  surahName,
  transliteration,
  translation,
}: AyatPopupProps) {
  if (!ayat) return null; // Ini penting, agar tidak render saat 'selectedAyat' null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-background border-b p-4 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Hasil Pencarian</h2>
            <p className="text-sm text-muted-foreground">
              Berikut Detail ayat ke-{ayat.id} untuk surat {transliteration}
            </p>
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
          name={surahName}
          transliteration={transliteration}
          translation={translation}
          arab={ayat.arab}
          latin={ayat.latin}
          terjemahan={ayat.terjemahan}
          tafsir={ayat.tafsir} // Pastikan 'ayat' memiliki properti 'tafsir'
        />
        {/* Footer */}
        <div className="bg-background border-t p-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
