import { createContext, useContext } from 'react';
import { membership } from '../../data/site.js';
import { fallbackCampaigns } from '../../data/fallbacks.js';
import { formatDate } from '../../utils/contact.js';
import { peek, invalidate } from '../../hooks/useResource.js';
import { campaignService } from '../../services/campaignService.js';
import { userService } from '../../services/userService.js';
import { assessmentService } from '../../services/assessmentService.js';
import { leadService } from '../../services/leadService.js';

export const EnquiryContext = createContext(null);
export const useEnquiry = () => useContext(EnquiryContext);

const person = [
  { name: 'name', label: 'Your name', required: true, autoComplete: 'name' },
  { name: 'phone', label: 'Phone / WhatsApp number', type: 'tel', required: true, autoComplete: 'tel' },
];

// Live campaigns if loaded, otherwise the built-in list.
const currentCampaigns = () => {
  const live = peek('campaigns');
  return (live?.length ? live : fallbackCampaigns).filter((c) => !c.date || new Date(c.date) >= new Date(new Date().toDateString()));
};

/** Book a workshop / campaign → POST /campaigns/{id}/register (signed in), else WhatsApp. */
export function bookWorkshop(enquiry, campaignId) {
  const list = currentCampaigns();
  const label = (c) => `${c.title}${c.date ? ` — ${formatDate(c.date, { day: 'numeric', month: 'short' })}` : ''}`;
  const pre = list.findIndex((c) => c.id === campaignId);
  const ordered = pre > 0 ? [list[pre], ...list.filter((_, i) => i !== pre)] : list;
  const NOTIFY = 'notify';
  enquiry.current?.open({
    title: 'Book a workshop',
    intro: 'Tell us who is coming and we will confirm your seats.',
    requiresAuth: true,
    authAction: 'book instantly',
    submitLabel: 'Book my seats',
    successTitle: 'Seats booked!',
    successText: 'You are registered. We will send the details on WhatsApp and email.',
    fields: [
      { name: 'workshop', label: 'Workshop', options: [...ordered.map((c) => [c.id, label(c)]), [NOTIFY, 'Notify me about future workshops']] },
      ...person,
      { name: 'seats', label: 'Number of seats', type: 'number', min: 1, max: 10, value: '2', required: true },
      { name: 'ages', label: "Children's ages", required: false },
    ],
    submit: async (v) => {
      if (v.workshop === NOTIFY) return leadService.callback({ values: { name: v.name, phone: v.phone, message: 'Please notify me about future workshops.' } });
      const c = list.find((x) => x.id === v.workshop);
      if (c?.local) return { success: false, error: 'Online booking for this date opens soon.' };
      const res = await campaignService.register({ id: v.workshop, seats: v.seats, childrenAges: v.ages, name: v.name, phone: v.phone });
      if (res.success) invalidate('campaign');
      return res;
    },
    build: (v) => {
      const c = list.find((x) => x.id === v.workshop);
      return `Hello Weekend-Live! I'd like to book: ${c ? label(c) : 'Notify me about future workshops'}\nName: ${v.name}\nPhone: ${v.phone}\nSeats: ${v.seats}${v.ages ? `\nChildren's ages: ${v.ages}` : ''}`;
    },
  });
}

/** Membership → POST /membership/subscribe (signed in), else WhatsApp. */
export function joinMembership(enquiry, tier) {
  const tiers = membership.map((m) => m.tier);
  enquiry.current?.open({
    title: 'Join the Weekend-Live Club',
    requiresAuth: true,
    authAction: 'subscribe online',
    submitLabel: 'Subscribe',
    successTitle: 'Welcome to the Club!',
    successText: 'Your membership is active. You can see it any time in My account.',
    fields: [{ name: 'tier', label: 'Membership', options: tier ? [tier, ...tiers.filter((t) => t !== tier)] : tiers }, ...person],
    submit: async (v) => { const r = await userService.subscribe({ tier: v.tier }); if (r.success) invalidate('membership'); return r; },
    build: (v) => `Hello Weekend-Live! I'd like to become a ${v.tier} member of the Weekend-Live Club.\nName: ${v.name}\nPhone: ${v.phone}`,
  });
}

/** Free senior home assessment → POST /elderly-assessment/visit. */
export function requestAssessment(enquiry, report = '', assessmentId) {
  enquiry.current?.open({
    title: 'Free home assessment',
    intro: 'Our team visits, checks the home with you and suggests safe, practical improvements.',
    submitLabel: 'Book free visit',
    successTitle: 'Visit requested',
    successText: 'We will call you to fix a convenient time for the home visit.',
    fields: [...person, { name: 'area', label: 'Area / locality', required: true }, { name: 'date', label: 'Preferred date', type: 'date' }, { name: 'notes', label: 'Anything we should know?', type: 'textarea' }],
    submit: (v) => assessmentService.bookVisit({ ...v, preferredDate: v.date, notes: [v.notes, report].filter(Boolean).join('\n\n'), assessmentId }),
    build: (v) => `Hello Weekend-Live! I'd like a free senior home assessment.\nName: ${v.name}\nPhone: ${v.phone}\nArea: ${v.area}${v.date ? `\nPreferred date: ${v.date}` : ''}${v.notes ? `\nNotes: ${v.notes}` : ''}${report ? `\n\n${report}` : ''}`,
  });
}

/** General enquiry → POST /leads/callback (or /leads/quotation, /leads/site-visit). */
export function generalEnquiry(enquiry, topic, kind = 'callback') {
  const call = { callback: leadService.callback, quotation: leadService.quotation, 'site-visit': leadService.siteVisit }[kind] || leadService.callback;
  enquiry.current?.open({
    title: kind === 'quotation' ? 'Get a quotation' : kind === 'site-visit' ? 'Book a site visit' : topic,
    intro: kind !== 'callback' ? topic : undefined,
    submitLabel: kind === 'quotation' ? 'Request quotation' : 'Request a callback',
    fields: [...person, { name: 'message', label: 'Message', type: 'textarea' }],
    submit: (v) => call.call(leadService, { values: { ...v, message: [topic, v.message].filter(Boolean).join('\n') } }),
    build: (v) => `Hello Weekend-Live! ${topic}\nName: ${v.name}\nPhone: ${v.phone}${v.message ? `\n${v.message}` : ''}`,
  });
}
