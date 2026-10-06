'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiError } from './utils';

/** Minimal data-fetching hook: { data, loading, error, reload, setData } */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef(fetcher);
  ref.current = fetcher;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await ref.current());
    } catch (e) {
      setError(apiError(e, 'Could not load data. Check that the API is running.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, deps);
  return { data, loading, error, reload, setData };
}

/** Reads ?key=1 from the URL once on mount (used by the header's primary action) */
export function useUrlFlag(key: string) {
  const [flag, setFlag] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(key)) {
      setFlag(true);
      params.delete(key);
      const qs = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
    // The header's primary action fires this when we are already on the page
    const onFlag = (e: Event) => { if ((e as CustomEvent<string>).detail === key) setFlag(true); };
    window.addEventListener('meridian:flag', onFlag);
    return () => window.removeEventListener('meridian:flag', onFlag);
  }, [key]);
  return [flag, setFlag] as const;
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** Reads a single query-string value once on mount (no Suspense boundary needed) */
export function useUrlParam(key: string) {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => { setValue(new URLSearchParams(window.location.search).get(key)); }, [key]);
  return value;
}
