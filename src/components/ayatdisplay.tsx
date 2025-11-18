"use client"
import { useState } from "react"
import { BookOpen, Copy, Share2, Check } from "lucide-react"

interface AyatDisplayProps {
  number: number
  arab: string
  transliteration: string
  translation: string
  onShare?: () => void
  onDetail?: () => void // ⬅ PROP INI SEKARANG AKAN DIGUNAKAN
  isHighlighted?: boolean
}

export default function AyatDisplay({
  number,
  arab,
  transliteration,
  translation,
  onShare,
  onDetail, // ⬅ Ambil prop-nya
  isHighlighted = false
}: AyatDisplayProps) {

  const [copied, setCopied] = useState(false)
  
  // 👇 [EDIT] HAPUS STATE LOKAL INI, KARENA SUDAH DIATUR OLEH App.tsx
  // const [Detailed, setDetailed] = useState(false)
  // const [selectedAyat, setSelectedAyat] = useState<any>(null);
  // const [showAyatPopup, setShowAyatPopup] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(arab || "")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 👇 [EDIT] UBAH FUNGSI INI UNTUK MEMANGGIL PROP onDetail
  const handleDetailClick = () => {
    if (onDetail) {
      onDetail() // Panggil fungsi yang diberikan oleh App.tsx
    }
  }

  const highlightClass = isHighlighted
    ? "bg-yellow-100 shadow-md rounded-xl p-2 transition-all duration-500"
    : "transition-all duration-500"

  return (
    <div className="border-t border-gray-300 pt-6 pb-4 first:border-none mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="border border-black rounded-4xl w-8 h-8 flex items-center justify-center text-sm font-semibold">
          {number}
        </div>
      </div>

      <p className={`text-4xl font-Amiri text-right leading-loose mb-3 ${highlightClass}`}>
        {arab}
      </p>

      <p className="font-semibold text-[#a98b49] mb-2">{transliteration}</p>
      <p className="text-gray-700 mb-3">{translation}</p>

      <div className="flex justify-between mb-7">
        <div className="flex items-center gap-4 mt-2 text-gray-600">

          {/* 👇 [EDIT] TOMBOL DETAIL — MEMANGGIL FUNGSI BARU */}
          <button
            onClick={handleDetailClick} // Panggil handleDetailClick
            className="hover:text-green-600 transition-colors"
          >
            {/* Hapus logika state 'Detailed' karena sudah tidak ada */}
            <BookOpen size={20} />
          </button>

          {/* COPY */}
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
  )
}