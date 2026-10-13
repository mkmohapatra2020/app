/** E-commerce — products, cart sync, checkout. Payment step: see paymentService. */
import { api, mapRes } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';
import { toOrder, toProduct, unwrap, unwrapList } from './adapters.js';

const E = BACKEND_ENDPOINTS.SHOP;

class ShopService {
  products({ signal, query } = {}) { return api.get(E.PRODUCTS, { signal, query }).then((r) => mapRes(r, (d) => unwrapList(d, 'products').map(toProduct).filter((p) => p.name))); }
  product({ id, signal }) { return api.get(E.PRODUCT, { arg: id, signal }).then((r) => mapRes(r, (d) => toProduct(unwrap(d)))); }
  // The API exposes POST /cart only, so the cart lives in the browser and is synced here.
  syncCart({ items, signal }) { return api.post(E.CART, { items: items.map((i) => ({ productId: i.id, quantity: i.qty })) }, { signal }); }
  checkout({ items, address, contact, signal }) {
    return api.post(E.CHECKOUT, { items: items.map((i) => ({ productId: i.id, quantity: i.qty, price: i.price })), shippingAddress: address, address, contact, name: contact?.name, phone: contact?.phone, email: contact?.email }, { signal }).then((r) => mapRes(r, toOrder));
  }
}
export const shopService = new ShopService();
export default shopService;
