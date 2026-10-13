import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { shopService } from '../services/shopService.js';
import { session } from '../services/session.js';

const KEY = 'wl-cart';
const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };

// Cart lives in the browser (the API has POST /cart only) and is synced to the
// backend for signed-in users, debounced.
export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const timer = useRef(null);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
    if (!session.isAuthenticated()) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { shopService.syncCart({ items }); }, 800);
  }, [items]);

  const value = useMemo(() => ({
    items,
    count: items.reduce((n, i) => n + i.qty, 0),
    total: items.reduce((n, i) => n + i.qty * (i.price || 0), 0),
    add: (p, qty = 1) => setItems((l) => { const f = l.find((i) => i.id === p.id); return f ? l.map((i) => (i.id === p.id ? { ...i, qty: i.qty + qty } : i)) : [...l, { id: p.id, name: p.name, price: p.price, image: p.image, qty }]; }),
    setQty: (id, qty) => setItems((l) => (qty <= 0 ? l.filter((i) => i.id !== id) : l.map((i) => (i.id === id ? { ...i, qty } : i)))),
    remove: (id) => setItems((l) => l.filter((i) => i.id !== id)),
    clear: () => setItems([]),
  }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
