// Calls the Azure OpenAI image endpoint through the Vite proxy (/api/generate-image).
// The proxy adds the api-key header, so no secret lives in the browser.
/* global __IMAGE_DEPLOYMENT__ */

export async function generateImage({ prompt, size = '1024x1024', signal }) {
  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: __IMAGE_DEPLOYMENT__, prompt, n: 1, size }),
    signal,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Image service returned ${res.status} ${res.statusText}`);
  }
  if (res.status === 429) {
    throw new Error('Too many requests right now — please wait about a minute and try again.');
  }
  if (!res.ok) {
    throw new Error(data?.error?.message || `Image service returned ${res.status}`);
  }

  const item = data?.data?.[0];
  if (item?.b64_json) {
    const bytes = Uint8Array.from(atob(item.b64_json), (c) => c.charCodeAt(0));
    return new Blob([bytes], { type: 'image/png' });
  }
  if (item?.url) {
    const img = await fetch(item.url, { signal });
    return img.blob();
  }
  throw new Error('No image came back from the service.');
}

export function filenameFromPrompt(prompt) {
  const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  return `${slug || 'weekend-live-image'}.png`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
