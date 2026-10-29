import { webcrypto } from 'node:crypto';
import { afterEach } from 'vitest';

// jsdom has no SubtleCrypto: use Node's WebCrypto for the RSA login encryption.
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
