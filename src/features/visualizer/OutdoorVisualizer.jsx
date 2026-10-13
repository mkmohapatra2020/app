import { useEffect, useState } from 'react';
import useImageJob from '../../hooks/useImageJob.js';
import { visualizationService } from '../../services/visualizationService.js';
import { generalEnquiry, useEnquiry } from '../enquiry/enquiry.js';
import { preparePhoto } from '../../utils/photo.js';
import BeforeAfter from '../../components/common/BeforeAfter.jsx';

const SPACES = ['Terrace', 'Backyard', 'Farmhouse plot', 'Balcony'];
const ZONES = [
  ['pergola', 'Pergola placement', 'Place the pergola on the west or south-west side so it shades the hot afternoon sun, and keep it at least 3 ft from parapets and drains.'],
  ['deck', 'Deck layout', 'Lay the deck on the flattest area with a slight slope away from the house so monsoon water drains off quickly.'],
  ['seating', 'Seating zones', 'Put seating under the pergola shade, facing the best view, with a clear 3 ft walkway around it.'],
  ['garden', 'Garden zones', 'Keep planters and beds along the edges and corners where they get morning sun, and leave space for a water tap.'],
];
export default function OutdoorVisualizer() {
  const enquiry = useEnquiry();
  const [photo, setPhoto] = useState(null);
  const [space, setSpace] = useState(SPACES[0]);
  const [zones, setZones] = useState(ZONES.map(([id]) => id));
  const job = useImageJob({ preferBackend: true });
  const { loading, elapsed, error } = job;
  const result = job.status === 'done' ? job.resultUrl : null;
  const [aiTips, setAiTips] = useState([]);

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    job.reset(); setAiTips([]);
    try { setPhoto(await preparePhoto(file)); } catch (err) { job.fail(err.message); }
  };

  const toggle = (id) => setZones((z) => (z.includes(id) ? z.filter((x) => x !== id) : [...z, id]));

  const visualize = async () => {
    if (!photo || !zones.length || loading) return;
    const wanted = ZONES.filter(([id]) => zones.includes(id)).map(([, label]) => label.toLowerCase());
    const prompt = `Edit this photo of a ${space.toLowerCase()} in Odisha, India to show a Weekend-Live outdoor living design concept. Keep the existing walls, floor, buildings, perspective and lighting exactly as they are. Add, in realistic scale: ${wanted.join(', ')}. Use a teak-wood pergola, a weatherproof timber deck, comfortable outdoor seating and planters with tropical plants where relevant. Mark each added zone with a thin white outline and a small, clean, correctly spelled label (${wanted.map((w) => `"${w.replace(' placement', '').replace(' layout', '').replace(' zones', '')}"`).join(', ')}). Photorealistic.`;
    job.edit({ image: photo.blob, prompt, size: photo.size, spaceType: space, zones });
    // In parallel: ask the backend visualizer for placement suggestions (optional).
    visualizationService.uploadHomePhoto({ image: photo.blob }).then((up) => (up.success && (up.data.id || up.data.url)
      ? visualizationService.suggestions({ reference: up.data, spaceType: space, zones })
      : null)).then((r) => { if (r?.success && r.data?.length) setAiTips(r.data); }).catch(() => {});
  };

  const tips = ZONES.filter(([id]) => zones.includes(id));

  return (
    <div className="tool-card visualizer reveal" id="visualizer">
      <div className="tool-head">
        <span className="eyebrow">Outdoor space visualizer</span>
        <h3>See your terrace or backyard transformed</h3>
        <p>Upload a photo and our AI suggests where a pergola, deck, seating and garden could go.</p>
      </div>
      <div className="vis-layout">
        <div className="vis-controls">
          <label className="upload-drop">
            <input type="file" accept="image/*" onChange={onFile} disabled={loading} />
            <span className="upload-icon" aria-hidden="true">📷</span>
            <span><b>{photo ? 'Change photo' : 'Upload a photo'}</b><small>JPG or PNG · taken in daylight works best</small></span>
          </label>
          <fieldset className="try-field" disabled={loading}>
            <legend>This space is a</legend>
            <div className="try-chips">
              {SPACES.map((s) => <button type="button" key={s} className={`chip${s === space ? ' sel' : ''}`} aria-pressed={s === space} onClick={() => setSpace(s)}>{s}</button>)}
            </div>
          </fieldset>
          <fieldset className="try-field" disabled={loading}>
            <legend>Suggest</legend>
            <div className="try-chips">
              {ZONES.map(([id, label]) => <button type="button" key={id} className={`chip${zones.includes(id) ? ' sel' : ''}`} aria-pressed={zones.includes(id)} onClick={() => toggle(id)}>{zones.includes(id) ? '✓ ' : ''}{label}</button>)}
            </div>
          </fieldset>
          <button type="button" className="btn btn-primary" disabled={!photo || !zones.length || loading} onClick={visualize}>
            {loading ? <><span className="try-btn-spinner" aria-hidden="true" /> Visualizing… {elapsed}s</> : 'Visualize my space'}
          </button>
          {loading && <p className="progress-note">Usually 40–90 seconds. You can read the tips meanwhile.</p>}
          {error && <p className="enq-error" role="alert">{error}</p>}
        </div>
        <div className="vis-preview">
          {!photo && <div className="vis-empty">Your photo and the AI concept will appear here.</div>}
          {photo && (
            result ? (
              <BeforeAfter beforeSrc={photo.url} afterSrc={result} alt="Your space with AI-suggested zones" aspect={photo.aspect} labels={['Your space', 'AI concept']} />
            ) : (
              <div className={`vis-pair${loading ? ' has-result' : ''}`}>
                <figure><img src={photo.url} alt="Your uploaded space" /><figcaption>Your space</figcaption></figure>
                {loading && <figure className="is-loading"><div className="vis-wait"><span className="slide-spinner" /></div><figcaption>AI concept</figcaption></figure>}
              </div>
            )
          )}
          {photo && tips.length > 0 && (
            <div className="vis-tips">
              <h4>Placement tips</h4>
              {aiTips.length > 0 && <><p className="rec-label">Suggestions for your photo</p><ul>{aiTips.map((t) => <li key={t}>{t}</li>)}</ul><p className="rec-label">General guidance</p></>}
              <ul>{tips.map(([id, label, tip]) => <li key={id}><b>{label}:</b> {tip}</li>)}</ul>
              {result && <button type="button" className="btn btn-outline btn-small" onClick={() => generalEnquiry(enquiry, `I used the Outdoor Space Visualizer for my ${space.toLowerCase()} and would like a site visit and quote.`)}>Get a site visit & quote</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
