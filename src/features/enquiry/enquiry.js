import { createContext, useContext } from 'react';
import { membership } from '../../data/site.js';
import { fallbackCampaigns } from '../../data/fallbacks.js';
import { formatDate } from '../../utils/contact.js';
import { peek, invalidate } from '../../hooks/useResource.js';
import { campaignService } from '../../services/campaignService.js';
import { userService } from '../../services/userService.js';
import { assessmentService } from '../../services/assessmentService.js';
import { leadService } from '../../services/leadService.js';
import { heritageRestorationService } from '../../services/heritageRestorationService.js';
import { programService } from '../../services/programService.js';
import { incubatorService } from '../../services/incubatorService.js';
import { session } from '../../services/session.js';

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

// ---------- flagship programmes ----------
// Each flow calls its dedicated endpoint (swagger) when the visitor is signed
// in, and falls back to the lead endpoints — then WhatsApp — otherwise.

/** Signed in → try the dedicated API; if it fails (or guest) → lead endpoint. */
async function apiThenLead(apiCall, leadCall) {
  if (session.isAuthenticated() && apiCall) {
    const r = await apiCall();
    if (r?.success) return r;
    if (import.meta.env.DEV) console.info('[enquiry] dedicated endpoint failed, sending as lead:', r?.error);
  }
  return leadCall();
}
const contactLine = (v) => `Contact: ${v.name}, ${v.phone}${v.email ? `, ${v.email}` : ''}`;

/** Heritage restoration → POST /v1/heritage-restoration, else /leads/site-visit. */
export function bookHeritageAssessment(enquiry, types, preset) {
  const list = preset ? [preset, ...types.filter((t) => t !== preset)] : types;
  enquiry.current?.open({
    title: 'Book a heritage assessment',
    intro: 'A restoration specialist visits, records the condition of your piece or home and suggests a conservation plan with an estimate.',
    submitLabel: 'Book assessment',
    successTitle: 'Assessment requested',
    successText: 'Our restoration team will call you to fix a visit. Keep any old photos of the piece handy — they help a lot.',
    fields: [
      { name: 'item', label: 'What needs restoring?', options: list },
      ...person,
      { name: 'area', label: 'Area / locality', required: true },
      { name: 'age', label: 'Approximate age of the piece or building', required: false },
      { name: 'notes', label: 'Describe the condition', type: 'textarea' },
    ],
    submit: (v) => apiThenLead(
      () => heritageRestorationService.create({
        title: `${v.item} — ${v.name}`,
        location: v.area,
        projectType: v.item,
        description: [`Heritage assessment request${v.age ? ` (approx. ${v.age})` : ''}.`, contactLine(v)].join('\n'),
        currentCondition: v.notes || 'Not described yet',
      }),
      () => leadService.siteVisit({ values: { ...v, message: `Heritage assessment — ${v.item}${v.age ? ` (approx. ${v.age})` : ''}\n${v.notes || ''}`, extra: { service: 'heritage-restoration', projectType: v.item } } }),
    ),
    build: (v) => `Hello Weekend-Live! I'd like to book a Heritage Assessment.\nItem: ${v.item}\nName: ${v.name}\nPhone: ${v.phone}\nArea: ${v.area}${v.age ? `\nApprox. age: ${v.age}` : ''}${v.notes ? `\nCondition: ${v.notes}` : ''}`,
  });
}

/** Elder DIY → POST /elderly-diy/register { programId, emergencyContact, notes }, else /leads/callback. */
export function joinElderProgram(enquiry, { activities, times, mobility }, preset) {
  const ANY = 'any';
  const opts = activities.map((a) => [String(a.programId ?? a.id), a.title]);
  const pre = opts.find(([, t]) => t === preset);
  const list = pre ? [pre, ...opts.filter((o) => o !== pre)] : [[ANY, 'Any — help me choose'], ...opts];
  const find = (k) => activities.find((a) => String(a.programId ?? a.id) === k);
  enquiry.current?.open({
    title: 'Join the Elder DIY Program',
    intro: 'Tell us a little about yourself (or the person you are signing up) and we will call to suggest a first session.',
    submitLabel: 'Join the program',
    successTitle: 'Welcome aboard!',
    successText: 'We will call within two working days to plan your first session.',
    fields: [
      ...person,
      { name: 'activity', label: 'Activity you would like to try', options: list },
      { name: 'time', label: 'Best time for you', options: times },
      { name: 'mobility', label: 'Getting around', options: mobility },
      { name: 'companion', label: 'Coming with a family member?', options: ['No, on my own', 'Yes, with a grandchild', 'Yes, with a son / daughter', 'Yes, with a carer'] },
      { name: 'emergency', label: 'Emergency contact (name & phone)', required: true },
      { name: 'notes', label: 'Anything we should know? (hearing, eyesight, health)', type: 'textarea' },
    ],
    submit: (v) => {
      const a = find(v.activity);
      const details = `Best time: ${v.time}\nMobility: ${v.mobility}\nCompanion: ${v.companion}${v.notes ? `\n${v.notes}` : ''}`;
      const programId = Number(a?.programId);
      return apiThenLead(
        Number.isInteger(programId) ? () => programService.elderlyRegister({ programId, emergencyContact: v.emergency, notes: `${contactLine(v)}\n${details}` }) : null,
        () => leadService.callback({ values: { ...v, message: `Elder DIY Program — ${a?.title || 'Any'}\nEmergency contact: ${v.emergency}\n${details}`, extra: { service: 'elder-diy' } } }),
      ).then((r) => { if (r?.success) invalidate('elderly-diy:mine'); return r; });
    },
    build: (v) => `Hello Weekend-Live! I'd like to join the Elder DIY Program.\nName: ${v.name}\nPhone: ${v.phone}\nActivity: ${find(v.activity)?.title || 'Any — help me choose'}\nBest time: ${v.time}\nMobility: ${v.mobility}\nCompanion: ${v.companion}\nEmergency contact: ${v.emergency}${v.notes ? `\nNotes: ${v.notes}` : ''}`,
  });
}

