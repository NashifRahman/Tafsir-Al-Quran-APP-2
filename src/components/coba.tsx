"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { decodeHtml, splitArabicParagraphs } from "@/utils/decode";


interface Ayatdiv {
  arab?: string;
  latin?: string;
  terjemahan?: string;
  tafsir?: string;
  tafsirLong?: string;
}

export default function Ayatdiv({
  arab,
  latin,
  terjemahan,
  tafsir,
  tafsirLong,
}: Ayatdiv) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = `${arabParts}\n\n${tafsirParts}\n\n${tafsirLongParts}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tafsirclean = decodeHtml(tafsir || "");
  const tafsirLongclean = decodeHtml(tafsirLong || "");

  const arabParts = arab || "";
  const latinParts = latin || "";
  const terjemahanParts = terjemahan || "";
  const tafsirParts = splitArabicParagraphs(tafsirclean);
  const tafsirLongParts = splitArabicParagraphs(tafsirLongclean);

  // Fungsi helper untuk mengecek apakah string mengandung huruf Arab
  const isArabicText = (text: string) => {
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text);
  };

  // Fungsi helper untuk merender teks menjadi HTML dengan styling kondisional
  const formatTextToHtml = (text: string) => {
    return text
      .split(/\r\n|\r|\n/)
      .map((line) => {
        if (!line.trim()) return ""; // Abaikan baris kosong
        
        // Cek jika baris ini mengandung Arab
        const isArab = isArabicText(line);

        // Jika Arab: Rata kanan, font Arab, ukuran lebih besar, direction RTL
        // Jika Latin: Rata kiri (default), font bawaan
        const className = isArab 
          ? "text-right font-ArabFont text-xl leading-loose dir-rtl block mb-2" 
          : "text-left text-base leading-relaxed mb-3 block";
          
        return `<p class="${className}">${line}</p>`;
      })
      .join("");
  };

  return (
    <div className="border-primary/20 overflow-y-auto">
      <div className="p-8 space-y-8">
        
        {/* Bagian Ayat Utama */}
        <div className="group">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-serif font-semibold text-primary text-lg">
              Ayat
            </h3>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors opacity-0 group-hover:opacity-100"
              title="Salin ayat"
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4 text-primary" />
              )}
            </button>
          </div>
          <p className="text-2xl sm:text-3xl text-right font-ArabFont leading-loose mb-4 text-foreground">
            {arabParts}
          </p>
          <p className="text-sm text-muted-foreground text-right italic font-medium">
            {latinParts}
          </p>
        </div>

        {/* Bagian Terjemahan */}
        <div className="p-6 bg-gradient-to-r from-accent/10 to-primary/5 rounded-xl border-l-4 border-accent">
          <h3 className="font-serif font-semibold text-accent mb-3 text-lg">
            Terjemahan
          </h3>
          <p className="text-base leading-relaxed text-foreground">
            {terjemahanParts}
          </p>
        </div>

        {/* Bagian Tafsir Ringkas */}
        <div>
          <h3 className="font-serif font-semibold text-primary mb-4 text-lg">
            Tafsir Ringkas
          </h3>
          <div
            className="text-foreground/90 w-full"
            dangerouslySetInnerHTML={{
              __html: formatTextToHtml(tafsirParts),
            }}
          />
        </div>

        {/* Bagian Tafsir Panjang */}
        <div>
          <h3 className="font-serif font-semibold text-primary mb-4 text-lg">
            Tafsir Panjang
          </h3>
          <div
            // HAPUS class 'font-ArabFont' dari parent div ini agar teks Latin tidak ikut berubah font
            className="text-foreground/90 w-full"
            dangerouslySetInnerHTML={{
              __html: formatTextToHtml(tafsirLongParts),
            }}
          />
        </div>
      </div>
    </div>
  );
}