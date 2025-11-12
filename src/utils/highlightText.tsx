interface HighlightMatch {
  text: string
  isMatch: boolean
}

function normalizeArabicForHighlight(text: string): string {
  if (!text) return ""

  let normalized = text.normalize("NFKD")
  normalized = normalized.replace(/[\u064B-\u065F]/g, "") // Remove diacritics
  normalized = normalized.replace(/\s+/g, " ").trim()

  return normalized
}

export function highlightText(text: string, searchTerm: string): HighlightMatch[] {
  if (!text || !searchTerm.trim()) {
    return [{ text, isMatch: false }]
  }

  const hasArabic = /[\u0600-\u06FF]/.test(searchTerm)
  let cleanTerm: string

  if (hasArabic) {
    cleanTerm = normalizeArabicForHighlight(searchTerm)
  } else {
    cleanTerm = searchTerm
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .normalize("NFKC")
  }

  if (!cleanTerm) {
    return [{ text, isMatch: false }]
  }

  const parts: HighlightMatch[] = []
  let lastIndex = 0

  if (hasArabic) {
    const normalizedText = normalizeArabicForHighlight(text)
    const regex = new RegExp(`(${cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "g")

    const matchIndex = 0
    for (const match of normalizedText.matchAll(regex)) {
      const matchStart = match.index!
      const matchEnd = matchStart + match[0].length

      // Find corresponding position in original text
      let originalStart = 0
      let normalizedPos = 0

      for (let i = 0; i < text.length; i++) {
        if (normalizedPos === matchStart) {
          originalStart = i
          break
        }
        const char = text[i]
        if (!/[\u064B-\u065F]/.test(char)) {
          normalizedPos++
        }
      }

      let originalEnd = originalStart
      let normalizedCount = 0
      for (let i = originalStart; i < text.length && normalizedCount < match[0].length; i++) {
        const char = text[i]
        if (!/[\u064B-\u065F]/.test(char)) {
          normalizedCount++
        }
        originalEnd = i + 1
      }

      if (originalStart > lastIndex) {
        parts.push({ text: text.slice(lastIndex, originalStart), isMatch: false })
      }
      parts.push({ text: text.slice(originalStart, originalEnd), isMatch: true })
      lastIndex = originalEnd
    }
  } else {
    // For Indonesian/Latin text
    const regex = new RegExp(`\\b(${cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "gi")

    for (const match of text.matchAll(regex)) {
      if (match.index! > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), isMatch: false })
      }
      parts.push({ text: match[0], isMatch: true })
      lastIndex = match.index! + match[0].length
    }
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isMatch: false })
  }

  return parts.length > 0 ? parts : [{ text, isMatch: false }]
}

export function renderHighlightedText(parts: HighlightMatch[]) {
  return parts.map((part, index) =>
    part.isMatch ? (
      <mark key={index} className="bg-yellow-300 text-black font-semibold rounded px-1">
        {part.text}
      </mark>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  )
}
