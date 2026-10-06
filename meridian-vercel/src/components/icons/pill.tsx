import type { SVGProps } from 'react';

/** Untitled UI has no pill glyph, so this one is drawn in the same 24px / 2px-stroke style. */
export function Pill(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <g transform="rotate(-45 12 12)">
        <rect x="2.5" y="8" width="19" height="8" rx="4" />
        <path d="M12 8v8" />
      </g>
    </svg>
  );
}

/** Stethoscope in the Untitled UI line style */
export function Stethoscope(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M5 3H4a1 1 0 0 0-1 1v5a5 5 0 0 0 10 0V4a1 1 0 0 0-1-1h-1" />
      <path d="M8 14v1a6 6 0 0 0 12 0v-2" />
      <circle cx="20" cy="11" r="2" />
    </svg>
  );
}
