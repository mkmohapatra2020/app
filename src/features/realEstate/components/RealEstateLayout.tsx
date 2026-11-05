/**
 * Page frame for every Real Estate screen: the site's PageShell, a sub-navigation limited
 * to the features the backend granted, and the access gate (loading / disabled / feature
 * not granted). Routes are also protected by ProtectedRoute (sign-in) in App.jsx.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import PageShell from '../../../components/common/PageShell.jsx';
import { useT } from '../../../i18n/language.ts';
import { useRealEstateAccess } from '../access/RealEstateAccessProvider.tsx';
import type { RealEstateFeature } from '../types/realEstateTypes.ts';
import { LoadingState } from './ApiStateView.tsx';
import '../i18n/or.ts';

export const RE_ROOT = '/real-estate';

/** Section navigation, with an icon per tab like the site's menu bar. `also` lists other paths that belong to the same tab. */
export const TABS: { to: string; label: string; icon: string; feature: RealEstateFeature | null; also?: string[] }[] = [
  { to: RE_ROOT, label: 'Overview', icon: '📊', feature: null },
  { to: `${RE_ROOT}/projects`, label: 'Projects and plots', icon: '🏘️', feature: 'Projects' },
  { to: `${RE_ROOT}/customers`, label: 'Customers and bookings', icon: '👥', feature: 'Customers', also: [`${RE_ROOT}/bookings`] },
  { to: `${RE_ROOT}/ledger`, label: 'Ledger transactions', icon: '📒', feature: 'Ledger' },
  { to: `${RE_ROOT}/ocr`, label: 'Ledger OCR', icon: '🧾', feature: 'OCR' },
  { to: `${RE_ROOT}/documents`, label: 'Documents and images', icon: '🗂️', feature: 'Bookings' },
];
const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

interface Props {
  title: string;
  intro?: ReactNode;
  /** Feature the screen needs; omitted for the dashboard. */
  feature?: RealEstateFeature;
  crumbs?: [string | null, string][];
  actions?: ReactNode;
  children: ReactNode;
}

export default function RealEstateLayout({ title, intro, feature, crumbs = [], actions, children }: Props) {
  const access = useRealEstateAccess();
  const t = useT();
  const { pathname } = useLocation();
  // The tab row scrolls sideways when narrow: keep the active tab in view.
  const tabsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const row = tabsRef.current;
    const active = row?.querySelector<HTMLElement>('.re-tab.is-active');
    if (!row || !active) return;
    const left = active.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + active.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollLeft = Math.max(0, left - 16);
  }, [pathname, access.enabled]);
  let body: ReactNode = children;

  if (access.status === 'loading') body = <LoadingState text={t('Checking your Real Estate access…')} />;
  else if (!access.enabled) {
    body = (
      <div className="empty" role="alert">
        <span aria-hidden="true">🔒</span>
        <h3>{t("Real Estate isn't enabled for your account")}</h3>
        <p>{access.error?.kind === 'network' ? t("We couldn't check your access. Check your connection and try again.") : t('Contact your administrator if you need access to the Real Estate ledger.')}</p>
        {access.error && ['network', 'timeout', 'server'].includes(access.error.kind) && (
          <button type="button" className="btn btn-outline" onClick={access.reload}>{t('Try again')}</button>
        )}
      </div>
    );
  } else if (feature && !access.has(feature)) {
    body = (
      <div className="empty" role="alert">
        <span aria-hidden="true">🔒</span>
        <h3>{t("{feature} isn't available on your plan", { feature: t(feature) })}</h3>
        <p>{t("Your account doesn't include this part of the Real Estate module.")}</p>
      </div>
    );
  }

  return (
    <PageShell
      title={title}
      eyebrow={t('Real Estate · Bhumi Hisab')}
      intro={intro}
      crumbs={[[RE_ROOT, t('Real Estate')], ...crumbs]}
      actions={access.enabled ? actions : undefined}
      className="re-page"
    >
      {access.enabled && (
        <nav className="re-tabs" aria-label={t('Real Estate')} ref={tabsRef}>
          {TABS.filter((tab) => !tab.feature || access.has(tab.feature)).map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.to === RE_ROOT} title={t(tab.label)}
              className={({ isActive }) => `re-tab${isActive || tab.also?.some((p) => under(pathname, p)) ? ' is-active' : ''}`}>
              <span className="re-tab-icon" aria-hidden="true">{tab.icon}</span><span className="re-tab-label">{t(tab.label)}</span>
            </NavLink>
          ))}
        </nav>
      )}
      {body}
    </PageShell>
  );
}
