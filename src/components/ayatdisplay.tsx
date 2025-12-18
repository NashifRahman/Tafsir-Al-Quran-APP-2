"use client";
import { useState } from "react";
import { BookOpen, Copy, Share2, Check } from "lucide-react";

interface AyatDisplayProps {
  number: number;
  arab: string;
  transliteration: string;
  translation: string;
  onShare?: () => void;
  onDetail?: () => void;
  isHighlighted?: boolean;
}

// 1. FUNGSI FORMATTER: Ubah "1)" menjadi superscript
const formatTranslation = (text: string) => {
  if (!text) return "";

  // Regex: Pisahkan jika bertemu angka diikuti kurung tutup, misal "1)", "23)"
  const parts = text.split(/(\d+\))/g);

  return parts.map((part, index) => {
    // Cek apakah bagian ini adalah angka kurung?
    if (/^\d+\)$/.test(part)) {
      return (
        <sup
          key={index}
          // Style: Kecil, naik ke atas, tebal, dan warna hijau/emas
          className="text-[0.7em] text-emerald-600 font-bold mx-0.5 cursor-help"
          title="Catatan Kaki"
        >
          {part}
        </sup>
      );
    }
    // Jika teks biasa, kembalikan apa adanya
    return part;
  });
};

export default function AyatDisplay({
  number,
  arab,
  transliteration,
  translation,
  onShare,
  onDetail,
  isHighlighted = false,
}: AyatDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(arab || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDetailClick = () => {
    if (onDetail) {
      onDetail();
    }
  };

  const highlightClass = isHighlighted
    ? "bg-yellow-100 shadow-md rounded-xl p-2 transition-all duration-500"
    : "transition-all duration-500";

  return (
    <div className="border-t border-gray-300 pt-6 pb-4 first:border-none mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="border border-black rounded-4xl w-8 h-8 flex items-center justify-center text-sm font-semibold">
          {number}
        </div>
      </div>

      <p
        dir="rtl"
        className={`text-xl md:text-3xl font-ArabFont text-right leading-loose mb-6 flex gap-4 ${highlightClass}`}
      >
        {arab}
      </p>

      <p className="text-sm md:text-base font-semibold text-[#a98b49] mb-2">{transliteration}</p>

      {/* 👇 2. GUNAKAN FUNGSI FORMATTER DI SINI */}
      <div className="text-sm md:text-base text-gray-700 mb-3 leading-relaxed">
        {formatTranslation(translation)}
      </div>

      <div className="flex justify-between mb-7">
        <div className="flex items-center gap-4 mt-2 text-gray-600">
          <button
            onClick={handleDetailClick}
            className="hover:text-green-600 transition-colors"
          >
            <BookOpen size={20} />
          </button>

          <button
            onClick={handleCopy}
            className="hover:text-blue-600 transition-colors"
          >
            {copied ? (
              <Check className="h-4 w-4 text-blue-600" />
            ) : (
              <Copy size={20} />
            )}
          </button>
        </div>

        <div className="flex items-center mt-2 text-white ">
          <button
            onClick={onShare}
            className="hover:text-emerald-600 border-2 transition-colors p-1.5 rounded-md bg-emerald-600 hover:bg-white"
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <div className="w-full h-0.5 bg-gray-200"></div>
    </div>
  );
}
