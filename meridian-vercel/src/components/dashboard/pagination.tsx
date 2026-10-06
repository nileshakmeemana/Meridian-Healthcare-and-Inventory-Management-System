import { ChevronLeft, ChevronRight } from '@untitledui/icons';
import { Button } from '@/components/ui/button';

export function Pagination({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5">
      <p className="text-xs text-slate-500">Page <span className="font-semibold text-slate-700">{page}</span> of {pages} · {total} records</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft /> Previous</Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next <ChevronRight /></Button>
      </div>
    </div>
  );
}
