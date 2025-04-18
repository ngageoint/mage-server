export const eKey: Promise<CryptoKey> = window.crypto.subtle.generateKey(
  {
      name: "AES-GCM",
      length: 256, //can be  128, 192, or 256
  },
  true, //whether the key is extractable (i.e. can be used in exportKey)
  ["encrypt", "decrypt"] //can "encrypt", "decrypt", "wrapKey", or "unwrapKey"
)

export function arrayBufferToString(buffer: ArrayBuffer, encoding = 'utf-8'): string {
  const decoder = new TextDecoder(encoding);
  const view = new Uint8Array(buffer);
  return decoder.decode(view);
}

export function stringToArrayBuffer(str: string): ArrayBuffer {
  let enc = new TextEncoder();
  var encoded = enc.encode(str);
  return encoded;
}
