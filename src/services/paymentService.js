/**
 * Payment — create / verify. Not wired to a gateway yet (the gateway hasn't
 * been confirmed); checkout stops after order creation. When confirmed, call
 * create() → open the gateway with its response → verify().
 */
import { api } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';

export const PAYMENTS_ENABLED = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';
const E = BACKEND_ENDPOINTS.PAYMENT;

class PaymentService {
  create({ orderId, amount, signal }) { return api.post(E.CREATE, { orderId, amount }, { signal }); }
  verify({ orderId, paymentId, signature, signal }) { return api.post(E.VERIFY, { orderId, paymentId, signature }, { signal }); }
}
export const paymentService = new PaymentService();
export default paymentService;
