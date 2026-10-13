import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageShell, { EmptyState, SkeletonGrid } from '../../components/common/PageShell.jsx';
import { TextInput, FormAlert, SubmitButton, isPhone } from '../../components/common/Form.jsx';
import RemoteImage from '../../components/common/RemoteImage.jsx';
import useApi from '../../hooks/useApi.js';
import useResource, { invalidate } from '../../hooks/useResource.js';
import useSession from '../../hooks/useSession.js';
import { userService } from '../../services/userService.js';
import { passportService } from '../../services/passportService.js';
import { visualizationService } from '../../services/visualizationService.js';
import { authService } from '../../services/authService.js';
import { membership as localTiers } from '../../data/site.js';
import { passportStamps } from '../../data/features.js';
import { useToast } from '../../context/ToastContext.jsx';

const TABS = [['profile', 'Profile'], ['membership', 'Membership'], ['badges', 'Passport badges'], ['designs', 'My AI designs']];

export default function ProfilePage({ tab: initialTab = 'profile' }) {
  const [tab, setTab] = useState(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);
  const { user } = useSession();
  const navigate = useNavigate();
  return (
    <PageShell title={`Hello${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`} eyebrow="My account" crumbs={[[null, 'My account']]}
      actions={<button type="button" className="btn btn-quiet btn-small" onClick={() => { authService.logout(); navigate('/'); }}>Sign out</button>}>
      <div className="tabs" role="tablist" aria-label="Account sections">
        {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={`tab${tab === id ? ' sel' : ''}`} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      <div role="tabpanel">
        {tab === 'profile' && <ProfileTab />}
        {tab === 'membership' && <MembershipTab />}
        {tab === 'badges' && <BadgesTab />}
        {tab === 'designs' && <DesignsTab />}
      </div>
    </PageShell>
  );
}

function ProfileTab() {
  const { user } = useSession();
  const profile = useResource('profile', (a) => userService.getProfile(a), { fallback: user });
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const save = useApi((a) => userService.updateProfile(a));
  const photo = useApi((a) => userService.uploadPhoto(a));
  const fileRef = useRef(null);
  const { toast } = useToast();
  const data = form || profile.data || user || {};

  const set = (k) => (e) => setForm({ ...data, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!String(data.name || '').trim()) errs.name = 'Enter your name.';
    if (data.phone && !isPhone(data.phone)) errs.phone = 'Enter a valid phone number.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = await save.execute({ profile: { name: data.name, phone: data.phone, city: data.city } });
    if (res.success) { toast('Profile saved'); setForm(null); invalidate('profile'); }
  };
  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Please choose an image file', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { toast('Please choose a photo under 5 MB', 'error'); return; }
    const res = await photo.execute({ file });
    if (res.success) toast('Photo updated'); else toast(res.error || 'Upload failed', 'error');
  };

  return (
    <div className="profile-grid">
      <div className="profile-photo card">
        <div className="avatar-xl">{user?.photo ? <img src={user.photo} alt="Your profile" /> : <span>{(user?.name || user?.email || '?')[0].toUpperCase()}</span>}</div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
        <button type="button" className="btn btn-outline btn-small" onClick={() => fileRef.current?.click()} disabled={photo.loading}>{photo.loading ? 'Uploading…' : 'Change photo'}</button>
        <p className="muted">{user?.email}</p>
        {user?.membership && <span className="pill">{user.membership} member</span>}
      </div>
      <form className="card form-card" onSubmit={submit} noValidate>
        <h2>Your details</h2>
        {profile.loading && <p className="muted">Loading your profile…</p>}
        <TextInput label="Full name" value={data.name || ''} onChange={set('name')} error={errors.name} autoComplete="name" />
        <div className="f-row">
          <TextInput label="Email" value={data.email || ''} disabled hint="Contact us to change your email" />
          <TextInput label="Phone / WhatsApp" type="tel" value={data.phone || ''} onChange={set('phone')} error={errors.phone} autoComplete="tel" />
        </div>
        <TextInput label="City" value={data.city || ''} onChange={set('city')} optional autoComplete="address-level2" />
        <FormAlert>{save.error}</FormAlert>
        <SubmitButton loading={save.loading} loadingText="Saving…" disabled={!form}>Save changes</SubmitButton>
      </form>
    </div>
  );
}

