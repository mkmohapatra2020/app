import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

// Lightweight toasts: toast('Saved'), toast('Failed', 'error')
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const id = useRef(0);
  const toast = useCallback((text, tone = 'success', ms = 4200) => {
    const n = ++id.current;
    setItems((l) => [...l, { n, text, tone }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.n !== n)), ms);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.n} className={`toast toast-${t.tone}`}>{t.tone === 'error' ? '⚠️' : '✓'} {t.text}</div>)}
      </div>
    </ToastContext.Provider>
  );
}
