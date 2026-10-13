// Shared progress panel for AI image jobs (Try now, Visualizer).
// `stages` = [[untilSeconds, label], ...] — the last label shows after the final threshold.
export default function ImageJobLoader({ elapsed, stages, expected = '40–80', target = 80, label = 'Generating image' }) {
  const stage = (stages.find(([until]) => elapsed < until) || stages[stages.length - 1])[1];
  return (
    <div className="try-loader" role="progressbar" aria-label={label} aria-valuetext={stage}>
      <div className="try-loader-ring"><span>✦</span></div>
      <p className="try-loader-stage">{stage}</p>
      <p className="try-loader-time">{elapsed}s · usually {expected}s</p>
      <div className="try-loader-bar"><span style={{ width: `${Math.min(95, (elapsed / target) * 95)}%` }} /></div>
    </div>
  );
}
