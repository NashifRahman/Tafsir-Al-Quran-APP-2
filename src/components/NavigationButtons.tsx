import { Button } from "@/components/ui/button";

interface NavigationButtonsProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function NavigationButtons({
  current,
  total,
  onPrev,
  onNext,
}: NavigationButtonsProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <Button onClick={onPrev} disabled={current === 1} variant="outline" className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Ayat Sebelumnya
      </Button>

      <div className="text-lg font-medium text-foreground">
        Ayat {current} dari {total}
      </div>

      <Button onClick={onNext} disabled={current === total} variant="outline" className="flex items-center gap-2">
        Ayat Selanjutnya
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Button>
    </div>
  );
}
