import { useEffect, useState } from 'react';
import useApi from './useApi.js';
import useElapsed from './useElapsed.js';
import { imageService } from '../services/imageService.js';

/**
 * AI image jobs (generate or edit) with progress and result management.
 *   const job = useImageJob();
 *   job.generate({ prompt, size })  |  job.edit({ image, prompt, size })
 *   job.status: 'idle' | 'loading' | 'done' | 'error'
 *   job.resultUrl (object URL, revoked automatically), job.error, job.elapsed
 */
export default function useImageJob() {
  const gen = useApi((args) => imageService.generate(args));
  const edit = useApi((args) => imageService.edit(args));
  const [resultUrl, setResultUrl] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const loading = status === 'loading';
  const elapsed = useElapsed(loading);

  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  const run = async (api, args) => {
    setStatus('loading'); setError('');
    const res = await api.execute(args);
    if (res.aborted) { setStatus('idle'); return res; }
    if (res.success) { setResultUrl(URL.createObjectURL(res.data)); setStatus('done'); }
    else { setError(res.error); setStatus('error'); }
    return res;
  };

  const cancel = () => { gen.cancel(); edit.cancel(); setStatus('idle'); };
  const reset = () => { cancel(); setResultUrl(null); setError(''); };
  const fail = (message) => { setError(message); setStatus('error'); };

  return {
    status, loading, error, elapsed, resultUrl,
    generate: (args) => run(gen, args),
    edit: (args) => run(edit, args),
    cancel, reset, fail,
  };
}
