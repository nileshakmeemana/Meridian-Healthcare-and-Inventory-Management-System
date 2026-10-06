'use client';
/**
 * Adapted from Untitled UI React — sidebar-navigation/sidebar-sections-subheadings.tsx
 * and base-components/mobile-header.tsx (MIT, github.com/untitleduico/react).
 *
 * Keeps Untitled's structure (fixed desktop aside + react-aria modal drawer on
 * mobile, grouped sections with sub-headings, featured card at the bottom) and
 * applies the Meridian dashboard styling. Adds a ⌘K quick search over the nav.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Menu02, SearchLg, X as CloseIcon, LogOut01 } from '@untitledui/icons';
import {
  Button as AriaButton, Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger,
  Modal as AriaModal, ModalOverlay as AriaModalOverlay,
} from 'react-aria-components';
import { cn } from '@/lib/utils';
import { useCounts } from '@/store/counts';
import type { NavSection } from '@/components/layout/nav-config';
import { NavItemBase } from './nav-item';

export const SIDEBAR_WIDTH = 256;

export function MeridianLogo() {
  return (
    <Image
      src="/Logo.png"
      alt="Meridian"
      width={140}
      height={36}
      priority
      className="h-9 w-auto object-contain object-left"
    />
  );
}

interface SidebarProps {
  activeUrl: string;
  sections: NavSection[];
  featured?: ReactNode;
  onSignOut: () => void;
  /** Free-text search fallback when nothing in the menu matches (e.g. SKU lookup) */
  searchFallback?: (q: string) => string | null;
  searchPlaceholder?: string;
}

function isActive(activeUrl: string, href: string) {
  return href === '/dashboard' ? activeUrl === href : activeUrl === href || activeUrl.startsWith(`${href}/`);
}

function SidebarContent({ activeUrl, sections, featured, onSignOut, searchFallback, searchPlaceholder, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const counts = useCounts();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses the quick search, like the hint chip in the design
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((s) => ({ ...s, items: s.items.filter((i) => `${i.label} ${i.keywords ?? ''}`.toLowerCase().includes(q)) }))
      .filter((s) => s.items.length);
  }, [query, sections]);

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    const first = filtered[0]?.items[0];
    const target = first ? first.href : searchFallback?.(q);
    if (target) { router.push(target); setQuery(''); inputRef.current?.blur(); onNavigate?.(); }
  };

  return (
    <aside className="flex h-full w-full flex-col justify-between overflow-y-auto border-r border-slate-200/80 bg-sidebar p-5">
      <div className="space-y-6">
        <MeridianLogo />

        <div className="relative">
          <SearchLg className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); if (e.key === 'Escape') setQuery(''); }}
            type="search"
            aria-label="Quick search"
            placeholder={searchPlaceholder ?? 'Search menu'}
            className="w-full rounded-xl border border-transparent bg-[#f4f6f8] py-2 pr-10 pl-9 text-xs font-medium placeholder:text-slate-400 transition-all focus:border-brand-500 focus:bg-white focus:outline-none"
          />
          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-slate-200/80 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-xs">⌘ K</span>
        </div>

        {filtered.map((section) => (
          <nav key={section.label} aria-label={section.label} className="space-y-1">
            <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">{section.label}</p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavItemBase href={item.href} icon={item.icon} badge={item.badge?.(counts)} current={isActive(activeUrl, item.href)} onClick={onNavigate}>
                    {item.label}
                  </NavItemBase>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {query && filtered.length === 0 && (
          <p className="px-3 text-xs text-slate-500">
            No menu items match. {searchFallback ? <>Press <kbd className="font-semibold">Enter</kbd> to search records.</> : null}
          </p>
        )}

        <div className="space-y-1">
          <NavItemBase icon={LogOut01} danger onPress={onSignOut}>Sign out</NavItemBase>
        </div>
      </div>

      {featured && <div className="mt-6">{featured}</div>}
    </aside>
  );
}

export function SidebarNavigation(props: SidebarProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Mobile header + drawer (Untitled UI MobileNavigationHeader pattern) */}
      <AriaDialogTrigger isOpen={open} onOpenChange={setOpen}>
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white px-4 lg:hidden">
          <MeridianLogo />
          <AriaButton aria-label="Open navigation menu" className="rounded-lg p-2 text-slate-600 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500/40">
            <Menu02 className="size-6" />
          </AriaButton>
        </header>
        <AriaModalOverlay
          isDismissable
          className={({ isEntering, isExiting }) => cn(
            'fixed inset-0 z-50 bg-transparent pr-16 backdrop-blur-md lg:hidden',
            isEntering && 'duration-300 ease-out animate-in fade-in',
            isExiting && 'duration-200 ease-in animate-out fade-out'
          )}
        >
          <AriaButton aria-label="Close navigation menu" onPress={() => setOpen(false)} className="fixed top-3 right-3 rounded-lg p-2 text-white/80 outline-none hover:bg-white/10 hover:text-white">
            <CloseIcon className="size-6" />
          </AriaButton>
          <AriaModal className={({ isEntering, isExiting }) => cn('h-dvh w-full max-w-72', isEntering && 'duration-300 animate-in slide-in-from-left', isExiting && 'duration-200 animate-out slide-out-to-left')}>
            <AriaDialog aria-label="Navigation" className="h-full outline-none">
              <SidebarContent {...props} onNavigate={() => setOpen(false)} />
            </AriaDialog>
          </AriaModal>
        </AriaModalOverlay>
      </AriaDialogTrigger>

      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-dvh shrink-0 lg:block" style={{ width: SIDEBAR_WIDTH }}>
        <SidebarContent {...props} />
      </div>
    </>
  );
}
