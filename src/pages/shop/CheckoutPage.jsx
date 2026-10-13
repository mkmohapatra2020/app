import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell, { EmptyState } from '../../components/common/PageShell.jsx';
import { TextInput, TextArea, FormAlert, SubmitButton, isPhone, isEmail } from '../../components/common/Form.jsx';
import useApi from '../../hooks/useApi.js';
import useSession from '../../hooks/useSession.js';
import { shopService } from '../../services/shopService.js';
import { paymentService, PAYMENTS_ENABLED } from '../../services/paymentService.js';
import { useCart } from '../../context/CartContext.jsx';
import { rupees } from './ShopPage.jsx';

// Creates the order via POST /checkout. Online payment (/payment/create + verify)
// switches on with VITE_PAYMENTS_ENABLED=true once the gateway is confirmed.
export default function CheckoutPage() {
  const cart = useCart();
  const { user } = useSession();
  const [v, setV] = useState({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '', address: '', city: user?.city || 'Bhubaneswar', pincode: '' });
  const [err, setErr] = useState({});
  const [order, setOrder] = useState(null);
  const checkout = useApi((a) => shopService.checkout(a));
  const pay = useApi((a) => paymentService.create(a));

  if (order) {
    return (
      <PageShell title="Order placed" crumbs={[['/shop', 'Shop'], [null, 'Order']]} narrow>
        <div className="card booking-done">
          <span aria-hidden="true">📦</span>
          <h2>Thank you{v.name ? `, ${v.name.split(' ')[0]}` : ''}!</h2>
          <p>Your order {order.id && <b>#{order.id}</b>} has been created{Number.isFinite(order.total) ? ` for ${rupees(order.total)}` : ''}.</p>
          {/* PAYMENT GATEWAY: pay.execute() calls /payment/create-order. Open the
              gateway's checkout with res.data, then call paymentService.verify(...). */}
          {PAYMENTS_ENABLED
            ? <button type="button" className="btn btn-primary" disabled={pay.loading} onClick={() => pay.execute({ orderId: order.id, amount: order.total })}>{pay.loading ? 'Starting payment…' : 'Pay now'}</button>
            : <p className="muted">Online payment is coming soon — our team will call you on {v.phone} to confirm delivery and payment.</p>}
          <FormAlert>{pay.error}</FormAlert>
          <Link to="/shop" className="btn btn-outline">Continue shopping</Link>
        </div>
      </PageShell>
    );
  }
  if (!cart.items.length) return <PageShell title="Checkout" narrow><EmptyState icon="🛒" title="Your cart is empty"><Link to="/shop">Browse the shop</Link></EmptyState></PageShell>;

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!v.name.trim()) errs.name = 'Enter your name.';
    if (!isPhone(v.phone)) errs.phone = 'Enter a valid phone number.';
    if (v.email && !isEmail(v.email)) errs.email = 'Enter a valid email.';
    if (v.address.trim().length < 8) errs.address = 'Enter your full delivery address.';
    if (!/^\d{6}$/.test(v.pincode)) errs.pincode = 'Enter a 6-digit PIN code.';
    setErr(errs);
    if (Object.keys(errs).length) return;
    const res = await checkout.execute({ items: cart.items, address: { line: v.address, city: v.city, pincode: v.pincode }, contact: { name: v.name, phone: v.phone, email: v.email } });
    if (res.success) { setOrder({ ...res.data, total: res.data.total ?? cart.total }); cart.clear(); }
  };
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  return (
    <PageShell title="Checkout" crumbs={[['/cart', 'Cart'], [null, 'Checkout']]}>
      <div className="detail-layout">
        <form className="card form-card" onSubmit={submit} noValidate>
          <h2>Delivery details</h2>
          <div className="f-row"><TextInput label="Name" value={v.name} onChange={set('name')} error={err.name} autoComplete="name" /><TextInput label="Phone" type="tel" value={v.phone} onChange={set('phone')} error={err.phone} autoComplete="tel" /></div>
          <TextInput label="Email" type="email" optional value={v.email} onChange={set('email')} error={err.email} autoComplete="email" />
          <TextArea label="Address" rows={3} value={v.address} onChange={set('address')} error={err.address} autoComplete="street-address" />
          <div className="f-row"><TextInput label="City" value={v.city} onChange={set('city')} autoComplete="address-level2" /><TextInput label="PIN code" inputMode="numeric" maxLength={6} value={v.pincode} onChange={set('pincode')} error={err.pincode} autoComplete="postal-code" /></div>
          <FormAlert>{checkout.error}</FormAlert>
          <SubmitButton loading={checkout.loading} loadingText="Placing order…">Place order · {rupees(cart.total)}</SubmitButton>
        </form>
        <aside className="card">
          <h3>Order summary</h3>
          <ul className="summary">{cart.items.map((i) => <li key={i.id}><span>{i.qty} × {i.name}</span><b>{rupees(i.qty * i.price)}</b></li>)}</ul>
          <div className="row-between total"><span>Total</span><b>{rupees(cart.total)}</b></div>
          {!PAYMENTS_ENABLED && <p className="muted">Pay on delivery or by UPI when we call to confirm.</p>}
        </aside>
      </div>
    </PageShell>
  );
}
