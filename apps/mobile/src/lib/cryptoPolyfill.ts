import * as ExpoCrypto from 'expo-crypto';

const subtle = {
  async digest(algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer> {
    const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
    if (name !== 'SHA-256') {
      throw new Error(`Unsupported digest algorithm: ${name}`);
    }
    return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
  },
};

const current = globalThis.crypto;

if (!current) {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      getRandomValues: ExpoCrypto.getRandomValues,
      randomUUID: ExpoCrypto.randomUUID,
      subtle,
    },
  });
} else if (!current.subtle) {
  Object.defineProperty(current, 'subtle', {
    configurable: true,
    value: subtle,
  });
}
