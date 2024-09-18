import crypto from 'crypto'
import { expect } from 'chai'
import * as PasswordHashing from '../lib/utilities/password-hashing'

describe('password hashing', function() {

  const hasher = PasswordHashing.defaultHashUtil

  it('should hash password', async function() {
    const hashed = await hasher.hashPassword('password')
    hashed.should.be.a('string')
    const items = hashed.split('::')
    items.should.have.length(4)
    items[2].should.equal('256')
    items[3].should.equal('12000')
  })

  it('should validate password', async function() {
    const hash = [
      crypto.randomBytes(128).toString('base64').slice(0, 128),
      crypto.randomBytes(256).toString('base64'),
      256,
      12000,
    ].join('::')
    const valid = await hasher.validPassword('password', hash)
    expect(valid).to.be.true
  })

  it('has meaningful tests', async function() {
    expect.fail('todo')
  })
})
