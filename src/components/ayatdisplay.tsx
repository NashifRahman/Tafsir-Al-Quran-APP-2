"use client";
// BARU: Impor useEffect
import { useState} from "react";

import { Play, Copy, Share2, Check } from "lucide-react";

interface AyatDisplayProps {
  number: number;
  arab: string;
  transliteration: string;
  translation: string;
  onPlay?: () => void;
  onShare?: () => void;
  isHighlighted?: boolean;
}

export default function AyatDisplay({
  number,
  arab,
  transliteration,
  translation,
  onPlay,
  onShare,
  isHighlighted = false,
}: AyatDisplayProps) {
  const [copied, setCopied] = useState(false);
  
  // BARU: State internal untuk mengontrol highlight
  
  const handleCopy = () => {
    navigator.clipboard.writeText(arab || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // DIUBAH: Gunakan state 'internalHighlight'
  const highlightClass = isHighlighted
    ? "bg-yellow-100 shadow-md rounded-xl p-2 transition-all duration-500"
    : " transition-all duration-500";

  return (
    <div className="border-t border-gray-300 pt-6 pb-4 first:border-none">
      {/* Nomor ayat */}
      <div className="flex items-center gap-2 mb-3">
        <div className="border border-black rounded-4xl w-8 h-8 flex items-center justify-center text-sm font-semibold">
          {number}
        </div>
      </div>

      {/* Teks Arab (menggunakan highlightClass) */}
      <p
        className={`text-4xl font-Amiri text-right leading-loose mb-3 ${highlightClass}`}
      >
        {arab}
      </p>

      {/* Transliterasi */}
      <p className="font-semibold text-[#a98b49] mb-2">{transliteration}</p>

      {/* Terjemahan */}
      <p className="text-gray-700 mb-3">{translation}</p>

      {/* Tombol aksi */}
      <div className="flex items-center gap-4 mt-2 text-gray-600">
        <button
          onClick={onPlay}
          className="hover:text-green-600 transition-colors"
        >
          <Play size={20} />
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
        <button
          onClick={onShare}
          className="hover:text-emerald-600 transition-colors"
        >
          <Share2 size={20} />
        </button>
      </div>
    </div>
  );
}