/** Family / intergenerational programme → POST /family-programs/register { programId, participantCount }. */
export function joinFamilyProgram(enquiry, programs, preset) {
  const opts = programs.map((p) => [String(p.programId ?? p.id), p.title]);
  const pre = opts.find(([, t]) => t === preset);
  const list = pre ? [pre, ...opts.filter((o) => o !== pre)] : opts;
  const find = (k) => programs.find((p) => String(p.programId ?? p.id) === k);
  enquiry.current?.open({
    title: 'Join a Build Together programme',
    intro: 'Grandparents, parents and children at one bench. Tell us who is coming.',
    submitLabel: 'Register',
    successTitle: 'You are registered!',
    successText: 'We will confirm the date and what to bring on WhatsApp.',
    fields: [
      { name: 'program', label: 'Programme', options: list },
      ...person,
      { name: 'count', label: 'Number of participants', type: 'number', min: 1, max: 12, value: '3', required: true },
      { name: 'ages', label: 'Ages of the children (if any)', required: false },
    ],
    submit: (v) => {
      const p = find(v.program);
      const programId = Number(p?.programId);
      return apiThenLead(
        Number.isInteger(programId) ? () => programService.familyRegister({ programId, participantCount: v.count }) : null,
        () => leadService.callback({ values: { ...v, message: `Build Together — ${p?.title}\nParticipants: ${v.count}${v.ages ? `\nChildren's ages: ${v.ages}` : ''}`, extra: { service: 'family-program' } } }),
      );
    },
    build: (v) => `Hello Weekend-Live! I'd like to join ${find(v.program)?.title || 'a Build Together programme'}.\nName: ${v.name}\nPhone: ${v.phone}\nParticipants: ${v.count}${v.ages ? `\nChildren's ages: ${v.ages}` : ''}`,
  });
}

/** DIY incubator idea → POST /incubator/projects { projectName, description, category }, else /leads/callback. */
export function submitIdea(enquiry, { audiences, stages }, challenge) {
  const roles = audiences.map(([, t]) => t);
  enquiry.current?.open({
    title: challenge ? `Enter: ${challenge}` : 'Submit your idea',
    intro: 'One page is enough. Our team reviews every idea and replies within a week.',
    submitLabel: 'Submit idea',
    successTitle: 'Idea received!',
    successText: 'Thank you for sharing it. A mentor will review your idea and get back to you within a week.',
    fields: [
      ...person,
      { name: 'email', label: 'Email', type: 'email', required: false, autoComplete: 'email' },
      { name: 'role', label: 'I am a', options: roles },
      { name: 'title', label: 'Idea name', required: true },
      { name: 'stage', label: 'Where is it now?', options: stages },
      { name: 'problem', label: 'What problem does it solve?', type: 'textarea', required: true },
      { name: 'help', label: 'What help do you need? (tools, mentor, materials, funding)', type: 'textarea' },
    ],
    submit: (v) => apiThenLead(
      () => incubatorService.create({
        projectName: v.title,
        category: challenge || v.role,
        description: [`Problem: ${v.problem}`, `Stage: ${v.stage}`, `Submitted by: ${v.role}`, v.help && `Help needed: ${v.help}`, challenge && `Challenge: ${challenge}`, contactLine(v)].filter(Boolean).join('\n'),
      }).then((r) => { if (r.success) invalidate('incubator:'); return r; }),
      () => leadService.callback({ values: { ...v, message: `Incubator idea${challenge ? ` — challenge: ${challenge}` : ''}\n${v.title} (${v.stage})\nBy: ${v.role}\nProblem: ${v.problem}${v.help ? `\nNeeds: ${v.help}` : ''}`, extra: { service: 'incubator', challenge } } }),
    ),
    build: (v) => `Hello Weekend-Live! I'd like to submit an idea to the DIY Incubator${challenge ? ` (${challenge} challenge)` : ''}.\nName: ${v.name}\nPhone: ${v.phone}${v.email ? `\nEmail: ${v.email}` : ''}\nI am a: ${v.role}\nIdea: ${v.title}\nStage: ${v.stage}\nProblem: ${v.problem}${v.help ? `\nHelp needed: ${v.help}` : ''}`,
  });
}
