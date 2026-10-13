import { useCallback, useEffect, useRef, useState } from 'react';

// Small in-memory cache so sections sharing a list (e.g. campaigns) fetch once.
const cache = new Map(); // key -> { at, data }
const inflight = new Map(); // key -> Promise
const TTL = 60 * 1000;

// Read cached data without subscribing (e.g. from event handlers).
export function peek(key) { return cache.get(key)?.data; }

export function invalidate(prefix) { [...cache.keys()].forEach((k) => { if (!prefix || k.startsWith(prefix)) cache.delete(k); }); }

/**
 * Load data from a service with caching and a built-in fallback.
 *   const { data, loading, error, fromApi, reload } = useResource('campaigns', campaignService.list, { fallback: localCampaigns });
 * - `key` null/false skips loading (e.g. needs sign-in).
 * - If the call fails or returns empty, `fallback` is used and `fromApi` is false.
 */
export default function useResource(key, fetcher, { fallback, accept = (d) => (Array.isArray(d) ? d.length > 0 : d != null), ttl = TTL } = {}) {
  const cached = key ? cache.get(key) : null;
  const [state, setState] = useState(() => ({
    data: cached && Date.now() - cached.at < ttl ? cached.data : fallback,
    fromApi: !!cached,
    loading: !!key && !cached,
    error: '',
  }));
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  const load = useCallback(async (force = false) => {
    if (!key) { setState((s) => ({ ...s, loading: false })); return; }
    const hit = cache.get(key);
    if (!force && hit && Date.now() - hit.at < ttl) { setState({ data: hit.data, fromApi: true, loading: false, error: '' }); return; }
    setState((s) => ({ ...s, loading: true }));
    let p = inflight.get(key);
    if (!p || force) { p = fetcherRef.current({}); inflight.set(key, p); }
    const res = await p.finally(() => inflight.delete(key));
    if (res?.success && accept(res.data)) {
      cache.set(key, { at: Date.now(), data: res.data });
      setState({ data: res.data, fromApi: true, loading: false, error: '' });
    } else {
      setState({ data: fallbackRef.current, fromApi: false, loading: false, error: res?.success ? '' : (res?.error || '') });
    }
  }, [key, ttl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: () => load(true), setData: (d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) };
}
