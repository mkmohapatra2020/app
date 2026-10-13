import { useState } from 'react';
import Img from './Img.jsx';

// Shows an image from the API (absolute URL) or a local /images name; falls
// back to a local image if the remote one fails to load.
export default function RemoteImage({ src, fallback = 'pillar-outdoor', alt = '', className = '', sizes }) {
  const [failed, setFailed] = useState(false);
  const remote = src && /^(https?:|data:|blob:|\/)/.test(src);
  if (!src || failed) return <Img name={fallback} alt={alt} className={className} sizes={sizes} />;
  if (!remote) return <Img name={src} alt={alt} className={className} sizes={sizes} />;
  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
