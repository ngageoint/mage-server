import { Migration } from '@ngageoint/mongodb-migrations'

/**
 * Invert the relationship between users and identity providers by migrating `users.authenticationId` to
 * `user_ingress_bindings.userId`.
 */
const migration: Migration = {

  id: 'user-idp-relationship',

  up: async function(done) {
    done(new Error('unimplemented'))
  },

  down: async function(done) {
    done(new Error('unimplemented'))
  }
}

export = migration