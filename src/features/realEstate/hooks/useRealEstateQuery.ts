/**
 * Load data for a Real Estate screen. Keeps the ApiError (kind drives the
 * unauthorized / forbidden / not-found / network states) and cancels stale requests.
 *   const { data, error, loading, reload } = useRealEstateQuery((signal) => realEstateApi.projects.list(signal), []);
 * `enabled: false` skips loading (e.g. waiting for a selected partner).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { isApiError, toApiError, type ApiError } from '../../../api/errors.ts';

export interface QueryState<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
  setData: (update: (prev: T | undefined) => T | undefined) => void;
}

export function useRealEstateQuery<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: unknown[], { enabled = true } = {}): QueryState<T> {
  const [state, setState] = useState<{ data: T | undefined; error: ApiError | null; loading: boolean }>({ data: undefined, error: null, loading: enabled });
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) { setState((s) => ({ ...s, loading: false })); return undefined; }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcherRef.current(ctrl.signal)
      .then((data) => { if (!ctrl.signal.aborted) setState({ data, error: null, loading: false }); })
      .catch((e: unknown) => {
        const err = isApiError(e) ? e : toApiError(e);
        if (ctrl.signal.aborted || err.kind === 'cancelled') return;
        setState((s) => ({ ...s, error: err, loading: false }));
      });
    return () => ctrl.abort();
  }, [enabled, nonce, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((update: (prev: T | undefined) => T | undefined) => setState((s) => ({ ...s, data: update(s.data) })), []);
  return { ...state, reload, setData };
}

/** Runs a mutation, exposing `pending` and the last ApiError. */
export function useRealEstateMutation<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    setPending(true);
    setError(null);
    try {
      return await fnRef.current(...args);
    } catch (e) {
      setError(isApiError(e) ? e : toApiError(e));
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);
  return { run, pending, error, clearError: useCallback(() => setError(null), []) };
}
