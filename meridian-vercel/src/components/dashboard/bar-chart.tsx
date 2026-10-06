'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { formatNumber, cn } from '@/lib/utils';

export interface BarDatum {
  label: string;
  value: number;
  /** Tooltip heading, e.g. "Batch Cycle: Mar 2026" */
  caption?: string;
  /** Extra tooltip rows, e.g. Intake Restock +48,200 */
  rows?: { label: string; value: string; accent?: boolean }[];
}

function niceMax(v: number) {
  if (v <= 0) return 10;
  const exp = 10 ** Math.floor(Math.log10(v));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * exp;
}

/**
 * The custom "Monthly Supply Consumption" bar chart from the dashboard HTML:
 * grey bars, the active bar in solid emerald with a white indicator dot,
 * and the dark floating tooltip. Hover or focus moves the active bar.
 */
export function BarChart({ data, unit = 'units', height = 192, fillHeight = false }: { data: BarDatum[]; unit?: string; height?: number; fillHeight?: boolean }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(height + 32);
  const peak = useMemo(() => data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0), [data]);
  const [active, setActive] = useState(peak);
  useEffect(() => setActive(peak), [peak]);
  useEffect(() => {
    if (!fillHeight || !chartRef.current) return;
    const observer = new ResizeObserver(([entry]) => setContainerHeight(entry.contentRect.height));
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, [fillHeight]);

  const chartHeight = fillHeight ? Math.max(height, containerHeight - 32) : height;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = Array.from({ length: 6 }, (_, i) => max - (max / 5) * i);
  const current = data[active];
  const barH = (v: number) => Math.max(4, (v / max) * chartHeight);
  const TOOLTIP_H = current?.rows?.length ? 76 : 58;
  const placeRight = active < data.length - 2;

  return (
    <div ref={chartRef} className={cn('relative flex h-full w-full', !fillHeight && 'mt-8')} style={!fillHeight ? { height: height + 32 } : undefined} onMouseLeave={() => setActive(peak)}>
      {/* Y axis — each label sits exactly on its grid line */}
      <div className="relative w-10 shrink-0" style={{ height: chartHeight }}>
        {ticks.map((t, i) => (
          <span key={t} className="absolute right-2 -translate-y-1/2 text-[11px] font-medium text-slate-400" style={{ top: `${(i / 5) * 100}%` }}>
            {formatNumber(t, true)}
          </span>
        ))}
      </div>

      <div className="relative flex flex-1 items-end justify-between px-2" style={{ height: chartHeight }}>
        {[0, 20, 40, 60, 80].map((p) => <div key={p} className="absolute inset-x-0 border-b border-dashed border-slate-100" style={{ top: `${p}%` }} />)}
        <div className="absolute inset-x-0 bottom-0 border-b border-slate-200" />

        {data.map((d, i) => {
          const h = barH(d.value);
          const isActive = i === active;
          return (
            <button
              key={d.label}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              aria-label={`${d.caption ?? d.label}: ${formatNumber(d.value)} ${unit}`}
              className={cn('group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-end outline-none', isActive ? 'z-20' : 'z-10')}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: h }}
                transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                className={cn(
                  'relative w-[70%] max-w-12 rounded-t-xl transition-colors duration-300',
                  isActive ? 'bg-brand-800 shadow-md' : 'bg-slate-200/80 group-hover:bg-slate-300 group-focus-visible:bg-slate-300'
                )}
              >
                {isActive && (
                  <span className="absolute -top-2 left-1/2 flex size-4 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-brand-500 shadow-md">
                    <span className="size-1.5 rounded-full bg-white" />
                  </span>
                )}
              </motion.div>
              <span className={cn('absolute -bottom-7 text-xs', isActive ? 'font-bold text-slate-900' : 'font-medium text-slate-500')}>{d.label}</span>
            </button>
          );
        })}

        {current && (
          <div
            className="pointer-events-none absolute z-30 w-44 rounded-xl bg-tooltip p-2.5 text-white shadow-xl transition-all duration-200"
            style={{
              ...(placeRight
                ? { left: `calc(${((active + 0.5) / data.length) * 100}% + 1.75rem)` }
                : { right: `calc(${((data.length - active - 0.5) / data.length) * 100}% + 1.75rem)` }),
              bottom: Math.min(chartHeight - TOOLTIP_H, Math.max(0, barH(current.value) - TOOLTIP_H / 2)),
            }}
          >
            <p className="text-[10px] font-medium text-slate-400">{current.caption ?? current.label}</p>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-300 capitalize">{unit === 'units' ? 'Dispensed' : unit}</span>
              <span className="font-bold text-white">{formatNumber(current.value)}{unit === 'units' ? ' units' : ''}</span>
            </div>
            {current.rows?.map((r) => (
              <div key={r.label} className="mt-0.5 flex items-center justify-between text-[11px]">
                <span className="text-slate-300">{r.label}</span>
                <span className={cn('font-bold', r.accent ? 'text-emerald-400' : 'text-white')}>{r.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
