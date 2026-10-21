import { SubstituteOf } from '@fluffy-spoon/substitute'
import { expect } from 'chai'
import { createEnrollLocalUserByProxyOperation } from '../../../src/app.impl/users/app.impl.users'
import { UserRepository } from '../../../src/entities/users/entities.users'

describe('user account administration', function() {

  describe('creating a local user account manually', function() {

    let userRepo: SubstituteOf<UserRepository>

    it('requires CREATE_USER permission', async function() {
      createEnrollLocalUserByProxyOperation(userRepo, permissions)
    })

    it('fails if the user name already exists', async function() {
      expect.fail('todo')
    })
  })

  describe('updating a user account', function() {

  })

  describe('disabling a user account', function() {

  })
})
