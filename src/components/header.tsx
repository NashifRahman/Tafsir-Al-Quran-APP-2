interface HeaderProps {
  name?: string
  transliteration?: string
  numberOfVerses?: number
  revelation?: string
}

export default function Header({ name, transliteration, numberOfVerses, revelation }: HeaderProps) {
  return (
    <header className="text-center mb-2 py-8 px-6 ">
      <h1 className="text-5xl sm:text-7xl font-serif font-bold text-primary mb-3">{name}</h1>
      <h2 className="text-2xl sm:text-3xl font-serif text-muted-foreground mb-2">{transliteration}</h2>
      <h3 className=" font-serif text-muted-foreground mb-6">{revelation} · {numberOfVerses}</h3>
      <div className="flex items-center justify-center gap-3">
        <div className="h-1 w-8 bg-linear-to-r from-primary to-accent rounded-full"></div>
        <div className="w-2 h-2 rounded-full bg-primary"></div>
        <div className="h-1 w-8 bg-linear-to-r from-accent to-primary rounded-full"></div>
      </div>
    </header>
  )
}
