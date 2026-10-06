'use client';
import { SearchLg } from '@untitledui/icons';
import { cn } from '@/lib/utils';

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <SearchLg className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-8 text-xs font-medium text-slate-700 shadow-xs transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none sm:w-64"
      />
    </div>
  );
}
