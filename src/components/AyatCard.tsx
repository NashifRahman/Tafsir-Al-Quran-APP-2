"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { highlightText, renderHighlightedText } from "@/utils/highlightText"

interface AyatCardProps {
  arab?: string
  latin?: string
  terjemahan?: string
  tafsir?: string
  name?: string
  transliteration?: string
  translation?: string
  searchTerm?: string
}

export default function AyatCard({
  arab,
  latin,
  terjemahan,
  tafsir,
  name,
  transliteration,
  translation,
  searchTerm = "",
}: AyatCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(arab || "")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const arabParts = highlightText(arab || "", searchTerm)
  const latinParts = highlightText(latin || "", searchTerm)
  const terjemahanParts = highlightText(terjemahan || "", searchTerm)
  const tafsirParts = highlightText(tafsir || "", searchTerm)

  return (
    <Card className="mb-8 shadow-lg border-primary/20 overflow-y-scroll">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 py-5 flex items-center justify-center">
        <CardTitle className="text-xl sm:text-3xl text-center font-serif">
          <span className="text-primary">{name}</span>
          <span className="text-muted-foreground mx-2">-</span>
          <span className="text-muted-foreground">{transliteration}</span>
          <span className="text-muted-foreground mx-2">({translation})</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-8 space-y-8">
        <div className="group">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-serif font-semibold text-primary text-lg">Ayat</h3>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors opacity-0 group-hover:opacity-100"
              title="Salin ayat"
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-primary" />}
            </button>
          </div>
          <p className="text-2xl sm:text-3xl text-right font-Amiri leading-loose mb-4 text-foreground">
            {renderHighlightedText(arabParts)}
          </p>
          <p className="text-sm text-muted-foreground text-right italic font-medium">
            ({renderHighlightedText(latinParts)})
          </p>
        </div>

        <div className="p-6 bg-gradient-to-r from-accent/10 to-primary/5 rounded-xl border-l-4 border-accent">
          <h3 className="font-serif font-semibold text-accent mb-3 text-lg">Terjemahan</h3>
          <p className="text-base leading-relaxed text-foreground">{renderHighlightedText(terjemahanParts)}</p>
        </div>

        <div>
          <h3 className="font-serif font-semibold text-primary mb-4 text-lg">Tafsir</h3>
          <p className="leading-relaxed text-foreground/90 text-base">{renderHighlightedText(tafsirParts)}</p>
        </div>
      </CardContent>
    </Card>
  )
}
