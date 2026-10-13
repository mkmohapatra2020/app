import { useEffect } from 'react';
import Img from '../../components/common/Img.jsx';

// Split layout used by all account screens: photo panel + form card.
export default function AuthLayout({ title, subtitle, image = 'hero-family', children, footer }) {
  useEffect(() => { document.title = `${title} · Weekend-Live`; }, [title]);
  return (
    <div className="auth">
      <aside className="auth-art" aria-hidden="true">
        <Img name={image} alt="" sizes="(max-width: 900px) 0px, 45vw" eager />
        <div className="auth-art-copy">
          <span className="eyebrow">Weekend-Live</span>
          <p>Building skills, creating spaces, connecting generations.</p>
        </div>
      </aside>
      <main className="auth-main" id="main">
        <div className="auth-card">
          <h1>{title}</h1>
          {subtitle && <p className="auth-sub">{subtitle}</p>}
          {children}
        </div>
        {footer && <div className="auth-foot">{footer}</div>}
      </main>
    </div>
  );
}
