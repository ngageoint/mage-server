import { expect } from 'chai'

describe('ingress use cases', function() {

  describe('admitting users', function() {

    describe('without an existing account', function() {

      it('creates a new account bound to the admitting idp', async function() {
        expect.fail('todo')
      })

      it('applies enrollment policies to the new account', async function() {
        expect.fail('todo')
      })

      it('generates an admission token', async function() {
        expect.fail('todo')
      })

      it('fails if the enrollment policy requires account approval', async function() {
        expect.fail('todo')
      })

      it('fails if the idp is disabled', async function() {
        expect.fail('todo')
      })
    })

    describe('with an existing account', function() {

      it('generates an admission token', async function() {
        expect.fail('todo')
      })

      it('fails without a matching idp binding', async function() {
        expect.fail('todo')
      })

      it('fails if the idp is disabled', async function() {
        expect.fail('todo')
      })

      it('fails if the account is disabled', async function() {
        expect.fail('todo')
      })
    })
  })
})