import { useEffect, useRef, useState } from 'react';
import SectionHead from './SectionHead.jsx';
import { generateImage, filenameFromPrompt, downloadBlob } from '../api/generateImage.js';

const sizes = [
  ['1024x1024', 'Square'],
  ['1536x1024', 'Landscape'],
  ['1024x1536', 'Portrait'],
];

const ideas = [
  'A teak pergola over a stone patio at sunset, Odisha farmhouse',
  'A hexagonal bamboo gazebo in a monsoon-soaked mango orchard',
  'A covered timber deck with red lounge chairs, coastal light',
];

// Turns a prompt into an image via Azure OpenAI, previews it and downloads it.
export default function ImageStudio() {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [error, setError] = useState('');
  const [image, setImage] = useState(null); // { blob, url, filename }
  const abortRef = useRef(null);

  // Free the preview URL when it is replaced or the component unmounts.
  useEffect(() => () => { if (image) URL.revokeObjectURL(image.url); }, [image]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const onGenerate = async (e) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || status === 'loading') return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    setError('');

    try {
      const blob = await generateImage({ prompt: text, size, signal: controller.signal });
      const filename = filenameFromPrompt(text);
      setImage({ blob, url: URL.createObjectURL(blob), filename });
      setStatus('done');
      downloadBlob(blob, filename);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Something went wrong while generating the image.');
      setStatus('error');
    }
  };

  const loading = status === 'loading';

  return (
    <section className="studio" id="image-studio">
      <div className="wrap">
        <SectionHead eyebrow="Image Studio" title="Picture your weekend place before we build it">
          Describe the deck, pergola or corner of your property you have in mind. We'll draw it and save the image straight to your device.
        </SectionHead>

        <div className="studio-panel reveal">
          <form className="studio-form" onSubmit={onGenerate}>
            <label htmlFor="studio-prompt">Your prompt</label>
            <textarea
              id="studio-prompt" rows={4} value={prompt} maxLength={1000}
              placeholder="e.g. A cute baby polar bear relaxing on a timber deck"
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onGenerate(e); }}
              disabled={loading}
            />

            <div className="studio-ideas" aria-label="Prompt ideas">
              {ideas.map((idea) => (
                <button type="button" className="chip" key={idea} onClick={() => setPrompt(idea)} disabled={loading}>{idea}</button>
              ))}
            </div>

            <fieldset className="studio-sizes" disabled={loading}>
              <legend>Size</legend>
              {sizes.map(([value, label]) => (
                <label key={value} className={`chip${size === value ? ' sel' : ''}`}>
                  <input type="radio" name="size" value={value} checked={size === value} onChange={() => setSize(value)} />
                  {label}
                </label>
              ))}
            </fieldset>

            <button className="btn btn-primary studio-go" type="submit" disabled={loading || !prompt.trim()}>
              {loading ? 'Generating…' : 'Generate & download'}
            </button>
            <p className="studio-status" role="status" aria-live="polite">
              {loading && 'Drawing your image — this usually takes 10–30 seconds.'}
              {status === 'done' && `Saved as ${image?.filename}.`}
            </p>
            {status === 'error' && <p className="studio-error" role="alert">{error}</p>}
          </form>

          <div className={`studio-preview${loading ? ' is-loading' : ''}`}>
            {image ? (
              <>
                <img src={image.url} alt={`Generated image: ${prompt}`} />
                <button type="button" className="btn btn-ghost studio-again" onClick={() => downloadBlob(image.blob, image.filename)}>
                  Download again
                </button>
              </>
            ) : (
              <span className="studio-empty">{loading ? 'Generating…' : 'Your image will appear here'}</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
