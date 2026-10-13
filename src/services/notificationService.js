/** Notifications — email, SMS, WhatsApp, push (admin tools). */
import { api } from './backendClient.js';
import { BACKEND_ENDPOINTS } from './apiConfig.js';

const E = BACKEND_ENDPOINTS.NOTIFICATIONS;

class NotificationService {
  email({ to, subject, message, signal }) { return api.post(E.EMAIL, { to, subject, body: message, message }, { signal }); }
  sms({ to, message, signal }) { return api.post(E.SMS, { to, phone: to, message }, { signal }); }
  whatsapp({ to, message, signal }) { return api.post(E.WHATSAPP, { to, phone: to, message }, { signal }); }
  push({ title, message, audience, signal }) { return api.post(E.PUSH, { title, body: message, message, audience }, { signal }); }
  send({ channel, ...args }) { return this[channel](args); }
}
export const notificationService = new NotificationService();
export default notificationService;
