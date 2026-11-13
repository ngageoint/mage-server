import { expect } from 'chai'
import crypto from 'crypto'
import {
  defaultHashUtil,
  defaultPasswordHashSpec,
  parseHashedPassword,
  PasswordHash,
  PasswordHashUtil,
  serializeHashedPassword,
} from '../../lib/local-idp/password-hashing'

describe('password hashing', function () {

  describe('serialization', function () {

    it('serializes a hash with all fields delimited by double colons', function () {
      const hash: PasswordHash = { salt: 'salty', derivedKey: 'keyish', derivedKeyLength: 32, iterations: 1000 }
      expect(serializeHashedPassword(hash)).to.equal('salty::keyish::32::1000')
    })

    it('parses a serialized hash', function () {
      expect(parseHashedPassword('salty::keyish::32::1000')).to.deep.equal({
        salt: 'salty', derivedKey: 'keyish', derivedKeyLength: 32, iterations: 1000
      })
    })

    it('round trips base64 values containing non-alphanumeric characters', function () {
      const hash: PasswordHash = { salt: 'a+b/c==', derivedKey: 'd/e+f=', derivedKeyLength: 64, iterations: 12000 }
      expect(parseHashedPassword(serializeHashedPassword(hash))).to.deep.equal(hash)
    })

    it('parses missing fields as undefined and NaN', function () {
      const parsed = parseHashedPassword('salty')
      expect(parsed.salt).to.equal('salty')
      expect(parsed.derivedKey).to.be.undefined
      expect(parsed.derivedKeyLength).to.be.NaN
      expect(parsed.iterations).to.be.NaN
    })
  })

  describe('default spec', function () {

    it('has the expected values', function () {
      expect(defaultPasswordHashSpec).to.deep.equal({ iterations: 12000, saltLength: 128, derivedKeyLength: 256 })
    })

    it('is frozen', function () {
      expect(Object.isFrozen(defaultPasswordHashSpec)).to.be.true
    })
  })

  describe('PasswordHashUtil', function () {

    const fastSpec = { iterations: 10, saltLength: 16, derivedKeyLength: 32 }

    describe('hashPassword', function () {

      it('uses the default spec when constructed without arguments', async function () {
        const hash = await new PasswordHashUtil().hashPassword('test password')
        expect(hash.iterations).to.equal(defaultPasswordHashSpec.iterations)
        expect(hash.derivedKeyLength).to.equal(defaultPasswordHashSpec.derivedKeyLength)
        expect(Buffer.from(hash.salt, 'base64')).to.have.length(defaultPasswordHashSpec.saltLength)
        expect(Buffer.from(hash.derivedKey, 'base64')).to.have.length(defaultPasswordHashSpec.derivedKeyLength)
      })

      it('uses the default spec for the default util instance', async function () {
        const hash = await defaultHashUtil.hashPassword('test password')
        expect(hash.iterations).to.equal(defaultPasswordHashSpec.iterations)
        expect(hash.derivedKeyLength).to.equal(defaultPasswordHashSpec.derivedKeyLength)
        expect(Buffer.from(hash.salt, 'base64')).to.have.length(defaultPasswordHashSpec.saltLength)
      })

      it('uses the given spec', async function () {
        const hash = await new PasswordHashUtil(fastSpec).hashPassword('test password')
        expect(hash.iterations).to.equal(fastSpec.iterations)
        expect(hash.derivedKeyLength).to.equal(fastSpec.derivedKeyLength)
        expect(Buffer.from(hash.salt, 'base64')).to.have.length(fastSpec.saltLength)
        expect(Buffer.from(hash.derivedKey, 'base64')).to.have.length(fastSpec.derivedKeyLength)
      })

      it('uses defaults for spec values that are absent from a partial spec', async function () {
        const hash = await new PasswordHashUtil({ iterations: 10 }).hashPassword('test password')
        expect(hash.iterations).to.equal(10)
        expect(hash.derivedKeyLength).to.equal(defaultPasswordHashSpec.derivedKeyLength)
        expect(Buffer.from(hash.salt, 'base64')).to.have.length(defaultPasswordHashSpec.saltLength)
      })

      it('uses defaults for zero spec values', async function () {
        const hash = await new PasswordHashUtil({ iterations: 0, saltLength: 0, derivedKeyLength: 0 }).hashPassword('test password')
        expect(hash.iterations).to.equal(defaultPasswordHashSpec.iterations)
        expect(hash.derivedKeyLength).to.equal(defaultPasswordHashSpec.derivedKeyLength)
        expect(Buffer.from(hash.salt, 'base64')).to.have.length(defaultPasswordHashSpec.saltLength)
      })

      it('generates a unique salt and derived key for each hash of the same password', async function () {
        const util = new PasswordHashUtil(fastSpec)
        const hash1 = await util.hashPassword('test password')
        const hash2 = await util.hashPassword('test password')
        expect(hash1.salt).to.not.equal(hash2.salt)
        expect(hash1.derivedKey).to.not.equal(hash2.derivedKey)
      })

      it('derives the key with pbkdf2 sha512 using the base64 salt string', async function () {
        const hash = await new PasswordHashUtil(fastSpec).hashPassword('test password')
        const expected = crypto.pbkdf2Sync('test password', hash.salt, hash.iterations, hash.derivedKeyLength, 'sha512')
        expect(hash.derivedKey).to.equal(expected.toString('base64'))
      })
    })

    describe('validPassword', function () {

      const util = new PasswordHashUtil(fastSpec)

      it('returns true for the password that produced the hash', async function () {
        const hash = serializeHashedPassword(await util.hashPassword('correct horse battery staple'))
        expect(await util.validPassword('correct horse battery staple', hash)).to.be.true
      })

      it('returns false for a different password', async function () {
        const hash = serializeHashedPassword(await util.hashPassword('correct horse battery staple'))
        expect(await util.validPassword('correct horse battery stable', hash)).to.be.false
        expect(await util.validPassword('', hash)).to.be.false
      })

      it('is case sensitive', async function () {
        const hash = serializeHashedPassword(await util.hashPassword('Password'))
        expect(await util.validPassword('password', hash)).to.be.false
      })

      it('validates using the iterations and key length stored in the hash rather than the util spec', async function () {
        const otherUtil = new PasswordHashUtil({ iterations: 17, saltLength: 8, derivedKeyLength: 48 })
        const hash = serializeHashedPassword(await otherUtil.hashPassword('test password'))
        expect(await util.validPassword('test password', hash)).to.be.true
        expect(await defaultHashUtil.validPassword('test password', hash)).to.be.true
      })

      it('validates a hash computed independently with the same parameters', async function () {
        const salt = crypto.randomBytes(16).toString('base64')
        const derivedKey = crypto.pbkdf2Sync('test password', salt, 5, 20, 'sha512').toString('base64')
        const hash = serializeHashedPassword({ salt, derivedKey, iterations: 5, derivedKeyLength: 20 })
        expect(await util.validPassword('test password', hash)).to.be.true
      })

      it('returns false when the stored derived key has been altered', async function () {
        const hash = await util.hashPassword('test password')
        const keyBytes = Buffer.from(hash.derivedKey, 'base64')
        keyBytes[0] = keyBytes[0] ^ 0xff
        const tampered = serializeHashedPassword({ ...hash, derivedKey: keyBytes.toString('base64') })
        expect(await util.validPassword('test password', tampered)).to.be.false
      })

      it('returns false when the stored iterations have been altered', async function () {
        const hash = await util.hashPassword('test password')
        const tampered = serializeHashedPassword({ ...hash, iterations: hash.iterations + 1 })
        expect(await util.validPassword('test password', tampered)).to.be.false
      })

      it('returns false for an empty hash', async function () {
        expect(await util.validPassword('test password', '')).to.be.false
      })

      it('returns false for a null or undefined hash', async function () {
        expect(await util.validPassword('test password', null as any)).to.be.false
        expect(await util.validPassword('test password', undefined as any)).to.be.false
      })

      const invalidHashes: [string, string][] = [
        [ 'no delimiters', 'garbage' ],
        [ 'missing salt', '::key::32::10' ],
        [ 'missing derived key', 'salt::::32::10' ],
        [ 'missing derived key length', 'salt::key::::10' ],
        [ 'missing iterations', 'salt::key::32' ],
        [ 'non-numeric derived key length', 'salt::key::abc::10' ],
        [ 'non-numeric iterations', 'salt::key::32::abc' ],
        [ 'zero derived key length', 'salt::key::0::10' ],
        [ 'zero iterations', 'salt::key::32::0' ],
      ]
      for (const [ desc, invalidHash ] of invalidHashes) {
        it(`rejects an invalid hash with ${desc}`, async function () {
          await expect(util.validPassword('test password', invalidHash)).to.be.rejectedWith('invalid password hash')
        })
      }
    })
  })
})
