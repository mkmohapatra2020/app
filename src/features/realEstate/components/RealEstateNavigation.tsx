/**
 * "Real Estate" item in the site's main menu bar (desktop bar and phone drawer).
 * Shown to every visitor. The pages behind it are still protected: signed-out visitors
 * are sent to sign in (ProtectedRoute), users without backend access see the
 * "not enabled" message (RealEstateLayout), and the API authorises every call.
 */
import type { CSSProperties } from 'react';
import { NavLink } from 'react-router-dom';
import { useT } from '../../../i18n/language.ts';
import { RE_ROOT } from './RealEstateLayout.tsx';
import '../realEstateNav.css';

export default function RealEstateNavigation({ index = 0 }: { index?: number }) {
  const t = useT();
  return (
    <li style={{ '--i': index } as CSSProperties}>
      <NavLink to={RE_ROOT} data-key="real-estate" data-testid="re-nav-link" className={({ isActive }) => `nav-studio${isActive ? ' is-active' : ''}`}>
        <span className="nav-menu-icon" aria-hidden="true">🏡</span>{t('Real Estate')}
      </NavLink>
    </li>
  );
}
