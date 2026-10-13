import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell, { SourceNote } from '../../components/common/PageShell.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import useResource from '../../hooks/useResource.js';
import { shopService } from '../../services/shopService.js';
import { fallbackProducts } from '../../data/shop.js';
import { useCart } from '../../context/CartContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { rupees } from './ShopPage.jsx';

export default function ProductPage() {
  const { id } = useParams();
  const local = fallbackProducts.find((p) => p.id === id);
  const p = useResource(`product:${id}`, (a) => shopService.product({ id, ...a }), { fallback: local, accept: (d) => !!d?.name });
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const cart = useCart();
  const { toast } = useToast();
  const prod = p.data;
  if (!prod) return <PageShell title={p.loading ? 'Loading…' : 'Product not found'} crumbs={[['/shop', 'Shop'], [null, 'Product']]}>{!p.loading && <Link to="/shop">Back to the shop</Link>}</PageShell>;
  const images = prod.images?.length ? prod.images : [prod.image];

  return (
    <PageShell title={prod.name} eyebrow={prod.category || 'Shop'} crumbs={[['/shop', 'Shop'], [null, prod.name]]}>
      <SourceNote fromApi={p.fromApi} />
      <div className="detail-layout">
        <div>
          <RemoteImage src={images[img]} fallback="camp-toolbox" alt={prod.name} className="detail-hero" />
          {images.length > 1 && <div className="thumbs">{images.map((s, i) => <button key={s} type="button" className={i === img ? 'sel' : ''} onClick={() => setImg(i)} aria-label={`Image ${i + 1}`}><RemoteImage src={s} alt="" /></button>)}</div>}
          {prod.text && <p className="lead-text">{prod.text}</p>}
        </div>
        <aside className="card buy-box">
          <p className="price big">{rupees(prod.price)} {prod.mrp > prod.price && <s>{rupees(prod.mrp)}</s>}</p>
          {Number.isFinite(prod.stock) && <p className={prod.stock < 5 ? 'low' : 'muted'}>{prod.stock > 0 ? `${prod.stock} in stock` : 'Out of stock'}</p>}
          <div className="qty" aria-label="Quantity">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(prod.stock || 20, q + 1))} aria-label="Increase">+</button>
          </div>
          <button type="button" className="btn btn-primary btn-block" disabled={prod.stock === 0} onClick={() => { cart.add(prod, qty); toast(`Added ${qty} × ${prod.name}`); }}>Add to cart</button>
          <Link to="/cart" className="btn btn-outline btn-block">View cart ({cart.count})</Link>
        </aside>
      </div>
    </PageShell>
  );
}
