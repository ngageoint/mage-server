import { expect } from 'chai'
import { UserAccountSeed, UserAccountSeedSpec } from '../../../lib/entities/users/entities.users'
import { UserIconType } from '../../../lib/entities/users/entities.users'

describe('user entities', function() {

  describe('creating user accounts', function() {

    describe('preparing a user seed', function() {

      it('omits extra entries', function() {

        const spec: UserAccountSeedSpec & Record<string, any> = {
          id: 'omit-me',
          username: 'loki',
          displayName: 'Mr. Mischief',
          email: 'loki@asgard.net',
          phones: [],
          active: true,
          enabled: true,
          icon: { type: UserIconType.None },
          avatar: { size: 1000, contentType: 'image/png', relativePath: 'third cousin' },
          roleId: 'deity',
          authenticationId: '1234',
          junk: new Date(),
        }
        const seed = UserAccountSeed.prepare(spec)

        expect(seed.toJSON()).to.deep.equal({
          username: 'loki',
          displayName: 'Mr. Mischief',
          email: 'loki@asgard.net',
          phones: [],
          active: true,
          enabled: true,
          icon: { type: UserIconType.None },
          avatar: { size: 1000, contentType: 'image/png', relativePath: 'third cousin' },
          roleId: 'deity',
          authenticationId: '1234',
        })
      })
    })
  })
})
