import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell, { EmptyState, SkeletonGrid, SourceNote } from '../../components/common/PageShell.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import useResource from '../../hooks/useResource.js';
import { shopService } from '../../services/shopService.js';
import { fallbackProducts } from '../../data/shop.js';
import { useCart } from '../../context/CartContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function ShopPage() {
  const products = useResource('products', (a) => shopService.products(a), { fallback: fallbackProducts });
  const [cat, setCat] = useState('All');
  const cart = useCart();
  const { toast } = useToast();
  const cats = useMemo(() => ['All', ...new Set((products.data || []).map((p) => p.category).filter(Boolean))], [products.data]);
  const list = (products.data || []).filter((p) => cat === 'All' || p.category === cat);

  return (
    <PageShell title="Shop" eyebrow="DIY kits, tools & care" crumbs={[[null, 'Shop']]} intro="Kits from our workshops, plus everything to look after your outdoor spaces."
      actions={<Link to="/cart" className="btn btn-outline btn-small">🛒 Cart ({cart.count})</Link>}>
      <div className="filter-row" role="group" aria-label="Categories">
        {cats.map((c) => <button key={c} type="button" className={`chip${cat === c ? ' sel' : ''}`} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <SourceNote fromApi={products.fromApi} />
      {products.loading ? <SkeletonGrid /> : list.length ? (
        <div className="product-grid">
          {list.map((p) => (
            <article key={p.id} className="product reveal">
              <Link to={`/shop/${encodeURIComponent(p.id)}`} className="product-img" aria-label={p.name}><RemoteImage src={p.image} fallback="camp-toolbox" alt="" /></Link>
              <div className="product-body">
                <h3><Link to={`/shop/${encodeURIComponent(p.id)}`}>{p.name}</Link></h3>
                <p className="price">{rupees(p.price)} {p.mrp > p.price && <s>{rupees(p.mrp)}</s>}</p>
                <button type="button" className="btn btn-primary btn-small" disabled={p.stock === 0} onClick={() => { cart.add(p); toast(`${p.name} added to cart`); }}>{p.stock === 0 ? 'Out of stock' : 'Add to cart'}</button>
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState icon="🛍️" title="Nothing here yet">Check back soon for new kits.</EmptyState>}
    </PageShell>
  );
}
