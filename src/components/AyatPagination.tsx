import { Button } from "@/components/ui/button";

interface AyatPaginationProps {
  total: number;
  current: number;
  onSelect: (id: number) => void;
}

export default function AyatPagination({ total, current, onSelect }: AyatPaginationProps) {
  return (
    <div className="grid grid-cols-5 gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <Button
          key={i + 1}
          variant={current === i + 1 ? "default" : "outline"}
          onClick={() => onSelect(i + 1)}
          className="h-10"
        >
          {i + 1}
        </Button>
      ))}
    </div>
  );
}
