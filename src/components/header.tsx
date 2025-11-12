interface HeaderProps {
  name?: string
  transliteration?: string
}

export default function Header({ name, transliteration }: HeaderProps) {
  return (
    <header className="text-center mb-10 py-8 px-6 from-primary/5 via-transparent to-accent/5 rounded-2xl border border-primary/10">
      <h1 className="text-5xl sm:text-6xl font-serif font-bold text-primary mb-3">تفسير {name}</h1>
      <h2 className="text-2xl sm:text-3xl font-serif text-muted-foreground mb-6">Tafsir Surat {transliteration}</h2>
      <div className="flex items-center justify-center gap-3">
        <div className="h-1 w-8 from-primary to-accent rounded-full"></div>
        <div className="w-2 h-2 rounded-full bg-primary"></div>
        <div className="h-1 w-8 from-accent to-primary rounded-full"></div>
      </div>
    </header>
  )
}
