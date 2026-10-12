const MAX_SIDE = 1024;

// Resize a chosen photo in the browser (keeps uploads ~100–250 KB) and pick
// the closest output size the image model supports.
export async function preparePhoto(file) {
  if (!file) throw new Error('No photo selected.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Please choose a photo under 25 MB.');
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error('That file could not be read as a photo. Please use a JPG or PNG.');
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  const ratio = w / h;
  const size = ratio > 1.2 ? '1536x1024' : ratio < 0.83 ? '1024x1536' : '1024x1024';
  const [ow, oh] = size.split('x').map(Number);
  return { blob, size, aspect: `${ow} / ${oh}`, url: URL.createObjectURL(blob) };
}
