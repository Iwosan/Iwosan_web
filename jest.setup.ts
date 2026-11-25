import '@testing-library/jest-dom';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';

// jsdom does not provide TextEncoder/TextDecoder, which the Stellar SDK needs.
if (typeof globalThis.TextEncoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextEncoder', {
    value: TextEncoder,
    configurable: true,
  });
}
if (typeof globalThis.TextDecoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextDecoder', {
    value: TextDecoder,
    configurable: true,
  });
}

// jsdom does not implement SubtleCrypto; polyfill with Node's Web Crypto implementation.
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

// jsdom's Blob/File have no arrayBuffer(); read them with FileReader instead.
if (typeof Blob !== 'undefined' && typeof Blob.prototype.arrayBuffer !== 'function') {
  Object.defineProperty(Blob.prototype, 'arrayBuffer', {
    configurable: true,
    value(this: Blob): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error ?? new Error('Could not read the blob'));
        reader.readAsArrayBuffer(this);
      });
    },
  });
}
