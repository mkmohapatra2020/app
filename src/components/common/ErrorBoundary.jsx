import { Component } from 'react';

// Catches render errors so one broken section never blanks the whole page.
// Use `inline` for a small in-place message (sections), or full-page by default.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', this.props.name || '', error, info?.componentStack);
  }

  retry = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    const { children, inline = false, name } = this.props;
    if (!error) return children;
    if (inline) {
      return (
        <div className="eb-inline" role="alert">
          <p>Sorry — {name ? `the ${name}` : 'this part of the page'} couldn't load.</p>
          <button type="button" className="btn btn-outline btn-small" onClick={this.retry}>Try again</button>
        </div>
      );
    }
    return (
      <div className="eb-page" role="alert">
        <div className="eb-card">
          <div className="eb-icon" aria-hidden="true">⚠️</div>
          <h1>Oops! Something went wrong</h1>
          <p>Please refresh the page. If it keeps happening, contact us on WhatsApp.</p>
          {import.meta.env.DEV && <pre className="eb-detail">{String(error?.message || error)}</pre>}
          <div className="eb-actions">
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Refresh page</button>
            <a className="btn btn-outline" href="/">Go home</a>
          </div>
        </div>
      </div>
    );
  }
}
