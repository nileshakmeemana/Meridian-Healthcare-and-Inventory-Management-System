'use client';
import { useEffect, useMemo, useState } from 'react';
import { ComboBox, Input as AriaInput, ListBox, ListBoxItem, Popover } from 'react-aria-components';
import { ChevronDown } from '@untitledui/icons';
import { api } from '@/lib/api';
import { cn, formatLKR, formatNumber } from '@/lib/utils';
import type { Medicine } from '@/lib/types';

let cache: Medicine[] | null = null;
/** Loads the catalogue once per session (the view returns at most 200 rows per page) */
export function useMedicineCatalogue() {
  const [list, setList] = useState<Medicine[]>(cache ?? []);
  useEffect(() => {
    if (cache) return;
    api.get('/medicines', { params: { limit: 200 } }).then((r) => { cache = r.data.data; setList(cache!); }).catch(() => {});
  }, []);
  return list;
}
export const invalidateCatalogue = () => { cache = null; };

/** Searchable medicine picker built on react-aria ComboBox (the primitive Untitled UI uses) */
export function MedicineCombobox({ value, onChange, exclude = [], placeholder = 'Search medicine…', showStock = true }:
  { value: string; onChange: (id: string, med?: Medicine) => void; exclude?: string[]; placeholder?: string; showStock?: boolean }) {
  const list = useMedicineCatalogue();
  const items = useMemo(() => list.filter((m) => !exclude.includes(m._id) || m._id === value), [list, exclude, value]);
  return (
    <ComboBox
      aria-label="Medicine"
      selectedKey={value || null}
      onSelectionChange={(k) => onChange(String(k ?? ''), list.find((m) => m._id === k))}
      defaultItems={items}
      menuTrigger="focus"
      className="relative w-full"
    >
      <div className="relative">
        <AriaInput placeholder={placeholder} className="h-9 w-full rounded-xl border border-slate-200 bg-white pr-8 pl-3 text-sm text-slate-800 shadow-xs outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/15" />
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
      </div>
      <Popover className="z-[60] w-(--trigger-width) overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
        <ListBox<Medicine> className="max-h-64 overflow-y-auto p-1 outline-none" renderEmptyState={() => <p className="px-3 py-4 text-center text-xs text-slate-400">No medicines found</p>}>
          {(m) => (
            <ListBoxItem id={m._id} textValue={`${m.name} ${m.sku}`}
              className={({ isFocused, isSelected }) => cn('flex cursor-default items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm outline-none', isFocused && 'bg-slate-100', isSelected && 'font-semibold text-brand-800')}>
              <span className="min-w-0">
                <span className="block truncate">{m.name}</span>
                <span className="block text-[10px] text-slate-400">{m.sku} · {formatLKR(m.unitPrice)}</span>
              </span>
              {showStock && <span className={cn('shrink-0 text-[11px] font-semibold', m.stockQuantity <= m.reorderLevel ? 'text-amber-600' : 'text-slate-500')}>{formatNumber(m.stockQuantity)} {m.unit}</span>}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
