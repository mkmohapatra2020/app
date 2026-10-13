import { Link } from 'react-router-dom';
import PageShell from '../components/common/PageShell.jsx';

export default function NotFoundPage() {
  return (
    <PageShell title="Page not found" narrow>
      <div className="empty"><span aria-hidden="true">🧭</span><h3>We couldn't find that page.</h3><p>It may have moved. Try one of these instead:</p>
        <p><Link className="btn btn-primary btn-small" to="/">Home</Link> <Link className="btn btn-outline btn-small" to="/workshops">Workshops</Link> <Link className="btn btn-outline btn-small" to="/contact">Contact</Link></p></div>
    </PageShell>
  );
}
