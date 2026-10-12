import { contact } from '../data/site.js';

// Opens WhatsApp (app on phones, web on desktop) with a pre-filled message.
export function whatsappUrl(text) {
  return `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function openWhatsApp(text) {
  window.open(whatsappUrl(text), '_blank', 'noopener');
}

export function formatDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', ...opts });
}
