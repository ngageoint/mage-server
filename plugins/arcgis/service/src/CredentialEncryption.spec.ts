import fs from 'fs';
import path from 'path';
import { ArcGISIdentityManager } from '@esri/arcgis-rest-request';
import { serializeAndEncrypt, decryptAndDeserialize, _resetKeyCacheForTests } from './CredentialEncryption';

/**
 * Test suite for the serialization and encryption of ArcGISIdentityManager instances.
 */

const silentConsole = { log: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Console;

const fakeIdentityManager = (username: string): ArcGISIdentityManager => ({
  username,
  serialize: () => JSON.stringify({ username })
} as unknown as ArcGISIdentityManager);

let tempSecurityDir: string;
const originalEnvKey = process.env.MAGE_ARCGIS_ENCRYPTION_KEY;
const originalSecurityDir = process.env.MAGE_SECURITY_DIR;

beforeEach(() => {
  tempSecurityDir = fs.mkdtempSync('/tmp/arcgisCredentialEncryptionTest');
  process.env.MAGE_SECURITY_DIR = tempSecurityDir;
  delete process.env.MAGE_ARCGIS_ENCRYPTION_KEY;
  _resetKeyCacheForTests();
});

afterEach(() => {
  fs.rmSync(tempSecurityDir, { recursive: true });
  process.env.MAGE_ARCGIS_ENCRYPTION_KEY = originalEnvKey;
  process.env.MAGE_SECURITY_DIR = originalSecurityDir;
  _resetKeyCacheForTests();
});

describe('serializeAndEncrypt / decryptAndDeserialize', () => {
  it('round-trips an identity manager, auto-generating a key file under MAGE_SECURITY_DIR', () => {
    const encrypted = serializeAndEncrypt(fakeIdentityManager('jdoe'), silentConsole);

    expect(encrypted).not.toContain('jdoe');
    expect(encrypted.startsWith('v1:')).toBe(true);

    const keyFile = path.join(tempSecurityDir, 'arcgis', 'credential-key');
    expect(fs.existsSync(keyFile)).toBe(true);

    const decrypted = decryptAndDeserialize(encrypted, silentConsole);
    expect(decrypted.username).toEqual('jdoe');
  });

  it('reuses an already-persisted key file rather than generating a new one', () => {
    const encrypted = serializeAndEncrypt(fakeIdentityManager('jdoe'), silentConsole);
    const keyFile = path.join(tempSecurityDir, 'arcgis', 'credential-key');
    const keyBytesAfterFirstUse = fs.readFileSync(keyFile);

    // simulate a fresh process picking the key back up from disk
    _resetKeyCacheForTests();

    const decrypted = decryptAndDeserialize(encrypted, silentConsole);
    expect(decrypted.username).toEqual('jdoe');
    expect(fs.readFileSync(keyFile)).toEqual(keyBytesAfterFirstUse);
  });

  it('prefers MAGE_ARCGIS_ENCRYPTION_KEY over the key file when set', () => {
    process.env.MAGE_ARCGIS_ENCRYPTION_KEY = 'admin passphrase';
    const encrypted = serializeAndEncrypt(fakeIdentityManager('jdoe'), silentConsole);

    // no key file should have been created since the env var took priority
    const keyFile = path.join(tempSecurityDir, 'arcgis', 'credential-key');
    expect(fs.existsSync(keyFile)).toBe(false);

    // a fresh cache with the same env var can still decrypt it
    _resetKeyCacheForTests();
    const decrypted = decryptAndDeserialize(encrypted, silentConsole);
    expect(decrypted.username).toEqual('jdoe');
  });

  it('still deserializes a legacy plaintext value persisted before encryption was added', () => {
    const legacyPlaintext = JSON.stringify({ username: 'legacy-user' });
    const decrypted = decryptAndDeserialize(legacyPlaintext, silentConsole);

    expect(decrypted.username).toEqual('legacy-user');
  });

  it('throws a clear error for an unrecognized stored format', () => {
    expect(() => decryptAndDeserialize('not-json-and-not-our-format', silentConsole))
      .toThrow('Unrecognized stored ArcGIS credential format');
  });
});
