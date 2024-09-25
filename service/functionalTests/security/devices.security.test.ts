import { expect } from 'chai'

describe('device management security', function() {

  describe('removing a device', function() {

    it('invalidates associated sessions', async function() {
      expect.fail('todo')
    })

    it('prevents the owning user from authenticating with the device', async function() {
      expect.fail('todo')
    })
  })

  /**
   * AKA, set `registered` to `false`.
   */
  describe('disabling a device', function() {

    it('invalidates associated sessions', async function() {
      expect.fail('todo')
    })

    it('prevents the owning user from authenticating with the device', async function() {
      expect.fail('todo')
    })
  })

  /**
   * AKA, approving; set `registered` to `true`.
   */
  describe('enabling', function() {

    it('allows the owning user to authenticate with the device', async function() {
      expect.fail('todo')
    })
  })
})