// Request encryption with the public key from GET /auth/encryption-key
// (JWK fields, PascalCase on the live API). Nothing here is stored except the
// public key (in memory); the private key never leaves the server.
//
//  encryptPayload  — RSA-OAEP-256 of the JSON itself → { cipherText }.
//                    Used by /auth/login and /auth/register. Max 190 bytes of JSON.
//  encryptHybrid   — AES-256-GCM of the JSON, AES key wrapped with RSA-OAEP-256
//                    → { cipherText, encryptedKey, iv, kid, alg }. No size limit.
//                    Used by the image API (backend support pending).

// RSA-OAEP with SHA-256 fits at most modulusBytes - 2*32 - 2 (190 for 2048-bit keys).
const maxBytes = (modulusBytes) => modulusBytes - 2 * 32 - 2;

const b64urlLength = (s) => Math.floor((String(s).replace(/=+$/, '').length * 3) / 4);
const toBase64 = (buf) => { let bin = ''; new Uint8Array(buf).forEach((b) => { bin += String.fromCharCode(b); }); return btoa(bin); };

function subtle() {
  if (!globalThis.crypto?.subtle) throw new Error('This browser cannot encrypt your details. Please update it and try again.');
  return globalThis.crypto.subtle;
}
const importRsa = (jwk) => subtle().importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RSA-OAEP-256', ext: true }, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);

/**
 * @param {{ n: string, e: string }} jwk  public key from the API
 * @param {object} payload  plaintext JSON
 * @returns {Promise<string>} base64 cipherText
 */
export async function encryptPayload(jwk, payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (bytes.length > maxBytes(b64urlLength(jwk.n))) throw new Error('Your details are too long to send securely. Please shorten them and try again.');
  const key = await importRsa(jwk);
  return toBase64(await subtle().encrypt({ name: 'RSA-OAEP' }, key, bytes));
}

/**
 * Hybrid envelope for payloads of any size.
 * @returns {Promise<{ cipherText: string, encryptedKey: string, iv: string, kid: string, alg: string }>}
 *   cipherText = AES-GCM ciphertext + 16-byte tag (WebCrypto layout), all base64.
 */
export async function encryptHybrid(jwk, payload) {
  const s = subtle();
  const aes = await s.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await s.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(JSON.stringify(payload)));
  const rawKey = await s.exportKey('raw', aes);
  const wrapped = await s.encrypt({ name: 'RSA-OAEP' }, await importRsa(jwk), rawKey);
  return { cipherText: toBase64(data), encryptedKey: toBase64(wrapped), iv: toBase64(iv), kid: jwk.kid || '', alg: 'RSA-OAEP-256+A256GCM' };
}
