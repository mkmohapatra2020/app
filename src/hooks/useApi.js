import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Generic hook for any service call that resolves to an ApiResponse.
 *   const { execute, data, error, loading, cancel, reset } = useApi(imageService.generate);
 *   const res = await execute({ prompt, size });  // signal is injected automatically
 * Previous in-flight calls are cancelled when a new one starts or on unmount.
 */
export default function useApi(serviceFn) {
  const [state, setState] = useState({ data: null, error: '', loading: false, status: null });
  const controller = useRef(null);
  const fnRef = useRef(serviceFn);
  fnRef.current = serviceFn;

  const cancel = useCallback(() => { controller.current?.abort(); controller.current = null; }, []);
  useEffect(() => cancel, [cancel]);

  const execute = useCallback(async (args = {}) => {
    cancel();
    const c = new AbortController();
    controller.current = c;
    setState((s) => ({ ...s, loading: true, error: '' }));
    const res = await fnRef.current({ ...args, signal: c.signal });
    if (controller.current !== c) return res; // superseded or cancelled
    controller.current = null;
    if (res.aborted) setState((s) => ({ ...s, loading: false }));
    else if (res.success) setState({ data: res.data, error: '', loading: false, status: res.status });
    else setState({ data: null, error: res.error || 'Something went wrong. Please try again.', loading: false, status: res.status });
    return res;
  }, [cancel]);

  const reset = useCallback(() => { cancel(); setState({ data: null, error: '', loading: false, status: null }); }, [cancel]);

  return { ...state, execute, cancel, reset };
}
