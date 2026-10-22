import { useEffect, useRef, useState } from 'react';
import useApi from './useApi.js';
import useElapsed from './useElapsed.js';
import { imageGenerationService as G } from '../services/imageGenerationService.js';

/**
 * AI image jobs for the Try now dialog — all through the APIM image API.
 *   const job = useImageJob();
 *   job.generate({ prompt, size })        → POST /images/generate
 *   job.edit({ image, prompt, size })     → write SAS + upload photo, then POST /images/generate
 *   job.retry()                           → same request again; an uploaded photo is reused
 *   job.status: 'idle' | 'loading' | 'done' | 'error'
 *   job.resultUrl (displayable URL; private blobs get a read SAS), job.error, job.elapsed
 *   job.canRetry → true once a request has been made.
 */
export default function useImageJob() {
  const gen = useApi(({ prompt, size, signal }) => G.generate({ prompt, size, style: 'photorealistic', signal }));
  const fromPhoto = useApi(({ image, prompt, size, reference, signal }) => G.generateFromPhoto({ file: image, prompt, size, style: 'photorealistic', reference, signal }));
  const [resultUrl, setResultUrl] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const last = useRef(null);
  const loading = status === 'loading';
  const elapsed = useElapsed(loading);

  useEffect(() => () => { if (resultUrl?.startsWith('blob:')) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  const run = async (api, args) => {
    setStatus('loading'); setError('');
    const res = await api.execute(args);
    // Keep the uploaded photo's reference so Try again does not upload it twice.
    const ref = res.data?.reference || res.reference;
    if (ref && last.current?.kind === 'edit') last.current = { ...last.current, args: { ...last.current.args, reference: ref } };
    if (res.aborted) { setStatus('idle'); return res; }
    if (res.success && res.data?.url) { setResultUrl(res.data.url); setStatus('done'); }
    else { setError(res.success ? 'No image came back from the service.' : res.error); setStatus('error'); }
    return res;
  };

  const cancel = () => { gen.cancel(); fromPhoto.cancel(); setStatus('idle'); };
  const reset = () => { cancel(); last.current = null; setResultUrl(null); setError(''); };
  const fail = (message) => { setError(message); setStatus('error'); };

  const retry = () => {
    if (!last.current || loading) return undefined;
    const { kind, args } = last.current;
    return run(kind === 'edit' ? fromPhoto : gen, args);
  };

  return {
    status, loading, error, elapsed, resultUrl,
    canRetry: !!last.current,
    generate: (args) => { last.current = { kind: 'generate', args }; return run(gen, args); },
    edit: (args) => { last.current = { kind: 'edit', args }; return run(fromPhoto, args); },
    retry,
    cancel, reset, fail,
  };
}
