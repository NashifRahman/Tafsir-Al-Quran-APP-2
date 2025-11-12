interface FooterProps {
  name?: string;
  transliteration?: string;
}

export default function Footer({name,transliteration}: FooterProps) {
  return (
    <footer className="text-center text-sm text-muted-foreground mt-8 pt-4 border-t border-border">
      <p>تفسير ميسر لسورة {name} - Tafsir Surat {transliteration}</p>
    </footer>
  );
}