function MembershipTab() {
  const m = useResource('membership', (a) => userService.getMembership(a), { fallback: null, accept: (d) => !!d });
  const sub = useApi((a) => userService.subscribe(a));
  const { toast } = useToast();
  const plans = m.data?.plans?.length ? m.data.plans : localTiers.map((t) => ({ tier: t.tier, perks: t.perks, featured: t.featured }));
  const current = (m.data?.current || '').toLowerCase();

  const choose = async (tier) => {
    const res = await sub.execute({ tier });
    if (res.success) { toast(`You're now a ${tier} member!`); invalidate('membership'); m.reload(); } else toast(res.error, 'error');
  };

  return (
    <div>
      {m.data?.current && (
        <div className="card member-now">
          <span className="eyebrow">Current plan</span>
          <h2>{m.data.current}</h2>
          <p className="muted">{m.data.status && <>Status: {m.data.status}. </>}{m.data.validUntil && <>Valid until {new Date(m.data.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.</>}</p>
        </div>
      )}
      <div className="tier-grid">
        {plans.map((p) => {
          const isCurrent = current && p.tier.toLowerCase() === current;
          return (
            <article key={p.tier} className={`tier${p.featured || p.tier === 'Gold' ? ' featured' : ''}`}>
              <h3>{p.tier}</h3>
              {Number.isFinite(p.price) && <p className="tier-price">₹{p.price.toLocaleString('en-IN')}<small>/month</small></p>}
              <ul className="ticks">{p.perks.map((x) => <li key={x}>{x}</li>)}</ul>
              <button type="button" className={`btn ${isCurrent ? 'btn-quiet' : 'btn-primary'}`} disabled={isCurrent || sub.loading} onClick={() => choose(p.tier)}>
                {isCurrent ? 'Current plan' : sub.loading ? 'Please wait…' : current ? `Switch to ${p.tier}` : `Choose ${p.tier}`}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function BadgesTab() {
  const badges = useResource('passport-badges', (a) => passportService.badges(a), { fallback: [] });
  const progress = useResource('passport-progress', (a) => passportService.progress(a), { fallback: null, accept: (d) => !!d });
  const earned = badges.data || [];
  const total = progress.data?.total || passportStamps.length;
  const count = progress.data?.earned ?? earned.length;
  return (
    <div>
      <div className="card progress-card">
        <div><span className="eyebrow">Kids DIY passport</span><h2>{count} of {total} badges</h2>{progress.data?.level && <p className="muted">Level: {progress.data.level}</p>}</div>
        <div className="bar"><span style={{ width: `${Math.min(100, (count / Math.max(1, total)) * 100)}%` }} /></div>
        {progress.data?.nextBadge && <p className="muted">Next up: {progress.data.nextBadge}</p>}
      </div>
      {badges.loading ? <SkeletonGrid count={4} /> : earned.length ? (
        <div className="stamp-grid">{earned.map((b) => <div key={b.id || b.name} className="stamp got"><span className="stamp-icon" aria-hidden="true">{b.icon}</span><strong>{b.name}</strong>{b.earnedAt && <span className="stamp-hint">Earned {new Date(b.earnedAt).toLocaleDateString('en-IN')}</span>}</div>)}</div>
      ) : <EmptyState icon="🏅" title="No badges yet">Join a workshop and enter the stamp code on the <Link to="/#passport">passport</Link> to earn your first badge.</EmptyState>}
    </div>
  );
}

function DesignsTab() {
  const list = useResource('my-designs', (a) => visualizationService.myRequests(a), { fallback: [] });
  const [open, setOpen] = useState(null);
  const detail = useApi((a) => visualizationService.get(a));
  const view = async (v) => { setOpen(v); if (!v.image) await detail.execute({ id: v.id }); };
  const shown = open && (detail.data && detail.data.id === open.id ? { ...open, ...detail.data } : open);

  if (list.loading) return <SkeletonGrid count={3} />;
  if (!list.data?.length) return <EmptyState icon="🖼️" title="No AI designs yet">Try <b>Change My Space</b> from the Try now button or the <Link to="/#visualizer">Outdoor Space Visualizer</Link> — your designs will be saved here.</EmptyState>;
  return (
    <div className="designs">
      <div className="design-grid">
        {list.data.map((v) => (
          <button type="button" key={v.id} className={`design-card${open?.id === v.id ? ' sel' : ''}`} onClick={() => view(v)}>
            <RemoteImage src={v.image || v.original} fallback="show-roofgarden" alt="" />
            <span className={`status status-${v.status || 'pending'}`}>{v.status === 'done' ? 'Ready' : v.status === 'error' ? 'Failed' : 'Processing'}</span>
            <span className="design-date">{v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-IN') : `Request ${v.id}`}</span>
          </button>
        ))}
      </div>
      {shown && (
        <div className="card design-detail" aria-live="polite">
          {detail.loading ? <p className="muted">Loading design…</p> : (
            <>
              <RemoteImage src={shown.image} fallback="show-roofgarden" alt="AI design result" className="design-full" />
              {shown.prompt && <p className="muted">{shown.prompt}</p>}
              {shown.suggestions?.length > 0 && <ul className="ticks">{shown.suggestions.map((s) => <li key={s}>{s}</li>)}</ul>}
              {shown.image && <a className="btn btn-outline btn-small" href={shown.image} target="_blank" rel="noopener">Open full size</a>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
