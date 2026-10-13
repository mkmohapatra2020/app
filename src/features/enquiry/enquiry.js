import { createContext, useContext } from 'react';
import { campaigns, membership } from '../../data/site.js';
import { formatDate } from '../../utils/contact.js';

export const EnquiryContext = createContext(null);
export const useEnquiry = () => useContext(EnquiryContext);

const person = [
  { name: 'name', label: 'Your name', required: true, autoComplete: 'name' },
  { name: 'phone', label: 'Phone / WhatsApp number', type: 'tel', required: true, autoComplete: 'tel' },
];

export function bookWorkshop(enquiry, workshopId) {
  const names = campaigns.map((c) => `${c.title} — ${formatDate(c.date, { day: 'numeric', month: 'short' })}`);
  const pre = campaigns.findIndex((c) => c.id === workshopId);
  const ordered = pre > 0 ? [names[pre], ...names.filter((_, i) => i !== pre)] : names;
  enquiry.current?.open({
    title: 'Book a workshop',
    intro: 'Tell us who is coming and we will confirm your seats on WhatsApp.',
    fields: [
      { name: 'workshop', label: 'Workshop', options: [...ordered, 'Notify me about future workshops'] },
      ...person,
      { name: 'seats', label: 'Number of seats', type: 'number', min: 1, max: 10, value: '2', required: true },
      { name: 'ages', label: "Children's ages", required: false },
    ],
    build: (v) => `Hello Weekend-Live! I'd like to book: ${v.workshop}\nName: ${v.name}\nPhone: ${v.phone}\nSeats: ${v.seats}${v.ages ? `\nChildren's ages: ${v.ages}` : ''}`,
  });
}

export function joinMembership(enquiry, tier) {
  const tiers = membership.map((m) => m.tier);
  enquiry.current?.open({
    title: 'Join the Weekend-Live Club',
    fields: [{ name: 'tier', label: 'Membership', options: tier ? [tier, ...tiers.filter((t) => t !== tier)] : tiers }, ...person],
    build: (v) => `Hello Weekend-Live! I'd like to become a ${v.tier} member of the Weekend-Live Club.\nName: ${v.name}\nPhone: ${v.phone}`,
  });
}

export function requestAssessment(enquiry, report = '') {
  enquiry.current?.open({
    title: 'Free home assessment',
    intro: 'Our team visits, checks the home with you and suggests safe, practical improvements.',
    fields: [...person, { name: 'area', label: 'Area / locality', required: true }, { name: 'notes', label: 'Anything we should know?', type: 'textarea' }],
    build: (v) => `Hello Weekend-Live! I'd like a free senior home assessment.\nName: ${v.name}\nPhone: ${v.phone}\nArea: ${v.area}${v.notes ? `\nNotes: ${v.notes}` : ''}${report ? `\n\n${report}` : ''}`,
  });
}

export function generalEnquiry(enquiry, topic) {
  enquiry.current?.open({
    title: topic,
    fields: [...person, { name: 'message', label: 'Message', type: 'textarea' }],
    build: (v) => `Hello Weekend-Live! ${topic}\nName: ${v.name}\nPhone: ${v.phone}${v.message ? `\n${v.message}` : ''}`,
  });
}
