// Small inline / block spinner (Flowerna LoadingSpinner equivalent).
export default function LoadingSpinner({ size = 'md', text, className = '' }) {
  return (
    <div className={`spinner-wrap ${className}`} role="status" aria-live="polite">
      <span className={`spinner spinner-${size}`} aria-hidden="true" />
      {text ? <span className="spinner-text">{text}</span> : <span className="sr-only">Loading…</span>}
    </div>
  );
}
