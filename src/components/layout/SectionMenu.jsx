import { Link, useLocation } from 'react-router-dom';
import { activeSection, rememberSection, usePreferredSection } from './navState.js';

// In-page call to action for a header section that has one (Kids: "School Project Work →").
// variant="header": right side of the page header (PageShell); default: top of a page with its
// own hero. Sections with sub-menus show nothing here (their pages link onward at the bottom).
export default function SectionMenu({ variant = 'top' }) {
  const location = useLocation();
  const pref = usePreferredSection();
  const m = activeSection(location, pref);
  if (!m?.action) return null;
  return (
    <div className={`secmenu secmenu-${variant} secmenu-action`}>
      <Link to={m.action.to} className="btn btn-primary secmenu-action-btn" onClick={() => rememberSection(m.key)}>
        {m.action.label} <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
