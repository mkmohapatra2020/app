import { Link } from 'react-router-dom';
import PageShell, { EmptyState } from '../../components/common/PageShell.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { rupees } from './ShopPage.jsx';

export default function CartPage() {
  const cart = useCart();
  return (
    <PageShell title="Your cart" crumbs={[['/shop', 'Shop'], [null, 'Cart']]} narrow>
      {!cart.items.length ? <EmptyState icon="🛒" title="Your cart is empty"><Link to="/shop">Browse the shop</Link></EmptyState> : (
        <div className="cart">
          <ul className="cart-list">
            {cart.items.map((i) => (
              <li key={i.id} className="cart-item">
                <RemoteImage src={i.image} fallback="camp-toolbox" alt="" className="cart-img" />
                <div className="cart-info"><Link to={`/shop/${encodeURIComponent(i.id)}`}><b>{i.name}</b></Link><span className="muted">{rupees(i.price)} each</span></div>
                <div className="qty small">
                  <button type="button" onClick={() => cart.setQty(i.id, i.qty - 1)} aria-label={`Decrease ${i.name}`}>−</button>
                  <span>{i.qty}</span>
                  <button type="button" onClick={() => cart.setQty(i.id, i.qty + 1)} aria-label={`Increase ${i.name}`}>+</button>
                </div>
                <b className="cart-line">{rupees(i.price * i.qty)}</b>
                <button type="button" className="link-btn" onClick={() => cart.remove(i.id)} aria-label={`Remove ${i.name}`}>Remove</button>
              </li>
            ))}
          </ul>
          <div className="card cart-total">
            <div className="row-between"><span>Subtotal</span><b>{rupees(cart.total)}</b></div>
            <p className="muted">Delivery is calculated at checkout.</p>
            <Link to="/checkout" className="btn btn-primary btn-block">Checkout</Link>
            <Link to="/shop" className="btn btn-quiet btn-block">Keep shopping</Link>
          </div>
        </div>
      )}
    </PageShell>
  );
}
